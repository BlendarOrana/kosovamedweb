import { useEffect, useState } from "react";
import { useAdminStore } from "../stores/useAdminStore";
import { FiUser, FiMail, FiPhone, FiMapPin, FiCheck, FiRefreshCw, FiClock } from "react-icons/fi";
import clsx from "clsx";

const PendingUsers = () => {
  const { pendingUsers, loading, getPendingUsers, acceptUser, refreshPendingUsers } = useAdminStore();
  const [processingId, setProcessingId] = useState(null);
  const [selectedRegions, setSelectedRegions] = useState({});

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

  useEffect(() => {
    getPendingUsers();
  }, []);

  useEffect(() => {
    // Initialize selected regions with user's existing region
    const initialRegions = {};
    pendingUsers.forEach(user => {
      initialRegions[user.id] = user.region || "";
    });
    setSelectedRegions(initialRegions);
  }, [pendingUsers]);

  const handleRegionChange = (userId, region) => {
    setSelectedRegions(prev => ({
      ...prev,
      [userId]: region
    }));
  };

  const handleAccept = async (userId) => {
    const region = selectedRegions[userId];
    
    if (!region) {
      toast.error("Ju lutem zgjidhni një rajon");
      return;
    }

    setProcessingId(userId);
    const success = await acceptUser(userId, region);
    setProcessingId(null);
    
    if (success && pendingUsers.length === 1) {
      await refreshPendingUsers();
    }
  };

  const handleRefresh = async () => {
    await refreshPendingUsers();
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

  if (loading && !pendingUsers.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Duke ngarkuar përdoruesit në pritje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Përdoruesit në Pritje</h1>
          <p className="text-gray-600 mt-1">
            Shqyrto dhe prano kërkesa të reja për regjistrim
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          <FiRefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          <span>Rifresko</span>
        </button>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-lg">
            <FiClock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm opacity-90">Total në pritje</p>
            <p className="text-3xl font-bold">{pendingUsers.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Users List */}
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
                  Ndrysho Rajonin
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

              {/* Action Button */}
              <button
                onClick={() => handleAccept(user.id)}
                disabled={processingId === user.id || !selectedRegions[user.id]}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                  processingId === user.id || !selectedRegions[user.id]
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
  );
};

export default PendingUsers;