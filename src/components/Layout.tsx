import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-none p-2 rounded-lg">
                <img 
                  src="https://thebackroomop.com/hs-fs/hubfs/The%20Back%20Room%20Logo%20WHT_optimised.png?width=100&height=94&name=The%20Back%20Room%20Logo%20WHT_optimised.png" 
                  alt="The Backroom Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">The Backroom</h1>
                <p className="text-sm text-gray-300">OJT Daily Time Record</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-700 p-2 rounded-lg">
                  {user?.role === 'admin' ? (
                    <Settings className="w-5 h-5 text-gray-300" />
                  ) : (
                    <User className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-gray-400">{user?.department}</p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}