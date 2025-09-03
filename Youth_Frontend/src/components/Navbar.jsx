import React, { useState } from "react";
import { Menu, X, User, Bell, Search } from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white font-black text-sm">YA</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Youth-foundary</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Dashboard
            </button>
            <button className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Ask Questions
            </button>
            <button className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              My Goals
            </button>
            <button className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Resources
            </button>
            <button className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Community
            </button>
          </div>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors w-64"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  AJ
                </div>
                <span className="text-sm font-medium">Alex Johnson</span>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    Privacy Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    Help & Support
                  </button>
                  <hr className="my-2 border-slate-200" />
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4">
            <div className="grid gap-2">
              <button className="text-left px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                Dashboard
              </button>
              <button className="text-left px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                Ask Questions
              </button>
              <button className="text-left px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                My Goals
              </button>
              <button className="text-left px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                Resources
              </button>
              <button className="text-left px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                Community
              </button>
              
              {/* Mobile Search */}
              <div className="px-4 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              {/* Mobile Profile Section */}
              <div className="px-4 py-2 border-t border-slate-200 mt-2 pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    AJ
                  </div>
                  <span className="text-sm font-medium text-slate-900">Alex Johnson</span>
                  <button className="ml-auto p-1 text-slate-600 hover:text-slate-900">
                    <Bell className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      3
                    </span>
                  </button>
                </div>
                <div className="grid gap-1">
                  <button className="text-left px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors">
                    Profile Settings
                  </button>
                  <button className="text-left px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors">
                    Privacy Settings
                  </button>
                  <button className="text-left px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded transition-colors">
                    Help & Support
                  </button>
                  <button className="text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}