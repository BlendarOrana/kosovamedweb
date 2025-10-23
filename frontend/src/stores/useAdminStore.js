import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useAdminStore = create((set, get) => ({
  users: [],
  pendingUsers: [],
  shiftRequests: { pending: [], approved: [], rejected: [] }, // Add this line
  currentUser: null,
  loading: false,
  error: null,
  usersLoaded: false,
  pendingUsersLoaded: false,
  
  // Get all users (with caching)
  getAllUsers: async () => {
    if (get().usersLoaded && get().users.length > 0) {
      return;
    }
    
    set({ loading: true });
    try {
      const res = await axios.get("/admin/users");
      set({ users: res.data, loading: false, error: null, usersLoaded: true });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to fetch users" 
      });
      toast.error(error.response?.data?.message || "Failed to fetch users");
    }
  },
  
  // Force refresh users (bypass cache)
  refreshUsers: async () => {
    set({ loading: true, usersLoaded: false });
    try {
      const res = await axios.get("/admin/users");
      set({ users: res.data, loading: false, error: null, usersLoaded: true });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to fetch users" 
      });
      toast.error(error.response?.data?.message || "Failed to fetch users");
    }
  },
  
  // Get pending users (with caching)
  getPendingUsers: async () => {
    if (get().pendingUsersLoaded && get().pendingUsers.length > 0) {
      return;
    }
    
    set({ loading: true });
    try {
      const res = await axios.get("/admin/users/pending");
      set({ 
        pendingUsers: res.data.users, 
        loading: false, 
        error: null, 
        pendingUsersLoaded: true 
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to fetch pending users" 
      });
      toast.error(error.response?.data?.message || "Failed to fetch pending users");
    }
  },
  
  // Force refresh pending users (bypass cache)
  refreshPendingUsers: async () => {
    set({ loading: true, pendingUsersLoaded: false });
    try {
      const res = await axios.get("/admin/users/pending");
      set({ 
        pendingUsers: res.data.users, 
        loading: false, 
        error: null, 
        pendingUsersLoaded: true 
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to fetch pending users" 
      });
      toast.error(error.response?.data?.message || "Failed to fetch pending users");
    }
  },
  
  // Accept a pending user
acceptUser: async (userId, region, shift, contractStartDate) => {
  try {
    const res = await axios.put(
      `/admin/users/${userId}/accept`,
      { 
        region, 
        shift: parseInt(shift), // Convert to integer to ensure it's 1 or 2
        contractStartDate 
      }
    );
    
    if (res.status === 200) {
      set((state) => ({
        pendingUsers: state.pendingUsers.filter((user) => user.id !== userId),
      }));
      toast.success("Përdoruesi u pranua me sukses");
      return true;
    }
  } catch (error) {
    toast.error(error.response?.data?.message || "Gabim gjatë pranimit të përdoruesit");
    return false;
  }
},
  // Create a new user
  createUser: async (userData) => {
    set({ loading: true });
    try {
      const res = await axios.post("/admin/users", userData);
      set(state => ({ 
        users: [res.data, ...state.users], 
        loading: false, 
        error: null 
      }));
      toast.success("User created successfully");
      return res.data;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to create user" 
      });
      toast.error(error.response?.data?.message || "Failed to create user");
      return null;
    }
  },
  
  // Update user
  updateUser: async (id, userData) => {
    set({ loading: true });
    try {
      const res = await axios.put(`/admin/users/${id}`, userData);
      set(state => ({
        users: state.users.map(user => user.id === id ? res.data : user),
        currentUser: state.currentUser?.id === id ? res.data : state.currentUser,
        loading: false,
        error: null
      }));
      toast.success("User updated successfully");
      return res.data;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to update user" 
      });
      toast.error(error.response?.data?.message || "Failed to update user");
      return null;
    }
  },
  
  // Change user password
  changeUserPassword: async (id, password) => {
    set({ loading: true });
    try {
      const res = await axios.patch(`/admin/users/${id}/password`, { password });
      set({ loading: false, error: null });
      toast.success("Password changed successfully");
      return true;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to change password" 
      });
      toast.error(error.response?.data?.message || "Failed to change password");
      return false;
    }
  },
  
  // Delete user
  deleteUser: async (id) => {
    set({ loading: true });
    try {
      await axios.delete(`/admin/users/${id}`);
      set(state => ({
        users: state.users.filter(user => user.id !== id),
        currentUser: state.currentUser?.id === id ? null : state.currentUser,
        loading: false,
        error: null
      }));
      toast.success("User deleted successfully");
      return true;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "Failed to delete user" 
      });
      toast.error(error.response?.data?.message || "Failed to delete user");
      return false;
    }
  },
  
  // Clear current user selection
  clearCurrentUser: () => {
    set({ currentUser: null });
  },
  
  // Clear any errors
  clearError: () => {
    set({ error: null });
  },





getAllShiftRequests: async () => {
  set({ loading: true });
  try {
    const res = await axios.get("/admin/shift-requests");
    set({ 
      shiftRequests: res.data.requests, 
      loading: false, 
      error: null 
    });
  } catch (error) {
    set({ 
      loading: false, 
      error: error.response?.data?.message || "Failed to fetch shift requests" 
    });
    toast.error(error.response?.data?.message || "Failed to fetch shift requests");
  }
},

// Update shift request status (approve/reject)
updateShiftRequestStatus: async (requestId, status) => {
  set({ loading: true });
  try {
    const res = await axios.patch(`/admin/shift-requests/${requestId}`, { status });
    
    // Update local state
    set(state => ({
      shiftRequests: {
        pending: state.shiftRequests.pending.filter(r => r.id !== requestId),
        approved: status === 'approved' 
          ? [...state.shiftRequests.approved, state.shiftRequests.pending.find(r => r.id === requestId)]
          : state.shiftRequests.approved,
        rejected: status === 'rejected'
          ? [...state.shiftRequests.rejected, state.shiftRequests.pending.find(r => r.id === requestId)]
          : state.shiftRequests.rejected
      },
      loading: false,
      error: null
    }));
    
    return true;
  } catch (error) {
    set({ 
      loading: false, 
      error: error.response?.data?.message || "Failed to update shift request" 
    });
    toast.error(error.response?.data?.message || "Failed to update shift request");
    return false;
  }
},


  
  // Reset cache (useful for logout or manual refresh)
  resetUsersCache: () => {
    set({ users: [], usersLoaded: false, pendingUsers: [], pendingUsersLoaded: false });
  }


}));