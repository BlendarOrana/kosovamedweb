import { useState, useEffect } from "react";
import { useAdminStore } from "../stores/useAdminStore";
import { FiUser, FiEdit2, FiTrash2, FiKey, FiPlus, FiX, FiCheck, FiSearch } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner"; // Shto këtë importim

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
    name: "",
    password: "",
    confirmPassword: "",
    number: "",
    address: "",
    role: "user",
    active: true,
    driver_nr: "",
    shop_street: "",
    shop_address_number: "",
    shop_city: "",
    shop_postal_code: "",
    shop_siret: ""
  });
  const [newPassword, setNewPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Merr të gjithë përdoruesit kur ngarkohet komponenti
  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  // Filtro përdoruesit bazuar në termin e kërkimit
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())   );

  // Pastro të dhënat e formularit
  const resetForm = () => {
    setFormData({
      name: "",
      password: "",
      confirmPassword: "",
      number: "",
      address: "",
      role: "user",
      active: true,
      driver_nr: "",
      shop_street: "",
      shop_address_number: "",
      shop_city: "",
      shop_postal_code: "",
      shop_siret: ""
    });
    setIsEditing(false);
    clearCurrentUser();
  };

  // Hape modalin për krijimin e një përdoruesi të ri
  const handleAddUser = () => {
    resetForm();
    setModalOpen(true);
  };

  // Hape modalin për modifikimin e përdoruesit
  const handleEditUser = async (id) => {
    const userData = await getUserById(id);
    if (userData) {
      setFormData({
        name: userData.name || "",
        password: "",
        confirmPassword: "",
        number: userData.number || "",
        address: userData.address || "",
        role: userData.role || "user",
        active: userData.active !== undefined ? userData.active : true,
        driver_nr: userData.driver_nr || "",
        shop_street: userData.shop_street || "",
        shop_address_number: userData.shop_address_number || "",
        shop_city: userData.shop_city || "",
        shop_postal_code: userData.shop_postal_code || "",
        shop_siret: userData.shop_siret || ""
      });
      setSelectedUserId(id);
      setIsEditing(true);
      setModalOpen(true);
    }
  };

  // Hape modalin për ndryshimin e fjalëkalimit
  const handlePasswordChange = (id) => {
    setSelectedUserId(id);
    setNewPassword("");
    setPasswordModalOpen(true);
  };

  // Menaxho ndryshimet në inputet e formularit
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  // Menaxho dorëzimin e formularit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEditing && formData.password !== formData.confirmPassword) {
      alert("Fjalëkalimet nuk përputhen");
      return;
    }

    try {
      if (isEditing) {
        // Hiq fushat e fjalëkalimit për përditësim
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

  // Menaxho dorëzimin e ndryshimit të fjalëkalimit
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

  // Menaxho fshirjen e përdoruesit
  const handleDeleteUser = async (id) => {
    if (window.confirm("Jeni i sigurt që dëshironi të fshini këtë përdorues?")) {
      await deleteUser(id);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'admin';
    
      default:
        return role;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Menaxhimi i Përdoruesve</h2>
        <p className="text-slate-500">Menaxhoni llogaritë dhe lejet e përdoruesve</p>
      </div>
      
      {/* Kërko dhe Shto Përdorues */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Kërko përdorues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
          />
          <FiSearch className="absolute left-3 top-3 text-slate-400" />
        </div>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition duration-300"
        >
          <FiPlus /> Shto Përdorues
        </button>
      </div>

      {/* Tabela e Përdoruesve */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4 text-left text-slate-700">Emri</th>
              <th className="py-3 px-4 text-left text-slate-700">Roli</th>
              <th className="py-3 px-4 text-left text-slate-700">Statusi</th>
              <th className="py-3 px-4 text-right text-slate-700">Veprimet</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400">
                  Asnjë përdorues nuk u gjet
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <FiUser />
                    </div>
                    <span className="text-slate-700">{user.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'driver' ? 'bg-sky-100 text-sky-800' : 
                      user.role === 'stocker' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
         
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'Aktiv' : 'Joaktiv'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(user.id)}
                        className="p-1 bg-slate-200 hover:bg-slate-300 rounded text-blue-700 transition-colors"
                        title="Modifiko përdoruesin"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handlePasswordChange(user.id)}
                        className="p-1 bg-amber-100 hover:bg-amber-200 rounded text-amber-700 transition-colors"
                        title="Ndrysho fjalëkalimin"
                      >
                        <FiKey size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors"
                        title="Fshij përdoruesin"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modali i Formularit të Përdoruesit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? "Modifiko Përdoruesin" : "Shto Përdorues të Ri"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Emri*
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    />
                  </div>
                  
                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Fjalëkalimi*
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required={!isEditing}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Konfirmo Fjalëkalimin*
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required={!isEditing}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Numri i Telefonit
                    </label>
                    <input
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    />
                  </div>
                 
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Roli
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    >
                    <option value="user">User</option>

                      <option value="admin">Admin</option>

                  
                    </select>
                  </div>
          
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="active" className="ml-2 text-sm font-medium text-slate-700">
                      Llogaria aktive
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
                  >
                    Anulo
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiCheck />
                    )}
                    {isEditing ? "Përditëso" : "Krijo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modali i Ndryshimit të Fjalëkalimit */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Ndrysho Fjalëkalimin</h2>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handlePasswordSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fjalëkalimi i Ri*
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
                  >
                    Anulo
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiKey size={16} />
                    )}
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