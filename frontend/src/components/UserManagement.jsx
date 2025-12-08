import { useState, useEffect } from "react";
import { useAdminStore } from "../stores/useAdminStore";
import { useReportsStore } from "../stores/useReportsStore";
import { useUserStore } from "../stores/useUserStore";
import { 
  FiUser, FiEdit2, FiKey, FiPlus, FiX, FiCheck, 
  FiSearch, FiExternalLink, FiRefreshCw, FiFileText, 
  FiClock, FiFilter, FiDownload 
} from "react-icons/fi";

// --- Constants (Defined outside to prevent re-declaration) ---
const REGIONS = [
  "Deçan", "Dragash", "Ferizaj", "Fushë Kosovë", "Gjakovë", "Gjilan",
  "Gllogoc (Drenas)", "Gracanicë", "Hani i Elezit", "Istog", "Junik",
  "Kamenicë", "Kaçanik", "Klinë", "Leposaviq", "Lipjan", "Malishevë",
  "Mitrovicë", "Mitrovicë e Veriut", "Obiliq", "Pejë", "Podujevë",
  "Prishtinë", "Prizren", "Rahovec", "Shtime", "Shtërpcë", "Skenderaj",
  "Suharekë", "Viti", "Vushtrri", "Zubin Potok", "Zveçan","Zyre Qendrore KosovaMed HC"
];

const SHIFTS = [
  { value: 1, label: "Paradite", color: "text-orange-400 bg-orange-400/10" },
  { value: 2, label: "Pasdite", color: "text-blue-400 bg-blue-400/10" }
];

const INITIAL_FORM_DATA = {
  name: "", password: "", confirmPassword: "", number: "", role: "user",
  active: true, region: "", shift: "", title: "", email: "",
  contract: null, license: null, id_card_number: "", address: "",
  contract_start_date: "", contract_end_date: "",
};

