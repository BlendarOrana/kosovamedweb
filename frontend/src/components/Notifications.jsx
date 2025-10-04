// components/Notifications.jsx
import React, { useState } from "react";
import { useNotificationStore } from "../stores/useNotificationStore";
import { FiSend } from "react-icons/fi";

// The component is now a dedicated form for sending notifications.
const Notifications = () => {
  // We only get the 'sending' state and 'sendNotification' function from the store.
  const { sending, sendNotification } = useNotificationStore();
  
  // Local state to manage the form inputs
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Call the function from our store
    const result = await sendNotification({ userId, title, body });
    
    // If the notification was sent successfully, clear the form for the next one
    if (result.success) {
      setUserId('');
      setTitle('');
      setBody('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
        Send a Push Notification
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User ID Field */}
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter the recipient's User ID"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          />
        </div>

        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Notification Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Important Account Update"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          />
        </div>

        {/* Body Field */}
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
            Notification Body
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Enter the main message for the user."
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {sending ? (
              'Sending...'
            ) : (
              <>
                <FiSend size={18} />
                Send Notification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Notifications;