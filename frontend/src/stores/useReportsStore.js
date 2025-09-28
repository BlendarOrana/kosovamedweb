import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useReportsStore = create((set, get) => ({
  loading: false,
  downloadProgress: 0,
  
  // Download attendance report
  downloadAttendanceReport: async (params = {}) => {
    const { startDate, endDate, username } = params;
    set({ loading: true, downloadProgress: 0 });
    
    try {
      // Create query string
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (username) queryParams.append('username', username);
      
      const response = await axios.get(`/reports/attendance-excel?${queryParams.toString()}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ downloadProgress: progress });
        }
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'attendance_report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Raporti i pranisë u shkarkua me sukses!');
      set({ loading: false, downloadProgress: 0 });
      return true;
      
    } catch (error) {
      set({ loading: false, downloadProgress: 0 });
      const errorMessage = error.response?.data?.message || 'Gabim në shkarkimin e raportit të pranisë';
      toast.error(errorMessage);
      throw error;
    }
  },
  
  // Download vacation report
  downloadVacationReport: async (params = {}) => {
    const { status, username } = params;
    set({ loading: true, downloadProgress: 0 });
    
    try {
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      if (username) queryParams.append('username', username);
      
      const response = await axios.get(`/reports/vacation-excel?${queryParams.toString()}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ downloadProgress: progress });
        }
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'vacation_report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Raporti i pushimeve u shkarkua me sukses!');
      set({ loading: false, downloadProgress: 0 });
      return true;
      
    } catch (error) {
      set({ loading: false, downloadProgress: 0 });
      const errorMessage = error.response?.data?.message || 'Gabim në shkarkimin e raportit të pushimeve';
      toast.error(errorMessage);
      throw error;
    }
  },
  
  // Download summary report
  downloadSummaryReport: async (params = {}) => {
    const { startDate, endDate } = params;
    set({ loading: true, downloadProgress: 0 });
    
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const response = await axios.get(`/reports/summary-excel?${queryParams.toString()}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ downloadProgress: progress });
        }
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'summary_report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Raporti përmbledhës u shkarkua me sukses!');
      set({ loading: false, downloadProgress: 0 });
      return true;
      
    } catch (error) {
      set({ loading: false, downloadProgress: 0 });
      const errorMessage = error.response?.data?.message || 'Gabim në shkarkimin e raportit përmbledhës';
      toast.error(errorMessage);
      throw error;
    }
  },
  
  // Reset store state
  reset: () => set({ loading: false, downloadProgress: 0 })
}));