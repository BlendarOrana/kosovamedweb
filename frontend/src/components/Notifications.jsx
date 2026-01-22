import React, { useState, useMemo } from "react";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useUserStore } from "../stores/useUserStore";
import { FiSend, FiUsers, FiGlobe, FiUser, FiBarChart2, FiLock } from "react-icons/fi";
import clsx from 'clsx';

// --- Shared Constants (Same as Reports) ---

const TITLES = [
  "Doktor", "Infermier", "Shofer", "Administrate", "Jurist", 
  "Ekonomist", "Sociolog", "Psikog", "Serviser"
];

const REGIONS = [
  "Deçan", "Dragash", "Ferizaj", "Fushë Kosovë", "Gjakovë", "Gjilan", 
  "Gllogoc (Drenas)", "Gracanicë", "Hani i Elezit", "Istog", "Junik", 
  "Kamenicë", "Kaçanik", "Klinë", "Leposaviq", "Lipjan", "Malishevë", 
  "Mitrovicë", "Mitrovicë e Veriut", "Obiliq", "Pejë", "Podujevë", 
  "Prishtinë", "Prizren", "Rahovec", "Shtime", "Shtërpcë", "Skenderaj", 
  "Suharekë", "Viti", "Vushtrri", "Zubin Potok", "Zveçan"
];

// --- Reusable UI Components (Matching Reports Style) ---

