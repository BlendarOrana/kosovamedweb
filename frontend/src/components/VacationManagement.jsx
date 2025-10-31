import { useEffect, useState, useMemo } from 'react';
import { useVacationStore } from '../stores/useVacationStore';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiUser } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Official holidays in Kosovo for 2025
const KOSOVO_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-02', // New Year's Holiday (Second Day)
  '2025-01-07', // Orthodox Christmas
  '2025-02-17', // Independence Day of Kosovo
  '2025-04-09', // Constitution Day of Kosovo
  '2025-04-21', // Orthodox Easter (observed) & Catholic Easter (observed)
  '2025-05-01', // International Workers' Day
  '2025-05-09', // Europe Day
  '2025-03-31', // Eid al-Fitr (observed)
  '2025-06-06', // Eid al-Adha
  '2025-12-25', // Catholic Christmas
];

// Helper function to check if a date is a weekend
const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

// Helper function to check if a date is a holiday
const isHoliday = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return KOSOVO_HOLIDAYS_2025.includes(dateStr);
};

// Calculate working days between two dates (excluding weekends and holidays)
const calculateWorkingDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  // Parse UTC dates and convert to local date (ignoring time)
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check for invalid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Use UTC methods to avoid timezone issues
  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  
  if (startDay > endDay) return 0;
  
  let workingDays = 0;
  const currentDate = new Date(startDay);
  
  while (currentDate <= endDay) {
    if (!isWeekend(currentDate) && !isHoliday(currentDate)) {
      workingDays++;
    }
    // Move to next day using UTC
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  return workingDays;
};

const VacationManagement = () => {
  const { 
    vacations, 
    loading, 
    fetchAllVacations,
    respondToVacation 
  } = useVacationStore();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchAllVacations();
  }, [fetchAllVacations]);

  // Filter vacations for admin view only
  const filteredVacations = useMemo(() => {
    switch(activeTab) {
      case 'pending':
        return vacations.filter(v => v.status === 'pending_admin_approval');
      case 'approved':
        return vacations.filter(v => v.status === 'approved');
      case 'rejected':
        return vacations.filter(v => v.status === 'rejected');
      default:
        return [];
    }
  }, [vacations, activeTab]);

  const openModal = (request, action) => {
    setSelectedRequest({ ...request, action });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest) return;

    const { id, action } = selectedRequest;
    
    if (action === 'rejected' && rejectionReason.trim() === '') {
      toast.error('Ju lutem jepni një arsye për refuzimin.');
      return;
    }

    const success = await respondToVacation(
      id, 
      action, 
      action === 'rejected' ? rejectionReason : null
    );

    if (success) {
      closeModal();
    }
  };

  const StatusBadge = ({ status }) => {
    const statusMap = {
      pending_admin_approval: { 
        text: 'Në Pritje', 
        color: 'bg-yellow-500/20 text-yellow-400', 
        Icon: FiAlertCircle 
      },
      approved: { 
        text: 'Aprovuar', 
        color: 'bg-green-500/20 text-green-400', 
        Icon: FiCheckCircle 
      },
      rejected: { 
        text: 'Refuzuar', 
        color: 'bg-red-500/20 text-red-400', 
        Icon: FiXCircle 
      },
    };
    
    const currentStatus = statusMap[status] || statusMap.pending_admin_approval;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${currentStatus.color}`}>
        <currentStatus.Icon size={14} />
        {currentStatus.text}
      </span>
    );
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-cyan-500/30">
      <h1 className="text-2xl font-bold text-white mb-6">Menaxhimi i Kërkesave për Pushime</h1>
      
      {/* Tabs */}
      <div className="border-b border-cyan-500/30 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button 
            onClick={() => setActiveTab('pending')} 
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'pending' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            Në Pritje
          </button>
          <button 
            onClick={() => setActiveTab('approved')} 
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'approved' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            Aprovuar
          </button>
          <button 
            onClick={() => setActiveTab('rejected')} 
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'rejected' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            Refuzuar
          </button>
        </nav>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Duke ngarkuar kërkesat...</p>
      ) : filteredVacations.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Nuk ka kërkesa në këtë kategori.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Punonjësi
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Datat
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ditë Pune
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Menaxheri
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Statusi
                </th>
                {activeTab === 'pending' && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Veprimet
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-gray-900/50 divide-y divide-gray-700">
              {filteredVacations.map((req) => {
                const workingDays = calculateWorkingDays(req.start_date, req.end_date);
                
                // Debug logging
                console.log('Request:', {
                  id: req.id,
                  employee: req.employee_name,
                  start: req.start_date,
                  end: req.end_date,
                  workingDays: workingDays
                });
                
                return (
                  <tr key={req.id} className="hover:bg-gray-700/40 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {req.employee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                      {workingDays} {workingDays === 1 ? 'ditë' : 'ditë'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <FiUser size={14} className="text-gray-500" />
                        {req.manager_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          onClick={() => openModal(req, 'approved')} 
                          className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200"
                        >
                          Aprovo
                        </button>
                        <button 
                          onClick={() => openModal(req, 'rejected')} 
                          className="text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200"
                        >
                          Refuzo
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isModalOpen && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-cyan-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white">
                {selectedRequest.action === 'approved' ? 'Konfirmo Aprovimin' : 'Konfirmo Refuzimin'}
              </h2>
              <p className="mt-2 text-sm text-gray-300">
                Jeni i sigurt që doni të {selectedRequest.action === 'approved' ? 'aprovoni' : 'refuzoni'} kërkesën e pushimit për <strong>{selectedRequest.employee_name}</strong>?
              </p>
              
              {selectedRequest.action === 'rejected' && (
                <div className='mt-4'>
                  <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-300 mb-1">
                    Arsyeja (e detyrueshme)
                  </label>
                  <textarea 
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className='w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm placeholder-gray-400'
                    placeholder='Shkruani arsyen e refuzimit...'
                  />
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors duration-200"
                >
                  Anulo
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 ${
                    selectedRequest.action === 'approved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Konfirmo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VacationManagement;