import { useState, useEffect } from "react";
import UserManagement from "../components/UserManagement";
import Reports from "../components/Reports";
import AdminSidebar from "../components/AdminSidebar";
import VacationManagement from "../components/VacationManagement";
import Notifications from "../components/Notifications"; // <-- IMPORT THE NEW COMPONENT
import { useUserStore } from "../stores/useUserStore";
import { useNotificationStore } from "../stores/useNotificationStore"; // Import notification store

// UPDATED: Added the new route for notifications
const adminRoutes = [
  { path: "/admin/users", id: "users", label: "Menaxhimi i Përdoruesve", fullScreen: false },
  { path: "/admin/notifications", id: "notifications", label: "Njoftimet", fullScreen: false },
  { path: "/admin/vacations", id: "vacations", label: "Kërkesat për Pushime", fullScreen: false },
  { path: "/admin/raportet", id: "raportet", label: "Raportet", fullScreen: false },
];

const AdminDashboard = () => {
  const { user } = useUserStore();
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications); // Get fetch function
  
  const [activeTab, setActiveTab] = useState("users");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if(user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications])

  const getTabIdFromPath = (path) => {
    const route = adminRoutes.find(r => r.path === path);
    return route ? route.id : 'users';
  };

  const navigateToRoute = (tabId) => {
    const route = adminRoutes.find(r => r.id === tabId);
    if (route && window.location.pathname !== route.path) {
      window.history.pushState({}, '', route.path);
      setActiveTab(tabId);
    }
  };

  useEffect(() => {
    const currentTabId = getTabIdFromPath(window.location.pathname);
    setActiveTab(currentTabId);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const currentTabId = getTabIdFromPath(window.location.pathname);
      setActiveTab(currentTabId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const currentRoute = adminRoutes.find(r => r.id === activeTab) || adminRoutes[0];

  // UPDATED: Add a case to render the new component
  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'notifications':
        return <Notifications />;
      case 'vacations':
        return <VacationManagement />;
      case 'raportet':
        return <Reports />;
      default:
        return <UserManagement />;
    }
  };

  if (currentRoute.fullScreen) {
    return renderContent();
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar 
        activeTab={activeTab}
        onNavigate={navigateToRoute}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="min-h-[calc(100vh-200px)]">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;