import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useReportsStore = create((set, get) => ({
  loading: false,
  downloadProgress: 0,
  
  // Download attendance report
  downloadAttendanceReport: async (params = {}) => {
    const { startDate, endDate, username, region, title } = params;
    set({ loading: true, downloadProgress: 0 });
    
    try {
      // Create query string
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (username) queryParams.append('username', username);
      if (region) queryParams.append('region', region);
      if (title) queryParams.append('title', title);
      
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
    const { status, username, region, title } = params;
    set({ loading: true, downloadProgress: 0 });
    
    try {
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      if (username) queryParams.append('username', username);
      if (region) queryParams.append('region', region);
      if (title) queryParams.append('title', title);
      
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
  

  // Download contract termination PDF
downloadContractTerminationPDF: async (userId) => {
  set({ loading: true, downloadProgress: 0 });
  
  try {
    const response = await axios.get(`/reports/contract-termination-pdf?userId=${userId}`, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        set({ downloadProgress: progress });
      }
    });
    
    const blob = new Blob([response.data], { 
      type: 'application/pdf' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'contract_termination.pdf';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) filename = filenameMatch[1];
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF-ja e ndërprerjes së kontratës u shkarkua me sukses!');
    set({ loading: false, downloadProgress: 0 });
    return true;
    
  } catch (error) {
    set({ loading: false, downloadProgress: 0 });
    const errorMessage = error.response?.data?.message || 'Gabim në shkarkimin e PDF-së';
    toast.error(errorMessage);
    throw error;
  }
},


// Download employment certificate PDF
downloadEmploymentCertificatePDF: async (userId) => {
  set({ loading: true, downloadProgress: 0 });
  
  try {
    const response = await axios.get(`/reports/employment-certificate-pdf?userId=${userId}`, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        set({ downloadProgress: progress });
      }
    });
    
    const blob = new Blob([response.data], { 
      type: 'application/pdf' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'employment_certificate.pdf';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) filename = filenameMatch[1];
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('Vërtetimi i punësimit u shkarkua me sukses!');
    set({ loading: false, downloadProgress: 0 });
    return true;
    
  } catch (error) {
    set({ loading: false, downloadProgress: 0 });
    const errorMessage = error.response?.data?.message || 'Gabim në shkarkimin e vërtetimit';
    toast.error(errorMessage);
    throw error;
  }
},

  
  // Reset store state
  reset: () => set({ loading: false, downloadProgress: 0 })
}));