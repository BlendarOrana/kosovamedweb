import React, { useState } from "react";
import { useNotificationStore } from "../stores/useNotificationStore";
import { FiSend, FiUsers, FiGlobe, FiUser, FiBarChart2 } from "react-icons/fi";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("single");

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Dërgo Njoftime
        </h1>
        <FiBarChart2
          className="text-gray-500 hover:text-cyan-600 cursor-pointer"
          size={24}
        />
      </div>

      {/* Tabs for different notification types */}
      <div className="flex border-b border-gray-200">
        <TabButton
          icon={<FiUser />}
          label="Një Përdorues"
          isActive={activeTab === "single"}
          onClick={() => setActiveTab("single")}
        />
        <TabButton
          icon={<FiUsers />}
          label="Grup"
          isActive={activeTab === "batch"}
          onClick={() => setActiveTab("batch")}
        />
        <TabButton
          icon={<FiGlobe />}
          label="Të Gjithë Përdoruesit"
          isActive={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />
      </div>

      {/* Render the active tab's content */}
      <div className="pt-6">
        {activeTab === "single" && <SingleUserForm />}
        {activeTab === "batch" && <BatchForm />}
        {activeTab === "all" && <AllUsersForm />}
      </div>
    </div>
  );
};

/*
 * Individual Form Components
 */
const SingleUserForm = () => {
  const { sending, sendNotificationByName } = useNotificationStore();
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const notificationData = { 
      title, 
      body,
      userName: recipient 
    };

    await sendNotificationByName(notificationData);

    // Clear form on success
    setRecipient("");
    setTitle("");
    setBody("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recipient Field */}
        <InputField
          id="recipient"
          label="Përdoruesi sipas Emrit"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Vendos Emrin e Përdoruesit"
        />
        {/* Title Field */}
        <InputField
          id="title"
          label="Titulli"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="p.sh., Përditësim i Rëndësishëm i Llogarisë"
        />
      </div>
      {/* Body Field */}
      <TextareaField
        id="body"
        label="Mesazhi"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Shkruani mesazhin kryesor..."
      />

      <SubmitButton isSending={sending} text="Dërgo Njoftimin" />
    </form>
  );
};

const BatchForm = () => {
  const { batchSending, sendBatchNotifications } = useNotificationStore();
  const [target, setTarget] = useState("role"); // 'role' or 'region'
  const [selectedValue, setSelectedValue] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const batchData = {
      title,
      body,
      ...(target === "role" && { role: selectedValue }),
      ...(target === "region" && { region: selectedValue }),
    };

    const result = await sendBatchNotifications(batchData);
    if (result.success) {
      setSelectedValue("");
      setTitle("");
      setBody("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Field */}
        <SelectField
          id="target-type"
          label="Targeto sipas"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setSelectedValue(""); // Reset selection on change
          }}
          options={[
            { value: "role", label: "Titulli" },
            { value: "region", label: "Regjioni" },
          ]}
        />
        {/* Dynamic Input for Role/Region */}
        <InputField
          id="target-value"
          label={`Shto ${target === "role" ? "Titullin" : "Regjionin"}`}
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          placeholder={target === "role" ? "p.sh., Doktor" : "p.sh., Prishtinë"}
        />
      </div>
      <InputField
        id="batch-title"
        label="Titulli"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="p.sh., Promocion Special për Regjionin tuaj"
      />
      <TextareaField
        id="batch-body"
        label="Mesazhi"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Shkruani mesazhin kryesor për grupin..."
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
    const result = await sendToAllUsers({ title, body });
    if (result.success) {
      setTitle("");
      setBody("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <InputField
        id="all-users-title"
        label="Titulli"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="p.sh., Njoftim i Rëndësishëm"
      />
      <TextareaField
        id="all-users-body"
        label="Mesazhi"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ky mesazh do t'u dërgohet të gjithë përdoruesve aktivë."
      />

      <div className="!mt-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
        <p className="font-bold">Kujdes!</p>
        <p>Ky veprim do t'i dërgojë një njoftim të gjithë përdoruesve aktivë.</p>
      </div>
      <SubmitButton isSending={batchSending} text="Dërgo të Gjithë Përdoruesve" />
    </form>
  );
};

/*
 * Reusable UI Components
 */
const TabButton = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all
      ${
        isActive
          ? "bg-cyan-600 text-white"
          : "text-gray-600 hover:bg-gray-200"
      }`}
  >
    {icon}
    {label}
  </button>
);

const InputField = ({ id, label, ...props }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
    </label>
    <input
      id={id}
      type="text"
      required
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
      {...props}
    />
  </div>
);

const TextareaField = ({ id, label, ...props }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
    </label>
    <textarea
      id={id}
      rows={4}
      required
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
      {...props}
    />
  </div>
);

const SelectField = ({ id, label, options = [], ...props }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
    </label>
    <select
      id={id}
      required
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition bg-white"
      {...props}
    >
      <option value="">
        Zgjidh një opsion
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const SubmitButton = ({ isSending, text }) => (
  <button
    type="submit"
    disabled={isSending}
    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
  >
    {isSending ? (
      "Duke dërguar..."
    ) : (
      <>
        <FiSend size={18} />
        {text}
      </>
    )}
  </button>
);

export default Notifications;