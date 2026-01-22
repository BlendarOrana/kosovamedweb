import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import QRGeneratorPage from "./pages/QRGeneratorPage.jsx"; // IMPORT ADDED
import { useUserStore } from "./stores/useUserStore";
import LoadingSpinner from "./components/LoadingSpinner";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// ScrollToTop component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function App() {
  const { user, checkAuth, checkingAuth, loading, loadingShops } = useUserStore();
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading spinner while checking auth or loading user data
  if (checkingAuth || (user && (user.role === 'admin' || user.role === 'manager') && loadingShops)) {
    return <LoadingSpinner  />;
  }

  // Also show loading during login process
  if (loading) {
    return <LoadingSpinner  />;
  }

  // Helper function to get the default route for authenticated users
  const getDefaultRouteForUser = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case "admin":
      case "manager":
        return "/admin";
     
      default:
        return "/";
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden'>
      {/* Background gradient */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute inset-0'>
          <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(79,192,238,0.2)_0%,rgba(232,245,253,0.1)_45%,rgba(255,255,255,0)_100%)]' />
        </div>
      </div>

      <div className='relative z-50'>
        <ScrollToTop />
        <Routes>
        
          {/* Home Route - Default page for unauthenticated users */}
          <Route 
            path="/" 
            element={
              !user ? <LoginPage /> : <Navigate to={getDefaultRouteForUser()} replace />
            }
          />
           
           {/* Privacy Policy - Public Route */}
           <Route 
             path="/privacy-policy" 
             element={<PrivacyPolicy />} 
           />

           {/* Reset Password - Public Route */}
           <Route 
            path="/reset-password/:id/:token" 
            element={<ResetPassword />} 
          />

          {/* Admin Route - Only accessible to admin users */}
          <Route 
            path="/admin" 
            element={
              user ? 
                (user.role === "admin" || user.role ==='manager' ? <AdminDashboard /> : <Navigate to={getDefaultRouteForUser()} replace />) 
                : <Navigate to="/" replace />
            } 
          />

          <Route 
            path="/qr-generator" 
            element={<QRGeneratorPage />} 
          />

          {/* Dashboard Redirect */}
          <Route 
            path="/dashboard" 
            element={
              user ? <Navigate to={getDefaultRouteForUser()} replace /> : <Navigate to="/" replace />
            } 
          />
          
          {/* Catch-all redirect - Redirects unknown paths to appropriate default */}
          <Route 
            path="*" 
            element={<Navigate to={user ? getDefaultRouteForUser() : "/"} replace />} 
          />
        </Routes>
      </div>
      
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#F8FAFC',
            color: '#334155',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #E2E8F0'
          },
        }}
      />
    </div>
  );
}

export default App;