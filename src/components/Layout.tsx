import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900">
      {/* Header */}
      <header className="bg-slate-800/90 backdrop-blur-sm shadow-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-400 to-green-500 p-2 rounded-lg shadow-lg">
                <img 
                  src="https://thebackroomop.com/hs-fs/hubfs/The%20Back%20Room%20Logo%20WHT_optimised.png?width=100&height=94&name=The%20Back%20Room%20Logo%20WHT_optimised.png" 
                  alt="The Backroom Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">The Backroom</h1>
                <p className="text-sm text-slate-300">OJT Daily Time Record</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700/50 p-2 rounded-lg">
                  {user?.role === 'admin' ? (
                    <Settings className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <User className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-slate-400">{user?.department}</p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
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