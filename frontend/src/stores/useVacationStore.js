// src/stores/useVacationStore.js

import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useVacationStore = create((set, get) => ({
  vacations: [],
  loading: false,

  fetchAllVacations: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/attendance/all-vacations");
      set({ vacations: res.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "Failed to fetch vacation requests");
    }
  },

  respondToVacation: async (id, status, admin_comment = null) => {
    try {
      const res = await axios.patch(`/attendance/vacation-response/${id}`, { status, admin_comment });
      
      // Update the state locally for a reactive UI
      set((state) => ({
        vacations: state.vacations.map(vacation =>
          vacation.id === id ? { ...vacation, status, admin_comment, reviewed_by: res.data.vacation.reviewed_by } : vacation
        ),
      }));

      toast.success(`Request has been ${status}.`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
      return false;
    }
  },
}));