const InputField = ({ id, label, disabled, className, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={id}
      disabled={disabled}
      className={clsx(
        "w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-gray-400 bg-white",
        disabled && "opacity-60 bg-gray-200 cursor-not-allowed text-gray-500",
        className
      )}
      {...props}
    />
  </div>
);

const TextareaField = ({ id, label, rows = 4, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <textarea
      id={id}
      rows={rows}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-gray-400 bg-white"
      {...props}
    />
  </div>
);

const SelectField = ({ id, label, options = [], disabled, value, onChange, placeholder = "Zgjidh një opsion", ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className={clsx(
          "w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition appearance-none bg-white",
          disabled && "opacity-80 bg-gray-100 cursor-not-allowed text-gray-600 border-gray-300"
        )}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Dropdown Icon Arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        {disabled && value ? <FiLock className="w-4 h-4 text-gray-500" /> : (
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
             <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
        )}
      </div>
    </div>
  </div>
);

const SubmitButton = ({ isSending, text, disabled }) => (
  <button
    type="submit"
    disabled={isSending || disabled}
    className={clsx(
      "w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white rounded-lg transition-all shadow-md",
      (isSending || disabled) 
        ? "bg-gray-400 cursor-not-allowed" 
        : "bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
    )}
  >
    {isSending ? (
      <><span>Duke dërguar...</span></>
    ) : (
      <>
        <FiSend size={18} />
        {text}
      </>
    )}
  </button>
);

const TabButton = ({ icon, label, isActive, onClick, disabled }) => (
  <button
    onClick={!disabled ? onClick : undefined}
    disabled={disabled}
    className={clsx(
      "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all",
      isActive
        ? "bg-cyan-600 text-white shadow-sm z-10"
        : "text-gray-600 hover:bg-gray-200 bg-gray-100",
      disabled && "opacity-50 cursor-not-allowed hover:bg-gray-100 text-gray-400"
    )}
  >
    {icon}
    {label}
    {disabled && <FiLock className="ml-1 h-3 w-3" />}
  </button>
);

// --- Sub-Forms ---

const SingleUserForm = () => {
  const { sending, sendNotificationByName } = useNotificationStore();
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) return;
    
    await sendNotificationByName({ 
      title, 
      body, 
      userName: recipient 
    });
    setRecipient("");
    setTitle("");
    setBody("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          id="recipient"
          label="Përdoruesi sipas Emrit"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Vendos Emrin e Përdoruesit..."
        />
        <InputField
          id="title"
          label="Titulli"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulli i njoftimit..."
        />
      </div>
      <TextareaField
        id="body"
        label="Mesazhi"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Shkruani mesazhin këtu..."
      />
      <SubmitButton isSending={sending} text="Dërgo Njoftimin" />
    </form>
  );
};

const BatchForm = () => {
  const { batchSending, sendBatchNotifications } = useNotificationStore();
  const { user } = useUserStore(); // Get Current User
  
  const [targetType, setTargetType] = useState(""); // 'role' or 'region'
  const [selectedValue, setSelectedValue] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const isManager = user?.role === 'manager';
  const userRegion = user?.region;

  // Logic: When switching Target Type
  const handleTypeChange = (e) => {
    const type = e.target.value;
    setTargetType(type);
    
    // Reset selection logic
    if (type === 'region' && isManager) {
        // If Manager selects Region, lock to their region immediately
        setSelectedValue(userRegion || ''); 
    } else {
        setSelectedValue('');
    }
  };

  // Memoized Options
  const regionOptions = useMemo(() => {
    // Note: If isManager is true, we force the value, so options matter less, 
    // but good to show just their region.
    if (isManager && userRegion) {
        return [{ value: userRegion, label: userRegion }];
    }
    return REGIONS.map(r => ({ value: r, label: r }));
  }, [isManager, userRegion]);

  const titleOptions = useMemo(() => {
      return TITLES.map(t => ({ value: t, label: t }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const batchData = {
      title,
      body,
      ...(targetType === "role" && { role: selectedValue }),
      ...(targetType === "region" && { region: selectedValue }),
    };

    const result = await sendBatchNotifications(batchData);
    if (result?.success) {
      if (!isManager) setSelectedValue(""); 
      setTitle("");
      setBody("");
    }
  };

  const isLockedRegion = isManager && targetType === 'region';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectField
          id="target-type"
          label="Targeto Grupin sipas"
          value={targetType}
          onChange={handleTypeChange}
          options={[
            { value: "role", label: "Titullit (Rolit)" },
            { value: "region", label: "Regjionit" },
          ]}
          placeholder="Zgjidh Llojin e Grupit"
        />

        {/* Dynamic Dropdown based on Type */}
        <SelectField
            id="target-value"
            label={targetType === "role" ? "Zgjidh Titullin" : "Zgjidh Regjionin"}
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            // Pass options based on selection
            options={targetType === "role" ? titleOptions : regionOptions}
            // Lock if Manager selects Region
            disabled={isLockedRegion}
            placeholder={isLockedRegion ? userRegion : `Zgjidh ${targetType === "role" ? "Titullin" : "Regjionin"}`}
        />
      </div>

      <InputField
        id="batch-title"
        label="Titulli"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="p.sh., Njoftim për stafin"
      />
      <TextareaField
        id="batch-body"
        label="Mesazhi"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Shkruani mesazhin..."
      />

      <SubmitButton isSending={batchSending} text="Dërgo Njoftim Grupit" />
    </form>
  );
};

const AllUsersForm = () => {
  const { batchSending, sendToAllUsers } = useNotificationStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(confirm("Jeni i sigurt që doni t'u dërgoni të gjithë përdoruesve?")) {
        const result = await sendToAllUsers({ title, body });
        if (result.success) {
        setTitle("");
        setBody("");
        }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      <div className="!mt-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
        <p className="font-bold flex items-center"><FiGlobe className="mr-2"/>Kujdes!</p>
        <p>Ky njoftim do të shkojë tek të gjithë përdoruesit e regjistruar në sistem.</p>
      </div>

      <InputField
        id="all-users-title"
        label="Titulli"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Njoftim i Përgjithshëm"
      />
      <TextareaField
        id="all-users-body"
        label="Mesazhi per te gjith Userat"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ky mesazh do t'u dërgohet të gjithë përdoruesve..."
      />

      <SubmitButton isSending={batchSending} text="Dërgo te Të Gjithë" />
    </form>
  );
};

// --- Main Component ---

const Notifications = () => {
  const { user } = useUserStore(); // Check user role
  const isManager = user?.role === 'manager';

  // Determine available tabs
  // If user changes (e.g. logout/login), reset tab if locked out
  const [activeTab, setActiveTab] = useState("single");

  const handleTabChange = (tab) => {
    // Extra security check for click handler
    if (tab === 'all' && isManager) return;
    setActiveTab(tab);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        
      {/* Header Container styled similar to Reports */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600">
                    <FiSend size={24} />
                </div>
                Dërgo Njoftime
                </h1>
            </div>
            <FiBarChart2 className="text-gray-400 opacity-20 hidden sm:block" size={48} />
        </div>

        {/* Tab Navigation */}
        <div className="px-6 mt-4 flex border-b border-gray-200 gap-1 overflow-x-auto">
            <TabButton
            icon={<FiUser />}
            label="Një Përdorues"
            isActive={activeTab === "single"}
            onClick={() => handleTabChange("single")}
            />
            <TabButton
            icon={<FiUsers />}
            label="Njoftim në Grup"
            isActive={activeTab === "batch"}
            onClick={() => handleTabChange("batch")}
            />
            <TabButton
            icon={<FiGlobe />}
            label="Të Gjithë"
            isActive={activeTab === "all"}
            onClick={() => handleTabChange("all")}
            disabled={isManager} // Completely disable this tab for Managers
            />
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[400px]">
            {activeTab === "single" && <SingleUserForm />}
            {activeTab === "batch" && <BatchForm />}
            {activeTab === "all" && !isManager && <AllUsersForm />}
        </div>
      </div>
    </div>
  );
};

export default Notifications;