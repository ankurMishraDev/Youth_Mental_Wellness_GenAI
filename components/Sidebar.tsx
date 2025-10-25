'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  MessageCircle,
  BookOpen,
  BookText,
  User as UserIcon,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type DashboardPage = 'home' | 'sessions' | 'resources' | 'profile' | 'journal';

interface SidebarProps {
  dashboardPage?: DashboardPage;
  setDashboardPage?: (page: DashboardPage) => void;
  handleLogout?: () => void;
  onNavigateToLanding?: () => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  dashboardPage,
  setDashboardPage,
  handleLogout,
  onNavigateToLanding,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(sidebarOpen || false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Determine active page based on pathname if dashboardPage not provided
  const getActivePage = (): DashboardPage => {
    if (dashboardPage) return dashboardPage;
    
    if (pathname?.startsWith('/journal')) return 'journal';
    if (pathname?.startsWith('/dashboard/sessions')) return 'sessions';
    if (pathname?.startsWith('/dashboard/resources')) return 'resources';
    if (pathname?.startsWith('/dashboard/profile')) return 'profile';
    if (pathname?.startsWith('/dashboard')) return 'home';
    return 'home';
  };

  const activePage = getActivePage();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
    { id: 'sessions', label: 'AI Session', icon: MessageCircle, path: '/dashboard/sessions' },
    { id: 'resources', label: 'Resources', icon: BookOpen, path: '/dashboard/resources' },
    { id: 'journal', label: 'Journal', icon: BookText, path: '/journal' },
    { id: 'profile', label: 'Profile', icon: UserIcon, path: '/dashboard/profile' },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    // Use Next.js router for navigation
    router.push(item.path);
    
    // Also call setDashboardPage if provided (for backward compatibility)
    if (setDashboardPage) {
      setDashboardPage(item.id as DashboardPage);
    }
    
    // Close mobile menu after navigation
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const toggleMobileSidebar = () => {
    const newState = !isMobileOpen;
    setIsMobileOpen(newState);
    if (setSidebarOpen) setSidebarOpen(newState);
  };

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed(!isDesktopCollapsed);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-40
          bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl
          border-r border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo/Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                if (onNavigateToLanding) {
                  onNavigateToLanding();
                } else {
                  router.push('/');
                }
              }}
              className={`flex items-center gap-3 transition-opacity ${
                isDesktopCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'
              }`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              {!isDesktopCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  CureZ
                </span>
              )}
            </button>

            {/* Desktop Collapse Button */}
            <button
              onClick={toggleDesktopCollapse}
              className="hidden lg:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isDesktopCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${isDesktopCollapsed ? 'lg:justify-center' : ''}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isDesktopCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={() => {
              if (handleLogout) {
                handleLogout();
              } else {
                router.push('/');
              }
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-red-600 dark:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20
              transition-all duration-200
              ${isDesktopCollapsed ? 'lg:justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isDesktopCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
