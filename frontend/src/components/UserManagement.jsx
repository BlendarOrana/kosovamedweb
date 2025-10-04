import { useState, useEffect } from "react";
import { useAdminStore } from "../stores/useAdminStore";
import { FiUser, FiEdit2, FiTrash2, FiKey, FiPlus, FiX, FiCheck, FiSearch, FiExternalLink } from "react-icons/fi";
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
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  
  // The complete form data state, including new fields and contract file
  const [formData, setFormData] = useState({
    name: "", password: "", confirmPassword: "", number: "", role: "user", active: true,
    region: "", title: "", email: "", contract: null,
  });
  
  // State to hold the complete data of the user being edited
  const [currentUserForEdit, setCurrentUserForEdit] = useState(null);

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
      name: "", password: "", confirmPassword: "", number: "", role: "user", active: true,
      region: "", title: "", email: "", contract: null,
    });
    setIsEditing(false);
    setSelectedUserId(null);
    setCurrentUserForEdit(null); // Clear the user-for-edit state
  };
  
  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleAddUser = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleEditUser = async (id) => {
    const userData = await getUserById(id); // Fetch the latest user data
    if (userData) {
      // --- FIX: Populate ALL form fields with existing user data ---
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        number: userData.number || "",
        role: userData.role || "user",
        active: userData.active,
        region: userData.region || "",
        title: userData.title || "",
        password: "", // Password fields are kept empty for security
        confirmPassword: "",
        contract: null, // Contract file input is reset for potential new uploads
      });
      setCurrentUserForEdit(userData); // Save the full user object for displaying info like contract URL
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
    const { name, value, type, checked, files } = e.target;
    if (type === "file") {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && formData.password !== formData.confirmPassword) {
      alert("Fjalëkalimet nuk përputhen");
      return;
    }
    
    // Create a FormData object to handle multipart/form-data (for file upload)
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('number', formData.number);
    data.append('role', formData.role);
    data.append('active', formData.active);
    data.append('region', formData.region);
    data.append('title', formData.title);
    
    // Only append contract if a new one was selected
    if (formData.contract) {
      data.append('contract', formData.contract);
    }

    try {
      if (isEditing) {
        await updateUser(selectedUserId, data);
      } else {
        data.append('password', formData.password); // Password only for new user
        await createUser(data);
      }
      closeModal();
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

  const getRoleDisplayName = (role) => (role.charAt(0).toUpperCase() + role.slice(1));

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-cyan-500/30">
      {/* Header and Search/Add Bar - No changes */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Menaxhimi i Përdoruesve</h2>
        <p className="text-gray-300">Menaxhoni llogaritë dhe lejet e përdoruesve</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center ">
        <div className="relative flex-1 w-full">
          <input
            type="text" placeholder="Kërko përdorues..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-400"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-4 py-2 rounded-lg transition duration-300 shadow-lg"
        >
          <FiPlus /> Shto Përdorues
        </button>
      </div>
      
      {/* Users Table - No changes */}
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
                    <div className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center"><FiUser /></div>
                    <span className="text-white font-medium">{user.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 capitalize">{getRoleDisplayName(user.role)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{user.active ? 'Aktiv' : 'Joaktiv'}</span>
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

      {/* --- ADD/EDIT MODAL --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          {/* --- FIX: Improved form layout and size --- */}
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30 shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{isEditing ? "Modifiko Përdoruesin" : "Shto Përdorues të Ri"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personal Information */}
                  <div className="md:col-span-2"><h3 className="text-lg font-semibold text-cyan-400">Informacioni Personal</h3></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Emri*</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email*</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Numri i Telefonit</label>
                    <input type="text" name="number" value={formData.number} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Titulli</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                  </div>

                  {/* Account Settings */}
                  <div className="md:col-span-2 mt-4"><h3 className="text-lg font-semibold text-cyan-400">Cilësimet e Llogarisë</h3></div>
                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Fjalëkalimi*</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Konfirmo Fjalëkalimin*</label>
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                      </div>
                    </>
                  )}
                   <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Rajoni</label>
                    <input type="text" name="region" value={formData.region} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Roli</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-cyan-500">
                      <option value="user">User</option>
                      <option value="shop">Shop</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  {/* --- FIX: Display existing contract on edit --- */}
                  {isEditing && currentUserForEdit?.contract_url && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Kontrata Aktuale</label>
                      <a href={currentUserForEdit.contract_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline">
                        <FiExternalLink />
                        <span>Shiko Kontratën</span>
                      </a>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">{isEditing ? "Ngarko Kontratë të Re (Opsionale)" : "Ngarko Kontratën (Opsionale)"}</label>
                    <input id="contract" name="contract" type="file" accept=".pdf" onChange={handleChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"/>
                  </div>

                  <div className="flex items-center pt-2 md:col-span-2">
                    <input id="active" name="active" type="checkbox" checked={formData.active} onChange={handleChange} className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"/>
                    <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-300">Llogaria aktive</label>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                  <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">Anulo</button>
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

      {/* Password Modal - No changes */}
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