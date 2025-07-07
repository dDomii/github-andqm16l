import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from './UserManagement';
import { OvertimeApproval } from './OvertimeApproval';
import { PayrollReports } from './PayrollReports';
import { LiveReports } from './LiveReports';
import { 
  Users, 
  Clock, 
  DollarSign, 
  Settings,
  Activity,
  Calendar
} from 'lucide-react';

type TabType = 'users' | 'overtime' | 'payroll' | 'live-reports';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingOvertime: 0,
    thisWeekPayroll: 0
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch('http://192.168.100.60:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersResponse.json();
      
      // Fetch overtime requests
      const overtimeResponse = await fetch('http://192.168.100.60:3001/api/overtime-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const overtimeRequests = await overtimeResponse.json();

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.active).length,
        pendingOvertime: overtimeRequests.length,
        thisWeekPayroll: 0 // This would be calculated based on current week
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'overtime', label: 'Overtime Approval', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'live-reports', label: 'Live Reports', icon: Activity }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">Manage users, approve overtime, and generate payroll reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active Users</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.activeUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Pending Overtime</p>
              <p className="text-2xl font-bold text-orange-400">{stats.pendingOvertime}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">This Week</p>
              <p className="text-2xl font-bold text-purple-400">₱{stats.thisWeekPayroll}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50">
        <div className="border-b border-slate-700/50">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'overtime' && <OvertimeApproval />}
          {activeTab === 'payroll' && <PayrollReports />}
          {activeTab === 'live-reports' && <LiveReports />}
        </div>
      </div>
    </div>
  );
}