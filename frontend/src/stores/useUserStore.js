import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: false,
  signupSuccess: false,

  // Reset signup success state (useful after navigation)
  resetSignupSuccess: () => set({ signupSuccess: false }),

  login: async (name, password) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/login", { name, password });
      set({ user: res.data, loading: false });
      return true;
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "An error occurred");
      return false;
    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
      set({ user: null });
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred during logout");
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile");
      set({ user: response.data, checkingAuth: false });
    } catch (error) {
      console.log(error.message);
      set({ checkingAuth: false, user: null });
    }
  },

    resetPassword: async (id, token, newPassword) => {
    set({ loading: true });
    try {
      // Sending payload as required by your Backend Controller
      const res = await axios.post("/auth/reset-password", { 
        id, 
        token, 
        newPassword 
      });
      
      set({ loading: false });
      toast.success(res.data.message);
      return true; // Return true to indicate success to component
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "Failed to reset password");
      return false;
    }
  },
}));