const UserManagement = () => {
  // Store Hooks
  const { users, loading, getAllUsers, refreshUsers, createUser, updateUser, changeUserPassword } = useAdminStore();
  const { downloadContractTerminationPDF, downloadEmploymentCertificatePDF, downloadMaternityLeavePDF } = useReportsStore();
  const { user: currentUser } = useUserStore();

  // Local State
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegionFilter, setSelectedRegionFilter] = useState("");
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentUserForEdit, setCurrentUserForEdit] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Initial Load
  useEffect(() => {
    if (users.length === 0) getAllUsers();
  }, [getAllUsers, users.length]);

  // --- Handlers ---
  const resetState = () => {
    setFormData(INITIAL_FORM_DATA);
    setIsEditing(false);
    setSelectedUserId(null);
    setCurrentUserForEdit(null);
    setModalOpen(false);
    setPasswordModalOpen(false);
    setNewPassword("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : (type === 'checkbox' ? checked : value)
    }));
  };

  const handleEditUser = (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    setFormData({
      ...INITIAL_FORM_DATA, // reset first
      name: user.name || "",
      email: user.email || "",
      number: user.number || "",
      role: user.role || "user",
      active: user.active,
      region: user.region || "",
      shift: user.shift || "",
      title: user.title || "",
      id_card_number: user.id_card_number || "",
      address: user.address || "",
      contract_start_date: user.contract_start_date?.split('T')[0] || "",
      contract_end_date: user.contract_end_date?.split('T')[0] || "",
      // Files and password intentionally reset
    });
    
    setCurrentUserForEdit(user);
    setSelectedUserId(id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && formData.password !== formData.confirmPassword) {
      alert("Fjalëkalimet nuk përputhen");
      return;
    }

    const dataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      // Logic: Skip empty files, empty dates, and nulls
      if (key === 'confirmPassword') return;
      if (formData[key] === null || formData[key] === '') return;
      dataToSend.append(key, formData[key]);
    });

    const success = isEditing 
      ? await updateUser(selectedUserId, dataToSend)
      : await createUser(dataToSend);

    if (success) resetState();
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Min 6 karaktere");
    if (await changeUserPassword(selectedUserId, newPassword)) resetState();
  };

  // --- Helpers ---
  const filteredUsers = users.filter(user => {
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = 
      (user.name || "").toLowerCase().includes(lowerSearch) ||
      (user.email || "").toLowerCase().includes(lowerSearch) ||
      (user.id_card_number || "").toLowerCase().includes(lowerSearch);
    const matchesRegion = selectedRegionFilter ? user.region === selectedRegionFilter : true;
    return matchesSearch && matchesRegion;
  });

  const getShiftData = (shiftVal) => SHIFTS.find(s => s.value == shiftVal) || { label: "N/A", color: "text-gray-400" };

  return (
    <div className="bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-700 h-[calc(100vh-100px)] flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Menaxhimi i Përdoruesve</h2>
          <p className="text-gray-400 text-sm">Lista e plotë dhe administrimi</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <div className="flex gap-2 flex-1">
             <div className="relative flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Kërko..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-1 focus:ring-cyan-500"
              />
              <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
            </div>
            
            <div className="relative min-w-[140px]">
              <select
                value={selectedRegionFilter}
                onChange={(e) => setSelectedRegionFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Të gjitha</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <FiFilter className="absolute left-3 top-2.5 text-gray-400" size={14} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button onClick={refreshUsers} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 transition">
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={20} />
            </button>
            <button 
              onClick={() => { resetState(); setModalOpen(true); }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center gap-2 transition shadow-lg shadow-cyan-900/20"
            >
              <FiPlus /> 
              <span className="hidden sm:inline">Përdorues i ri</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Container - Flex Grow to Fill Height */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-700/50 bg-gray-900/20 relative">
        <table className="w-full border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10 text-xs uppercase text-gray-400 font-semibold tracking-wider text-left">
            <tr>
              <th className="py-4 px-6 rounded-tl-xl bg-gray-800">Emri & Detajet</th>
              <th className="py-4 px-6 bg-gray-800">Rajoni</th>
              <th className="py-4 px-6 bg-gray-800">Roli</th>
              <th className="py-4 px-6 bg-gray-800">Statusi</th>
              <th className="py-4 px-6 bg-gray-800 rounded-tr-xl text-right">Veprimet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {users.length === 0 && loading ? (
              <tr><td colSpan="5" className="py-10 text-center text-gray-400">Duke u ngarkuar...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="5" className="py-10 text-center text-gray-400">Asnjë përdorues</td></tr>
            ) : (
              filteredUsers.map((user) => {
                const shiftData = getShiftData(user.shift);
                return (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-cyan-500 border border-gray-600 shrink-0 overflow-hidden">
                          {user.profile_image_url ? (
                             <img src={user.profile_image_url} className="w-full h-full object-cover"/>
                          ) : <FiUser />}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                          <div className={`text-xs mt-0.5 flex items-center gap-1 ${shiftData.color} w-fit px-1.5 py-0.5 rounded`}>
                            <FiClock size={10} /> {shiftData.label}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-gray-300 text-sm">{user.region || "-"}</td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs border border-purple-500/20 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {user.active ? 'Aktiv' : 'Pasiv'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEditUser(user.id)} className="p-1.5 hover:bg-gray-700 rounded text-cyan-400 transition" title="Modifiko">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => { setSelectedUserId(user.id); setPasswordModalOpen(true); }} className="p-1.5 hover:bg-gray-700 rounded text-yellow-400 transition" title="Ndrysho Fjalëkalimin">
                          <FiKey size={16} />
                        </button>
                        
                        {currentUser?.role === 'admin' && (
                          <div className="flex border-l border-gray-600 ml-1 pl-1 gap-1">
                            <button onClick={() => downloadContractTerminationPDF(user.id)} className="p-1.5 hover:bg-gray-700 rounded text-red-400 transition" title="Ndërprerja Kontratës">
                              <FiFileText size={16} />
                            </button>
                            <button onClick={() => downloadEmploymentCertificatePDF(user.id)} className="p-1.5 hover:bg-gray-700 rounded text-blue-400 transition" title="Vërtetim Punësimi">
                              <FiCheck size={16} />
                            </button>
                            <button onClick={() => downloadMaternityLeavePDF(user.id)} className="p-1.5 hover:bg-gray-700 rounded text-pink-400 transition" title="Pushim Lehonie">
                              <FiDownload size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Main Edit/Create Modal (Fixed Scroll) --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overscroll-contain">
          {/* 
            Container structure fixed:
            1. flex-col to stack Header, Body, Footer 
            2. max-h to respect screen limits
            3. w-full and max-w for responsiveness 
          */}
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* 1. Header (Fixed) */}
            <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isEditing ? <FiEdit2 className="text-cyan-400"/> : <FiPlus className="text-cyan-400"/>}
                {isEditing ? "Modifiko Përdoruesin" : "Regjistro Përdorues"}
              </h2>
              <button onClick={resetState} className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg p-1 transition"><FiX size={24} /></button>
            </div>

            {/* 2. Scrollable Content (Takes remaining space) */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <form id="user-form" onSubmit={handleSubmit} className="space-y-8">
                
                {/* Section 1 */}
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                  <h3 className="text-sm uppercase tracking-wider font-semibold text-cyan-500 mb-4 border-b border-gray-700/50 pb-2">Informacioni Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputGroup label="Emri i plotë *" name="name" value={formData.name} onChange={handleChange} required />
                    <InputGroup label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} required />
                    <InputGroup label="Telefon" name="number" value={formData.number} onChange={handleChange} />
                    <InputGroup label="ID / Letërnjoftimi" name="id_card_number" value={formData.id_card_number} onChange={handleChange} />
                    <InputGroup label="Titulli / Pozita" name="title" value={formData.title} onChange={handleChange} />
                    <InputGroup label="Adresa" name="address" value={formData.address} onChange={handleChange} />
                  </div>
                </div>

                {/* Section 2 */}
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                  <h3 className="text-sm uppercase tracking-wider font-semibold text-cyan-500 mb-4 border-b border-gray-700/50 pb-2">Konfigurimi i Llogarisë</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {!isEditing && (
                      <>
                        <InputGroup label="Fjalëkalimi *" type="password" name="password" value={formData.password} onChange={handleChange} required />
                        <InputGroup label="Konfirmo Fjalëkalimin *" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                      </>
                    )}
                    
                    <SelectGroup label="Rajoni" name="region" value={formData.region} onChange={handleChange} options={REGIONS} />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Turni</label>
                      <select name="shift" value={formData.shift} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors">
                        <option value="">Zgjedh...</option>
                        {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>

                    {currentUser?.role === 'admin' && (
                       <div>
                         <label className="block text-sm font-medium text-gray-400 mb-1.5">Roli</label>
                         <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-cyan-500">
                           <option value="user">User</option>
                           <option value="manager">Manager</option>
                           <option value="admin">Admin</option>
                         </select>
                       </div>
                    )}
                    
                    <div className="flex items-center mt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-300">Llogaria Aktive</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section 3 - Files */}
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                  <h3 className="text-sm uppercase tracking-wider font-semibold text-cyan-500 mb-4 border-b border-gray-700/50 pb-2">Kontrata & Dokumentet</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputGroup label="Fillimi i punës" type="date" name="contract_start_date" value={formData.contract_start_date} onChange={handleChange} />
                    <InputGroup label="Mbarimi i punës" type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange} />
                    
                    {/* Contracts Section */}
                    <div className="col-span-1 md:col-span-2 grid md:grid-cols-2 gap-6 pt-2">
                        <FileInput 
                            label="Kontrata e Punës" 
                            name="contract" 
                            onChange={handleChange}
                            currentUrl={isEditing ? currentUserForEdit?.contract_url : null}
                            buttonText="Shiko Kontratën"
                        />
                        <FileInput 
                            label="Licensa Mjekësore" 
                            name="license" 
                            onChange={handleChange}
                            currentUrl={isEditing ? currentUserForEdit?.license_url : null}
                            buttonText="Shiko Licensën"
                        />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            {/* 3. Footer (Fixed) */}
            <div className="p-5 border-t border-gray-700 bg-gray-800/50 flex justify-end gap-3 z-10">
              <button type="button" onClick={resetState} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition font-medium">Anulo</button>
              <button type="submit" form="user-form" className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/20" disabled={loading}>
                <FiCheck className="stroke-2"/>
                {isEditing ? "Ruaj Ndryshimet" : "Krijo Përdoruesin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-[10000]">
           <div className="bg-gray-800 rounded-xl max-w-sm w-full border border-gray-600 shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-white">Ndrysho Fjalëkalimin</h3>
                 <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-white"><FiX /></button>
              </div>
              <form onSubmit={handlePasswordSubmit}>
                 <label className="block text-sm font-medium text-gray-400 mb-2">Fjalëkalimi i ri</label>
                 <input 
                   type="password" 
                   value={newPassword} 
                   onChange={(e) => setNewPassword(e.target.value)}
                   className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-cyan-500 mb-6" 
                   autoFocus
                 />
                 <div className="flex justify-end gap-3">
                   <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Anulo</button>
                   <button type="submit" className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition">Ndrysho</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Mini Sub-components for Cleaner JSX ---
const InputGroup = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
    <input {...props} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors placeholder-gray-500" />
  </div>
);

const SelectGroup = ({ label, options, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
    <select {...props} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors">
      <option value="">Zgjedh...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const FileInput = ({ label, currentUrl, buttonText, ...props }) => (
    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-600/50">
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        {currentUrl && (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-cyan-400 hover:underline mb-2">
                <FiExternalLink /> {buttonText}
            </a>
        )}
        <input 
            type="file" 
            accept=".pdf,.doc,.docx"
            {...props}
            // IMPORTANT: Removed 'value' attribute here
            className="block w-full text-xs text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-xs file:font-semibold
            file:bg-cyan-900/30 file:text-cyan-400
            hover:file:bg-cyan-900/50 cursor-pointer"
        />
    </div>
);

export default UserManagement;