// stores/useNotificationStore.js
import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useNotificationStore = create((set, get) => ({
  // State for tracking sending process
  sending: false,
  batchSending: false,
  notificationStats: null,
  loadingStats: false,

  // Send notification to a single user by ID
  sendNotification: async (notificationData) => {
    set({ sending: true });
    const { userId, title, body } = notificationData;

    if (!userId || !title || !body) {
      toast.error("User ID, Title, and Body are all required.");
      set({ sending: false });
      return { success: false };
    }
    
    const toastId = toast.loading("Sending notification...");

    try {
      await axios.post("/notifications/send", notificationData);
      
      toast.success("Notification sent successfully!", { id: toastId });
      set({ sending: false });
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to send notification.";
      toast.error(errorMessage, { id: toastId });
      set({ sending: false });
      return { success: false };
    }
  },

  // Send notification to a user by name
  sendNotificationByName: async (notificationData) => {
    set({ sending: true });
    const { userName, title, body } = notificationData;

    if (!userName || !title || !body) {
      toast.error("User Name, Title, and Body are all required.");
      set({ sending: false });
      return { success: false };
    }
    
    const toastId = toast.loading("Finding user and sending notification...");

    try {
      await axios.post("/notifications/send-by-name", notificationData);
      
      toast.success("Notification sent successfully!", { id: toastId });
      set({ sending: false });
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to send notification.";
      toast.error(errorMessage, { id: toastId });
      set({ sending: false });
      return { success: false };
    }
  },

  // Send batch notifications to users by role or region
  sendBatchNotifications: async (batchData) => {
    set({ batchSending: true });
    const { role, region, title, body, batchSize = 50, delayMs = 1000 } = batchData;

    if (!title || !body) {
      toast.error("Title and Body are required.");
      set({ batchSending: false });
      return { success: false };
    }

    if (!role && !region) {
      toast.error("Either Role or Region must be specified.");
      set({ batchSending: false });
      return { success: false };
    }
    
    const toastId = toast.loading("Sending batch notifications...");

    try {
      const response = await axios.post("/notifications/send-batch", {
        role,
        region,
        title,
        body,
        data: batchData.data || {},
        batchSize,
        delayMs
      });
      
      const { stats } = response.data;
      
      if (stats.sentCount > 0) {
        toast.success(
          `Sent to ${stats.sentCount} users${stats.failedCount > 0 ? `, ${stats.failedCount} failed` : ''}`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error("No notifications were sent. No users with push tokens found.", { id: toastId });
      }
      
      set({ batchSending: false });
      return { 
        success: stats.sentCount > 0,
        stats 
      };

    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to send batch notifications.";
      const stats = error.response?.data?.stats;
      
      if (stats && stats.sentCount > 0) {
        toast.warning(
          `Partially sent: ${stats.sentCount} successful, ${stats.failedCount} failed`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(errorMessage, { id: toastId });
      }
      
      set({ batchSending: false });
      return { success: false, stats };
    }
  },

  // Send notification to all active users
  sendToAllUsers: async (notificationData) => {
    set({ batchSending: true });
    const { title, body, batchSize = 50, delayMs = 1000 } = notificationData;

    if (!title || !body) {
      toast.error("Title and Body are required.");
      set({ batchSending: false });
      return { success: false };
    }
    
    const toastId = toast.loading("Sending notification to all users...");

    try {
      const response = await axios.post("/notifications/send-all", {
        title,
        body,
        data: notificationData.data || {},
        batchSize,
        delayMs
      });
      
      const { stats } = response.data;
      
      if (stats.sentCount > 0) {
        toast.success(
          `Sent to ${stats.sentCount} users${stats.failedCount > 0 ? `, ${stats.failedCount} failed` : ''}`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error("No notifications were sent. No users with push tokens found.", { id: toastId });
      }
      
      set({ batchSending: false });
      return { 
        success: stats.sentCount > 0,
        stats 
      };

    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to send notifications.";
      const stats = error.response?.data?.stats;
      
      if (stats && stats.sentCount > 0) {
        toast.warning(
          `Partially sent: ${stats.sentCount} successful, ${stats.failedCount} failed`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(errorMessage, { id: toastId });
      }
      
      set({ batchSending: false });
      return { success: false, stats };
    }
  },

  // Get notification statistics
  fetchNotificationStats: async () => {
    set({ loadingStats: true });
    
    try {
      const response = await axios.get("/notifications/stats");
      set({ 
        notificationStats: response.data.stats,
        loadingStats: false 
      });
      return response.data.stats;
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      toast.error("Failed to fetch notification statistics");
      set({ loadingStats: false });
      return null;
    }
  },

  // Reset all sending states
  resetSendingStates: () => {
    set({ 
      sending: false, 
      batchSending: false 
    });
  }
}));