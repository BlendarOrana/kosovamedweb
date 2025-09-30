import { useState, useEffect } from "react";
import { useAdminStore } from "../stores/useAdminStore";
import { FiUser, FiEdit2, FiTrash2, FiKey, FiPlus, FiX, FiCheck, FiSearch } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner";

const UserManagement = () => {
  const { 
    users, 
    loading, 
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    changeUserPassword, 
    deleteUser, 
    clearCurrentUser 
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", password: "", confirmPassword: "", number: "", address: "", role: "user",
    active: true, driver_nr: "", shop_street: "", shop_address_number: "",
    shop_city: "", shop_postal_code: "", shop_siret: ""
  });
  const [newPassword, setNewPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "", password: "", confirmPassword: "", number: "", address: "", role: "user",
      active: true, driver_nr: "", shop_street: "", shop_address_number: "",
      shop_city: "", shop_postal_code: "", shop_siret: ""
    });
    setIsEditing(false);
    clearCurrentUser();
  };

  const handleAddUser = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEditUser = async (id) => {
    const userData = await getUserById(id);
    if (userData) {
      setFormData({
        name: userData.name || "", password: "", confirmPassword: "", number: userData.number || "",
        address: userData.address || "", role: userData.role || "user",
        active: userData.active !== undefined ? userData.active : true, driver_nr: userData.driver_nr || "",
        shop_street: userData.shop_street || "", shop_address_number: userData.shop_address_number || "",
        shop_city: userData.shop_city || "", shop_postal_code: userData.shop_postal_code || "",
        shop_siret: userData.shop_siret || ""
      });
      setSelectedUserId(id);
      setIsEditing(true);
      setModalOpen(true);
    }
  };

  const handlePasswordChange = (id) => {
    setSelectedUserId(id);
    setNewPassword("");
    setPasswordModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && formData.password !== formData.confirmPassword) {
      alert("Fjalëkalimet nuk përputhen");
      return;
    }
    try {
      if (isEditing) {
        const { password, confirmPassword, ...updateData } = formData;
        await updateUser(selectedUserId, updateData);
      } else {
        await createUser(formData);
      }
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Gabim gjatë dorëzimit të formularit:", err);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("Fjalëkalimi duhet të ketë të paktën 6 karaktere");
      return;
    }
    try {
      await changeUserPassword(selectedUserId, newPassword);
      setPasswordModalOpen(false);
      setNewPassword("");
    } catch (err) {
      console.error("Gabim gjatë ndryshimit të fjalëkalimit:", err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Jeni i sigurt që dëshironi të fshini këtë përdorues?")) {
      await deleteUser(id);
    }
  };

  const getRoleDisplayName = (role) => (role === 'admin' ? 'Admin' : role);

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-cyan-500/30">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Menaxhimi i Përdoruesve</h2>
        <p className="text-gray-300">Menaxhoni llogaritë dhe lejet e përdoruesve</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Kërko përdorues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-400"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-4 py-2 rounded-lg transition duration-300 shadow-lg "
        >
          <FiPlus /> Shto Përdorues
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-3 px-4 text-left text-gray-400 uppercase text-xs tracking-wider">Emri</th>
              <th className="py-3 px-4 text-left text-gray-400 uppercase text-xs tracking-wider">Roli</th>
              <th className="py-3 px-4 text-left text-gray-400 uppercase text-xs tracking-wider">Statusi</th>
              <th className="py-3 px-4 text-right text-gray-400 uppercase text-xs tracking-wider">Veprimet</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="py-8 text-center"><LoadingSpinner /></td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="4" className="py-8 text-center text-gray-400">Asnjë përdorues nuk u gjet</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/40">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center">
                      <FiUser />
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.active ? 'Aktiv' : 'Joaktiv'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEditUser(user.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-cyan-400 transition-colors" title="Modifiko"><FiEdit2 size={16} /></button>
                      <button onClick={() => handlePasswordChange(user.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-yellow-400 transition-colors" title="Ndrysho fjalëkalimin"><FiKey size={16} /></button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-red-400 transition-colors" title="Fshij"><FiTrash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30 shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{isEditing ? "Modifiko Përdoruesin" : "Shto Përdorues të Ri"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Emri*</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400 focus:ring-cyan-500"/>
                  </div>
                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Fjalëkalimi*</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400 focus:ring-cyan-500"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Konfirmo Fjalëkalimin*</label>
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400 focus:ring-cyan-500"/>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Numri i Telefonit</label>
                    <input type="text" name="number" value={formData.number} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400 focus:ring-cyan-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Roli</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <input id="active" name="active" type="checkbox" checked={formData.active} onChange={handleChange} className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"/>
                    <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-300">Llogaria aktive</label>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">Anulo</button>
                  <button type="submit" className="px-4 py-2 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2" disabled={loading}>
                    {loading ? <LoadingSpinner size="sm" /> : <FiCheck />}
                    {isEditing ? "Përditëso" : "Krijo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-cyan-500/30 shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Ndrysho Fjalëkalimin</h2>
              <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handlePasswordSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fjalëkalimi i Ri*</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                  <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">Anulo</button>
                  <button type="submit" className="px-4 py-2 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2" disabled={loading}>
                    {loading ? <LoadingSpinner size="sm" /> : <FiKey size={16} />}
                    Ndrysho Fjalëkalimin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;