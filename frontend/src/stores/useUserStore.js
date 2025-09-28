import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: false,
  signupSuccess: false, // New state to track successful signup

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
      set({ user: null, shops: [] }); // Clear shops on logout
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


}));