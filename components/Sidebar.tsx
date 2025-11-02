'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  BarChart3,
  Stethoscope,
} from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import type { DashboardPage } from '@/lib/types';

interface SidebarProps {
  dashboardPage?: DashboardPage;
  setDashboardPage?: (page: DashboardPage) => void;
  onNavigateToLanding?: () => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  handleLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  dashboardPage,
  setDashboardPage,
  onNavigateToLanding,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const pathname = usePathname();
  const { logout } = useUser();
  const [isMobileOpen, setIsMobileOpen] = useState(sidebarOpen || false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Determine active page based on pathname if dashboardPage not provided
  const getActivePage = (): DashboardPage => {
    if (dashboardPage) return dashboardPage;
    
    if (pathname?.startsWith('/journal')) return 'journal';
    if (pathname?.startsWith('/dashboard/consultants')) return 'consultants';
    if (pathname?.startsWith('/dashboard/sessions')) return 'sessions';
    if (pathname?.startsWith('/dashboard/analytics')) return 'analytics';
    if (pathname?.startsWith('/dashboard/resources')) return 'resources';
    if (pathname?.startsWith('/dashboard/profile')) return 'profile';
    if (pathname?.startsWith('/dashboard')) return 'home';
    return 'home';
  };

  const activePage = getActivePage();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
    { id: 'sessions', label: 'AI Session', icon: MessageCircle, path: '/dashboard/sessions' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    { id: 'resources', label: 'Resources', icon: BookOpen, path: '/dashboard/resources' },
    { id: 'journal', label: 'Journal', icon: BookText, path: '/journal' },
    { id: 'consultants', label: 'Consultants', icon: Stethoscope, path: '/dashboard/consultants' },
    { id: 'profile', label: 'Profile', icon: UserIcon, path: '/dashboard/profile' },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    // Call setDashboardPage if provided (for backward compatibility)
    if (setDashboardPage) {
      setDashboardPage(item.id as DashboardPage);
    }
    
    // Close mobile menu after navigation
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-foreground" />
        ) : (
          <Menu className="w-6 h-6 text-foreground" />
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
          bg-sidebar/80 backdrop-blur-xl
          border-r border-sidebar-border
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
            <Link
              href="/"
              onClick={() => {
                if (onNavigateToLanding) {
                  onNavigateToLanding();
                }
              }}
              className={`flex items-center gap-3 transition-opacity ${
                isDesktopCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'
              }`}
              prefetch={true}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              {!isDesktopCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  CureZ
                </span>
              )}
            </Link>

            {/* Desktop Collapse Button */}
            <button
              onClick={toggleDesktopCollapse}
              className="hidden lg:block p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isDesktopCollapsed ? (
                <ChevronRight className="w-5 h-5 text-sidebar-foreground/60" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-sidebar-foreground/60" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={() => handleNavigation(item)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }
                    ${isDesktopCollapsed ? 'lg:justify-center' : ''}
                  `}
                  prefetch={true}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isDesktopCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-destructive
              hover:bg-destructive/10
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isDesktopCollapsed ? 'lg:justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isDesktopCollapsed && (
              <span className="font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
