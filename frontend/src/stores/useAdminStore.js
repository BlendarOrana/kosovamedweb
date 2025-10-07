import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useAdminStore = create((set, get) => ({
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  usersLoaded: false, // Add flag to track if users have been loaded
  
  // Get all users (with caching)
  getAllUsers: async () => {
    // If users are already loaded, skip the API call
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
  
  // Get a single user
  getUserById: async (id) => {
    set({ loading: true });
    try {
      const res = await axios.get(`/admin/users/${id}`);
      set({ currentUser: res.data, loading: false, error: null });
      return res.data;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.message || "User not found" 
      });
      toast.error(error.response?.data?.message || "User not found");
      return null;
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
  
  // Reset cache (useful for logout or manual refresh)
  resetUsersCache: () => {
    set({ users: [], usersLoaded: false });
  }
}));