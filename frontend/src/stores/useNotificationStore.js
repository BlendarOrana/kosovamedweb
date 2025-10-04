// stores/useNotificationStore.js
import { create } from "zustand";
import axios from "../lib/axios"; // Assuming your axios instance is configured
import { toast } from "react-hot-toast";

export const useNotificationStore = create((set) => ({
  // State is now only for tracking the sending process
  sending: false,


  sendNotification: async (notificationData) => {
    // 1. Set sending state to true to disable the button and show a loader
    set({ sending: true });
    const { userId, title, body } = notificationData;

    // 2. Basic validation
    if (!userId || !title || !body) {
      toast.error("User ID, Title, and Body are all required.");
      set({ sending: false });
      return { success: false }; // Indicate failure
    }
    
    // 3. Show a loading toast
    const toastId = toast.loading("Sending notification...");

    try {
      // 4. Make the API call to the backend endpoint
      await axios.post("/notifications/send", notificationData);
      
      // 5. On success, update the toast and reset the state
      toast.success("Notification sent successfully!", { id: toastId });
      set({ sending: false });
      return { success: true }; // Indicate success

    } catch (error) {
      // 6. On failure, update the toast with an error and reset the state
      const errorMessage = error.response?.data?.error || "Failed to send notification.";
      toast.error(errorMessage, { id: toastId });
      set({ sending: false });
      return { success: false }; // Indicate failure
    }
  },
}));