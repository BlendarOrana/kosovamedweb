// src/stores/useVacationStore.js

import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useVacationStore = create((set, get) => ({
  vacations: [],
  loading: false,

  // Fetch all vacations (for admin)
  fetchAllVacations: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/attendance/all-vacations");
      set({ vacations: res.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "Dështoi ngarkimi i kërkesave");
    }
  },

  // Fetch manager's pending vacations
  fetchManagerVacations: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/attendance/manager-vacations");
      set({ vacations: res.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "Dështoi ngarkimi i kërkesave");
    }
  },

  // Manager responds to vacation request
  managerRespondToVacation: async (id, approve, comment = null) => {
    try {
      const res = await axios.patch(`/attendance/manager-response/${id}`, { 
        approve, 
        comment 
      });
      
      // Update the state locally
      set((state) => ({
        vacations: state.vacations.map(vacation =>
          vacation.id === id ? res.data.vacation : vacation
        ),
      }));

      toast.success(res.data.message);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Ndodhi një gabim");
      return false;
    }
  },

  // Admin responds to vacation request (final approval)
  respondToVacation: async (id, status, admin_comment = null) => {
    try {
      const res = await axios.patch(`/attendance/vacation-response/${id}`, { 
        status, 
        admin_comment 
      });
      
      // Update the state locally
      set((state) => ({
        vacations: state.vacations.map(vacation =>
          vacation.id === id ? res.data.vacation : vacation
        ),
      }));

      toast.success(res.data.message);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Ndodhi një gabim");
      return false;
    }
  },
}));