import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: false,
  signupSuccess: false,
  regions: [],
  titles: [],

  // Reset signup success state (useful after navigation)
  resetSignupSuccess: () => set({ signupSuccess: false }),

  login: async (name, password) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/login", { name, password });
      set({ user: res.data, loading: false });
      
      // Fetch regions and titles if user is admin
      if (res.data.role === 'admin') {
        get().fetchRegions();
        get().fetchTitles();
      }
      
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
      set({ user: null, shops: [], regions: [], titles: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred during logout");
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile");
      set({ user: response.data, checkingAuth: false });
      
      // Fetch regions and titles if user is admin
      if (response.data.role === 'admin') {
        get().fetchRegions();
        get().fetchTitles();
      }
    } catch (error) {
      console.log(error.message);
      set({ checkingAuth: false, user: null });
    }
  },

  fetchRegions: async () => {
    try {
      const response = await axios.get("/auth/regions");
      if (response.data.success) {
        set({ regions: response.data.data });
      }
    } catch (error) {
      console.error("Error fetching regions:", error);
      toast.error("Failed to fetch regions");
    }
  },

  fetchTitles: async () => {
    try {
      const response = await axios.get("/auth/titles");
      if (response.data.success) {
        set({ titles: response.data.data });
      }
    } catch (error) {
      console.error("Error fetching titles:", error);
      toast.error("Failed to fetch titles");
    }
  },
}));