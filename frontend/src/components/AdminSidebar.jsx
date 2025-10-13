import { useState, memo } from "react";
import { FiUsers, FiChevronLeft, FiChevronRight, FiLogOut, FiBarChart2, FiCalendar, FiBell, FiUserCheck } from "react-icons/fi";
import { DiellLogo } from 'diell-logo';
import { useUserStore } from "../stores/useUserStore";
import clsx from 'clsx';

const navigationItems = [
  { path: "/admin/users", id: "users", label: "Menaxhimi i përdoruesve", icon: FiUsers, description: "Menaxho llogaritë e përdoruesve" },
  { path: "/admin/pending-users", id: "pending-users", label: "Përdoruesit në Pritje", icon: FiUserCheck, description: "Prano kërkesa të reja" },
  { path: "/admin/notifications", id: "notifications", label: "Njoftimet", icon: FiBell, description: "Shiko njoftimet e fundit" },
  { path: "/admin/vacations", id: "vacations", label: "Kërkesat për Pushime", icon: FiCalendar, description: "Shqyrto kërkesat e punonjësve", adminOnly: true },
  { path: "/admin/managervacations", id: "managervacations", label: "Kërkesat për Pushime", icon: FiCalendar, description: "Shqyrto kërkesat e punonjësve", managerOnly: true },
  { path: "/admin/raportet", id: "raportet", label: "Raportet", icon: FiBarChart2, description: "Gjenero dhe shkarko raporte", adminOnly: true },
];

const NavItem = memo(({ item, isActive, onClick, isCollapsed }) => {
  const Icon = item.icon;
  return (
    <li>
      <button
        onClick={onClick}
        className={clsx(
          "w-full flex items-center gap-4 px-3 py-3 rounded-lg text-left transition-all duration-200 group relative",
          {
            'bg-cyan-500/10 text-cyan-400 font-semibold': isActive,
            'text-gray-400 hover:bg-gray-700/50 hover:text-white': !isActive,
            'justify-center': isCollapsed,
          }
        )}
        aria-label={item.label}
        title={isCollapsed ? item.label : ''}
      >
        {isActive && !isCollapsed && <div className="absolute left-0 top-0 h-full w-1 bg-cyan-500 rounded-r-full"></div>}
        <div className="relative">
          <Icon 
            size={22} 
            className={clsx('flex-shrink-0', {
              'text-cyan-500': isActive,
              'text-gray-500 group-hover:text-gray-300': !isActive
            })}
          />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className={clsx('text-xs truncate', isActive ? 'text-cyan-400/80' : 'text-gray-500')}>
                {item.description}
              </p>
            </div>
          </div>
        )}
      </button>
    </li>
  );
});

const AdminSidebar = ({ activeTab, onNavigate, isCollapsed, setIsCollapsed }) => {
    const { logout, user } = useUserStore();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const filteredNavigationItems = navigationItems.filter(item => {
        if (item.adminOnly && user?.role === 'manager') {
            return false;
        }
        if (item.managerOnly && user?.role === 'admin') {
            return false;
        }
        return true;
    });

    const handleLogout = async () => {
        if (window.confirm("Jeni i sigurt që doni të dilni?")) {
            setIsLoggingOut(true);
            try {
                await logout();
            } catch (error) {
                console.error("Dalja dështoi:", error);
            } finally {
                setIsLoggingOut(false);
            }
        }
    };

    const handleTabClick = (tabId) => {
        onNavigate(tabId);
    };

    return (
        <aside className={clsx(
            "bg-gray-800 border-r border-cyan-500/30 flex flex-col transition-all duration-300 ease-in-out",
            isCollapsed ? "w-20" : "w-72"
        )}>
            {/* Navigimi */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
                <nav>
                    <ul className="space-y-2">
                        {filteredNavigationItems.map((item) => (
                            <NavItem
                                key={item.id}
                                item={item}
                                isActive={activeTab === item.id}
                                onClick={() => handleTabClick(item.id)}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </ul>
                </nav>
            </div>

            {/* Fundi i faqes */}
            <div className="mt-auto border-t border-cyan-500/30 flex-shrink-0">
                <div className="space-y-2 p-2">
                    <button 
                        onClick={handleLogout} 
                        className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors group", 
                            isCollapsed && "justify-center"
                        )} 
                        aria-label="Dil" 
                        title="Dil" 
                        disabled={isLoggingOut}
                    >
                        <FiLogOut size={20} className="flex-shrink-0 text-gray-500 group-hover:text-red-500 transition-colors" />
                        {!isCollapsed && <span className="text-sm font-medium">{isLoggingOut ? "Duke dalë..." : "Dil"}</span>}
                    </button>
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-gray-400 hover:bg-gray-700 hover:text-white transition-colors", 
                            isCollapsed && "justify-center"
                        )} 
                        aria-label={isCollapsed ? "Zgjero panelin" : "Zvogëlo panelin"} 
                        title={isCollapsed ? "Zgjero panelin" : "Zvogëlo panelin"}
                    >
                        {isCollapsed ? <FiChevronRight size={20} className="flex-shrink-0" /> : <FiChevronLeft size={20} className="flex-shrink-0" />}
                        {!isCollapsed && <span className="text-sm font-medium">Zvogëlo</span>}
                    </button>
                </div>
                <div className="p-2 border-t border-cyan-500/30 flex justify-center items-center">
                    <a target="_blank" href="https://www.diell.pro" rel="noopener noreferrer">
                        <DiellLogo size={50} primaryColor="#ffd700" secondaryColor="#ffed4e" />
                    </a>
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar