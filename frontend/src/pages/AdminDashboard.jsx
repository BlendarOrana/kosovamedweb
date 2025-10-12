import { useState, useEffect, useMemo } from "react";
import UserManagement from "../components/UserManagement";
import Reports from "../components/Reports";
import AdminSidebar from "../components/AdminSidebar";
import VacationManagement from "../components/VacationManagement";
import ManagerVacationManagement from "../components/ManagerVacationManagement";
import PendingUsers from "../components/PendingUser";
import Notifications from "../components/Notifications";
import { useUserStore } from "../stores/useUserStore";

// UPDATED: Added adminOnly flag and separate routes for admin vs manager
const adminRoutes = [
  { path: "/admin/users", id: "users", label: "Menaxhimi i Përdoruesve", fullScreen: false  },
  { path: "/admin/notifications", id: "notifications", label: "Njoftimet", fullScreen: false, adminOnly: false },
  { path: "/admin/vacations", id: "vacations", label: "Kërkesat për Pushime", fullScreen: false  },
    { path: "/admin/pending-users", id: "pending-users", label: "Usera te ri", fullScreen: false  },

  { path: "/admin/managervacations", id: "managervacations", label: "Kërkesat për Pushime", fullScreen: false, managerOnly: true },
  { path: "/admin/raportet", id: "raportet", label: "Raportet", fullScreen: false,adminOnly: true },
];

const AdminDashboard = () => {
  const { user } = useUserStore();
  
  const [activeTab, setActiveTab] = useState("notifications");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter routes based on user role - use useMemo to prevent unnecessary recalculations
  const availableRoutes = useMemo(() => {
    return adminRoutes.filter(route => {
      if (route.adminOnly && user?.role === 'manager') {
        return false;
      }
      return true;
    });
  }, [user?.role]);

  const getTabIdFromPath = (path) => {
    const route = availableRoutes.find(r => r.path === path);
    return route ? route.id : (availableRoutes[0]?.id || 'notifications');
  };

  const navigateToRoute = (tabId) => {
    const route = availableRoutes.find(r => r.id === tabId);
    if (route && window.location.pathname !== route.path) {
      window.history.pushState({}, '', route.path);
      setActiveTab(tabId);
    }
  };

  useEffect(() => {
    const currentTabId = getTabIdFromPath(window.location.pathname);
    setActiveTab(currentTabId);
  }, [user]);

  useEffect(() => {
    const handlePopState = () => {
      const currentTabId = getTabIdFromPath(window.location.pathname);
      setActiveTab(currentTabId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const currentRoute = availableRoutes.find(r => r.id === activeTab) || availableRoutes[0];

  const renderContent = () => {
    // Check if user has access to this tab
    const hasAccess = availableRoutes.some(r => r.id === activeTab);
    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Qasje e Refuzuar</h2>
            <p className="text-gray-600">Nuk keni të drejta për të parë këtë faqe.</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'notifications':
        return <Notifications />;
      case 'vacations':
        return <VacationManagement />;
        case 'managervacations':
        return<ManagerVacationManagement/>;
        case 'pending-users':
          return<PendingUsers/>
      case 'raportet':
        return <Reports />;
      default:
        return <Notifications />;
    }
  };

  if (currentRoute?.fullScreen) {
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