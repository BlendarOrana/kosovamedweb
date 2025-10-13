import { useEffect, useState, useMemo } from 'react';
import { useVacationStore } from '../stores/useVacationStore';
import { FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiUser, FiUsers } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const ManagerVacationManagement = () => {
  const { 
    vacations, 
    loading, 
    fetchManagerVacations,
    managerRespondToVacation 
  } = useVacationStore();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchManagerVacations();
  }, [fetchManagerVacations]);

  // Filter vacations for manager view
  const filteredVacations = useMemo(() => {
    switch(activeTab) {
      case 'pending':
        return vacations.filter(v => v.status === 'pending_manager_approval');
      case 'approved':
        return vacations.filter(v => v.status === 'pending_admin_approval' || v.status === 'approved');
      case 'rejected':
        return vacations.filter(v => v.status === 'rejected' && v.manager_approver_id);
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
    
    // Validation for rejection
    if (action === false && rejectionReason.trim() === '') {
      toast.error('Ju lutem jepni një arsye për refuzimin.');
      return;
    }

    const approve = action === true;
    const success = await managerRespondToVacation(
      id, 
      approve, 
      action === false ? rejectionReason : null
    );

    if (success) {
      closeModal();
    }
  };

  const StatusBadge = ({ status }) => {
    const statusMap = {
      pending_manager_approval: { 
        text: 'Në Pritje', 
        color: 'bg-yellow-500/20 text-yellow-400', 
        Icon: FiClock 
      },
      pending_admin_approval: { 
        text: 'Ne pritje te aprovimit nga Hr', 
        color: 'bg-blue-500/20 text-blue-400', 
        Icon: FiAlertCircle 
      },
      approved: { 
        text: 'Aprovuar (Finalizuar)', 
        color: 'bg-green-500/20 text-green-400', 
        Icon: FiCheckCircle 
      },
      rejected: { 
        text: 'Refuzuar', 
        color: 'bg-red-500/20 text-red-400', 
        Icon: FiXCircle 
      },
    };
    
    const currentStatus = statusMap[status] || statusMap.pending_manager_approval;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${currentStatus.color}`}>
        <currentStatus.Icon size={14} />
        {currentStatus.text}
      </span>
    );
  };

  const ReplacementBadge = ({ status }) => {
    const statusMap = {
      pending: { 
        text: 'Në Pritje', 
        color: 'bg-orange-500/20 text-orange-400', 
        Icon: FiClock 
      },
      accepted: { 
        text: 'Pranuar', 
        color: 'bg-emerald-500/20 text-emerald-400', 
        Icon: FiCheckCircle 
      },
      rejected: { 
        text: 'Refuzuar', 
        color: 'bg-red-500/20 text-red-400', 
        Icon: FiXCircle 
      },
    };
    
    const currentStatus = statusMap[status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${currentStatus.color}`}>
        <currentStatus.Icon size={12} />
        {currentStatus.text}
      </span>
    );
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-cyan-500/30">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Menaxhimi i Kërkesave për Pushime</h1>
        <p className="text-sm text-gray-400 mt-1">Si menaxher, ju miratoni ose refuzoni kërkesat e punonjësve</p>
      </div>
      
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
            Të Aproruara
          </button>
          <button 
            onClick={() => setActiveTab('rejected')} 
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'rejected' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            Të Refuzuara
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <p className="text-gray-400 mt-3">Duke ngarkuar kërkesat...</p>
        </div>
      ) : filteredVacations.length === 0 ? (
        <div className="text-center py-12">
          <FiAlertCircle className="mx-auto h-12 w-12 text-gray-500" />
          <p className="text-gray-400 mt-3">Nuk ka kërkesa në këtë kategori.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Punonjësi
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Zëvendësues
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Datat
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ditë
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
                const days = Math.ceil((new Date(req.end_date) - new Date(req.start_date)) / (1000 * 60 * 60 * 24)) + 1;
                return (
                  <tr key={req.id} className="hover:bg-gray-700/40 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 h-8 w-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
                          <FiUser className="text-cyan-400" size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{req.employee_name}</div>
                          {req.employee_title && (
                            <div className="text-xs text-gray-400">{req.employee_title}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {req.replacement_name ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <FiUsers className="text-purple-400" size={16} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{req.replacement_name}</div>
                            {req.replacement_title && (
                              <div className="text-xs text-gray-400">{req.replacement_title}</div>
                            )}
                            <div className="mt-1">
                              <ReplacementBadge status={req.replacement_status} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 italic">Pa zëvendësues</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex flex-col">
                        <span className="font-medium">{new Date(req.start_date).toLocaleDateString('sq-AL', { day: '2-digit', month: 'short' })}</span>
                        <span className="text-gray-500 text-xs">deri</span>
                        <span className="font-medium">{new Date(req.end_date).toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                        {days} {days === 1 ? 'ditë' : 'ditë'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          onClick={() => openModal(req, true)} 
                          className="inline-flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md font-semibold text-xs transition-all duration-200 hover:scale-105"
                        >
                          <FiCheckCircle size={14} />
                          Aprovo
                        </button>
                        <button 
                          onClick={() => openModal(req, false)} 
                          className="inline-flex items-center gap-1.5 text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md font-semibold text-xs transition-all duration-200 hover:scale-105"
                        >
                          <FiXCircle size={14} />
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
              <h2 className="text-lg font-bold text-white mb-4">
                {selectedRequest.action ? 'Konfirmo Aprovimin' : 'Konfirmo Refuzimin'}
              </h2>
              
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FiUser className="text-cyan-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Punonjësi</p>
                    <p className="text-sm font-medium text-white">{selectedRequest.employee_name}</p>
                    {selectedRequest.employee_title && (
                      <p className="text-xs text-gray-500">{selectedRequest.employee_title}</p>
                    )}
                  </div>
                </div>
                
                {selectedRequest.replacement_name && (
                  <div className="flex items-start gap-3 pt-3 border-t border-gray-700">
                    <FiUsers className="text-purple-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-gray-400">Zëvendësues</p>
                      <p className="text-sm font-medium text-white">{selectedRequest.replacement_name}</p>
                      {selectedRequest.replacement_title && (
                        <p className="text-xs text-gray-500">{selectedRequest.replacement_title}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-300 mb-2">
                Jeni i sigurt që doni të {selectedRequest.action ? 'aprovoni' : 'refuzoni'} këtë kërkesë pushimi?
              </p>
              
              {selectedRequest.action && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-400 flex items-start gap-2">
                    <FiAlertCircle className="flex-shrink-0 mt-0.5" size={14} />
                    <span>Pas aprovimit, kërkesa do të dërgohet te administratori për miratim final.</span>
                  </p>
                </div>
              )}
              
              {!selectedRequest.action && (
                <div className='mt-4'>
                  <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-300 mb-2">
                    Arsyeja e refuzimit <span className="text-red-400">*</span>
                  </label>
                  <textarea 
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className='w-full bg-gray-700 text-white border border-gray-600 rounded-md shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm placeholder-gray-400 p-2'
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
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 inline-flex items-center gap-2 ${
                    selectedRequest.action 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } hover:scale-105`}
                >
                  {selectedRequest.action ? <FiCheckCircle size={16} /> : <FiXCircle size={16} />}
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

export default ManagerVacationManagement;