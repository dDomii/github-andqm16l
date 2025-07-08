import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, User, Calendar, RefreshCw } from 'lucide-react';

interface ActiveUser {
  id: number;
  username: string;
  department: string;
  clock_in: string;
}

const DEPARTMENTS = [
  'Human Resource',
  'Marketing', 
  'Finance',
  'Account Management',
  'System Automation',
  'Sales',
  'Training',
  'IT Department'
];

const DEPARTMENT_COLORS = {
  'Human Resource': 'text-orange-400',
  'Marketing': 'text-gray-400',
  'Finance': 'text-sky-400',
  'Account Management': 'text-yellow-400',
  'System Automation': 'text-green-400',
  'Sales': 'text-pink-400',
  'Training': 'text-cyan-400',
  'IT Department': 'text-purple-400'
};

export function LiveReports() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchActiveUsers();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const refreshTimer = setInterval(() => {
      fetchActiveUsers();
    }, 30000); // Auto-refresh every 30 seconds

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const fetchActiveUsers = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('http://192.168.100.60:3001/api/active-users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setActiveUsers(data);
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
    setIsRefreshing(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateCurrentTime = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const diff = currentTime.getTime() - clockInTime.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const isOvertimeHours = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const shiftEnd = new Date(clockInTime);
    shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM
    return currentTime > shiftEnd;
  };

  const formatTimeDisplay = (time: { hours: number; minutes: number }) => {
    return `${time.hours}h ${time.minutes}m`;
  };

  // Group users by department
  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = activeUsers.filter(user => user.department === dept);
    return acc;
  }, {} as Record<string, ActiveUser[]>);

  const totalActiveUsers = activeUsers.length;
  const usersInOvertime = activeUsers.filter(user => isOvertimeHours(user.clock_in)).length;
  const totalHoursWorked = activeUsers.reduce((sum, user) => {
    const time = calculateCurrentTime(user.clock_in);
    return sum + time.hours + (time.minutes / 60);
  }, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Reports</h2>
          <p className="text-slate-400">Real-time tracking of active employees by department</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchActiveUsers}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-right">
            <p className="text-sm text-slate-400">Current Time</p>
            <p className="text-lg font-semibold text-white">{formatCurrentTime()}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Currently Active</p>
              <p className="text-2xl font-bold text-emerald-400">{totalActiveUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">In Overtime</p>
              <p className="text-2xl font-bold text-orange-400">{usersInOvertime}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Hours</p>
              <p className="text-2xl font-bold text-blue-400">{totalHoursWorked.toFixed(1)}h</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Estimated Pay</p>
              <p className="text-2xl font-bold text-purple-400">₱{(totalHoursWorked * 25).toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
              <span className="text-purple-400 font-bold text-lg">₱</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Columns */}
      {activeUsers.length > 0 ? (
        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {DEPARTMENTS.map((department) => {
            const deptUsers = groupedUsers[department];
            const deptOvertimeUsers = deptUsers.filter(user => isOvertimeHours(user.clock_in)).length;
            const colorClass = DEPARTMENT_COLORS[department];

            return (
              <div key={department} className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50">
                <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600/50">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${colorClass}`}>{department}</h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-800/50">
                        {deptUsers.length}
                      </span>
                      {deptOvertimeUsers > 0 && (
                        <span className="bg-orange-900/20 text-orange-400 px-2 py-1 rounded-full text-xs font-medium border border-orange-800/50">
                          {deptOvertimeUsers} OT
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                  {deptUsers.length > 0 ? (
                    deptUsers.map((user) => {
                      const currentTime = calculateCurrentTime(user.clock_in);
                      const inOvertime = isOvertimeHours(user.clock_in);
                      
                      return (
                        <div key={user.id} className="p-3 hover:bg-slate-700/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${inOvertime ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/20' : 'bg-gradient-to-br from-emerald-500/20 to-green-600/20'}`}>
                                <User className={`w-3 h-3 ${inOvertime ? 'text-orange-400' : 'text-emerald-400'}`} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-white text-sm truncate">{user.username}</h4>
                                <p className="text-xs text-slate-400">ID: {user.id}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-xs text-slate-400">In: {formatTime(user.clock_in)}</p>
                              <p className={`text-sm font-semibold ${inOvertime ? 'text-orange-400' : 'text-blue-400'}`}>
                                {formatTimeDisplay(currentTime)}
                              </p>
                              {inOvertime && (
                                <p className="text-xs text-orange-500">Overtime</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center">
                      <div className="bg-slate-700/30 p-2 rounded-full w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-400">No active users</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Activity className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Active Users</h3>
          <p className="text-slate-400">No employees are currently clocked in.</p>
        </div>
      )}
    </div>
  );
}