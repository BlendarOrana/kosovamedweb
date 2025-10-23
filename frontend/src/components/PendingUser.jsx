import { useEffect, useState } from "react";
import { useAdminStore } from "../stores/useAdminStore";
import { FiUser, FiMail, FiPhone, FiMapPin, FiCheck, FiX, FiRefreshCw, FiClock, FiUsers } from "react-icons/fi";
import clsx from "clsx";
import toast from "react-hot-toast";

const PendingUsers = () => {
  const { 
    pendingUsers, 
    shiftRequests,
    loading, 
    getPendingUsers, 
    getAllShiftRequests,
    acceptUser, 
    updateShiftRequestStatus,
    refreshPendingUsers 
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState('pending-users');
  const [shiftTab, setShiftTab] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [selectedRegions, setSelectedRegions] = useState({});
  const [selectedShifts, setSelectedShifts] = useState({});
  const [contractDates, setContractDates] = useState({});

  const regions = [
    "Istog",
    "Gjilan",
    "Malishevë",
    "Skenderaj",
    "Viti",
    "Klinë",
    "Ferizaj",
    "Fushë Kosovë",
    "Mitrovicë",
    "Prizren"
  ];

  const shifts = [
    { value: 1, label: "Paradite (Mëngjes)" },
    { value: 2, label: "Pasdite" }
  ];

  useEffect(() => {
    getPendingUsers();
    getAllShiftRequests();
  }, []);

  useEffect(() => {
    const initialRegions = {};
    const initialShifts = {};
    const initialDates = {};
    pendingUsers.forEach(user => {
      initialRegions[user.id] = user.region || "";
      initialShifts[user.id] = "";
      initialDates[user.id] = {
        startDate: ""
      };
    });
    setSelectedRegions(initialRegions);
    setSelectedShifts(initialShifts);
    setContractDates(initialDates);
  }, [pendingUsers]);

  const handleRegionChange = (userId, region) => {
    setSelectedRegions(prev => ({
      ...prev,
      [userId]: region
    }));
  };

  const handleShiftChange = (userId, shift) => {
    setSelectedShifts(prev => ({
      ...prev,
      [userId]: shift
    }));
  };

  const handleDateChange = (userId, field, value) => {
    setContractDates(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const handleAcceptUser = async (userId) => {
    const region = selectedRegions[userId];
    const shift = selectedShifts[userId];
    const dates = contractDates[userId];
    
    if (!region) {
      toast.error("Ju lutem zgjidhni një rajon");
      return;
    }

    if (!shift) {
      toast.error("Ju lutem zgjidhni një turn");
      return;
    }

    if (!dates?.startDate) {
      toast.error("Ju lutem plotësoni datat e Punes");
      return;
    }

    setProcessingId(userId);
    const success = await acceptUser(userId, region, shift, dates.startDate);
    setProcessingId(null);
    
    if (success && pendingUsers.length === 1) {
      await refreshPendingUsers();
    }
  };

  const handleApproveShift = async (requestId) => {
    setProcessingId(requestId);
    const success = await updateShiftRequestStatus(requestId, 'approved');
    setProcessingId(null);
    
    if (success) {
      toast.success("Kërkesa u pranua me sukses");
    }
  };

  const handleRejectShift = async (requestId) => {
    setProcessingId(requestId);
    const success = await updateShiftRequestStatus(requestId, 'rejected');
    setProcessingId(null);
    
    if (success) {
      toast.success("Kërkesa u refuzua");
    }
  };

  const handleRefresh = async () => {
    if (activeTab === 'pending-users') {
      await refreshPendingUsers();
    } else {
      await getAllShiftRequests();
    }
    toast.success("Lista u rifreskua");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sq-AL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getShiftLabel = (shift) => {
    return shift === 1 ? 'Turni 1 (Mëngjes)' : 'Turni 2 (Pasdite)';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      pending: 'Në pritje',
      approved: 'Pranuar',
      rejected: 'Refuzuar'
    };

    return (
      <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', badges[status])}>
        {labels[status]}
      </span>
    );
  };

  const currentShiftRequests = shiftRequests?.[shiftTab] || [];

  if (loading && !pendingUsers.length && !shiftRequests) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Duke ngarkuar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Menaxhimi i Kërkesave</h2>
          <p className="text-gray-600 mt-1">
            {activeTab === 'pending-users' 
              ? 'Aprovo përdorues të rinj' 
              : 'Menaxho kërkesat për ndryshim turni'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          <span>Rifresko</span>
        </button>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('pending-users')}
          className={clsx(
            "flex-1 px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
            activeTab === 'pending-users'
              ? "bg-cyan-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <FiUsers className="w-5 h-5" />
          <span>Përdorues në Pritje ({pendingUsers?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('shift-requests')}
          className={clsx(
            "flex-1 px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
            activeTab === 'shift-requests'
              ? "bg-cyan-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <FiClock className="w-5 h-5" />
          <span>Kërkesa për Turne ({shiftRequests?.pending?.length || 0})</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'pending-users' ? (
        // PENDING USERS SECTION
        <div>
          {pendingUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Asnjë kërkesë në pritje
                </h3>
                <p className="text-gray-600">
                  Nuk ka përdorues të rinj që presin miratim në këtë moment.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
                >
                  {/* User Avatar */}
                  <div className="flex items-center gap-4 mb-4">
                    {user.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt={user.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiMail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiPhone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{user.number}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{user.region || "Nuk është specifikuar"}</span>
                    </div>
                  </div>

                  {/* Region Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rajoni <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedRegions[user.id] || ""}
                      onChange={(e) => handleRegionChange(user.id, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Zgjedh Rajonin</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Shift Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turni <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedShifts[user.id] || ""}
                      onChange={(e) => handleShiftChange(user.id, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Zgjedh Turnin</option>
                      {shifts.map((shift) => (
                        <option key={shift.value} value={shift.value}>
                          {shift.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contract Date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data e Fillimit të Punes <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractDates[user.id]?.startDate || ""}
                      onChange={(e) => handleDateChange(user.id, "startDate", e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleAcceptUser(user.id)}
                    disabled={
                      processingId === user.id || 
                      !selectedRegions[user.id] ||
                      !selectedShifts[user.id] ||
                      !contractDates[user.id]?.startDate
                    }
                    className={clsx(
                      "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                      processingId === user.id || 
                      !selectedRegions[user.id] ||
                      !selectedShifts[user.id] ||
                      !contractDates[user.id]?.startDate 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600 hover:shadow-md"
                    )}
                  >
                    {processingId === user.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                        <span>Duke procesuar...</span>
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-4 h-4" />
                        <span>Prano Përdoruesin</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // SHIFT REQUESTS SECTION
        <div className="space-y-4">
          {/* Shift Request Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-1 flex gap-1">
            <button
              onClick={() => setShiftTab('pending')}
              className={clsx(
                "flex-1 px-4 py-2.5 rounded-md font-medium transition-colors",
                shiftTab === 'pending'
                  ? "bg-cyan-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Në pritje ({shiftRequests?.pending?.length || 0})
            </button>
            <button
              onClick={() => setShiftTab('approved')}
              className={clsx(
                "flex-1 px-4 py-2.5 rounded-md font-medium transition-colors",
                shiftTab === 'approved'
                  ? "bg-green-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Pranuar ({shiftRequests?.approved?.length || 0})
            </button>
            <button
              onClick={() => setShiftTab('rejected')}
              className={clsx(
                "flex-1 px-4 py-2.5 rounded-md font-medium transition-colors",
                shiftTab === 'rejected'
                  ? "bg-red-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Refuzuar ({shiftRequests?.rejected?.length || 0})
            </button>
          </div>

          {/* Shift Requests List */}
          {currentShiftRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiClock className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Asnjë kërkesë {shiftTab === 'pending' ? 'në pritje' : shiftTab === 'approved' ? 'e pranuar' : 'e refuzuar'}
                </h3>
                <p className="text-gray-600">
                  Nuk ka kërkesa për ndryshim turni në këtë kategori.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentShiftRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
                >
                  {/* User Avatar */}
                  <div className="flex items-center gap-4 mb-4">
                    {request.profile_image_url ? (
                      <img
                        src={request.profile_image_url}
                        alt={request.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                        {request.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {request.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiMail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{request.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{request.region || "Nuk është specifikuar"}</span>
                    </div>
                  </div>

                  {/* Requested Shift */}
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-600 mb-1">Turni i kërkuar:</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {getShiftLabel(request.requested_shift)}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Action Buttons (Only for pending requests) */}
                  {shiftTab === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveShift(request.id)}
                        disabled={processingId === request.id}
                        className={clsx(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                          processingId === request.id
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600 hover:shadow-md"
                        )}
                      >
                        {processingId === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                        ) : (
                          <>
                            <FiCheck className="w-4 h-4" />
                            <span>Prano</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleRejectShift(request.id)}
                        disabled={processingId === request.id}
                        className={clsx(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                          processingId === request.id
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600 hover:shadow-md"
                        )}
                      >
                        {processingId === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                        ) : (
                          <>
                            <FiX className="w-4 h-4" />
                            <span>Refuzo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingUsers;