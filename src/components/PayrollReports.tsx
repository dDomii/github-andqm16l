import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, PhilippinePeso, FileText, AlertCircle, Edit2, Save, X, Eye, Users, CheckSquare, Square } from 'lucide-react';

interface PayrollEntry {
  id: number;
  username: string;
  department: string;
  total_hours: number;
  overtime_hours: number;
  undertime_hours: number;
  base_salary: number;
  overtime_pay: number;
  undertime_deduction: number;
  staff_house_deduction: number;
  total_salary: number;
  week_start: string;
  week_end: string;
  clock_in_time: string;
  clock_out_time: string;
}

interface User {
  id: number;
  username: string;
  department: string;
  active: boolean;
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

export function PayrollReports() {
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PayrollEntry>>({});
  const [activeTab, setActiveTab] = useState<'generate' | 'preview'>('generate');
  const [generationMode, setGenerationMode] = useState<'range' | 'specific'>('range');
  const { token } = useAuth();

  useEffect(() => {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    const currentWeekEnd = getWeekEnd(today);
    setStartDate(currentWeekStart);
    setEndDate(currentWeekEnd);
    // Initialize with current week dates
    const weekDates = generateDateRange(currentWeekStart, currentWeekEnd);
    setSelectedDates(weekDates);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://192.168.100.60:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data.filter((user: User) => user.active));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const getWeekEnd = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 6;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const generatePayslips = async () => {
    if (selectedDates.length === 0) return;
    
    setLoading(true);
    setError('');
    try {
      const requestBody: any = {};
      
      requestBody.selectedDates = selectedDates;
      if (selectedUsers.length > 0) {
        requestBody.userIds = selectedUsers;
      }

      const response = await fetch('http://192.168.100.60:3001/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.error) {
          setError(data.error);
        } else {
          // Show success message
          console.log('Payslips generated:', data);
          await fetchPayrollReport();
          setActiveTab('preview');
        }
      } else {
        setError(data.message || 'Failed to generate payslips');
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
      setError('Failed to generate payslips');
    }
    setLoading(false);
  };

  const fetchPayrollReport = async () => {
    if (selectedDates.length === 0) return;
    
    setLoading(true);
    try {
      let url = 'http://192.168.100.60:3001/api/payroll-report';
      // For specific dates, pass them as a comma-separated string
      url += `?selectedDates=${selectedDates.join(',')}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('Payroll report data:', data);
      setPayrollData(data);
    } catch (error) {
      console.error('Error fetching payroll report:', error);
      setError('Failed to fetch payroll report');
    }
    setLoading(false);
  };

  const handleEdit = (entry: PayrollEntry) => {
    setEditingEntry(entry.id);
    setEditData({
      clock_in_time: entry.clock_in_time ? new Date(entry.clock_in_time).toISOString().slice(0, 16) : '',
      clock_out_time: entry.clock_out_time ? new Date(entry.clock_out_time).toISOString().slice(0, 16) : '',
      total_hours: entry.total_hours,
      overtime_hours: entry.overtime_hours,
      undertime_hours: entry.undertime_hours,
      base_salary: entry.base_salary,
      overtime_pay: entry.overtime_pay,
      undertime_deduction: entry.undertime_deduction,
      staff_house_deduction: entry.staff_house_deduction
    });
  };

  const handleSave = async (entryId: number) => {
    try {
      const response = await fetch(`http://192.168.100.60:3001/api/payroll/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clockIn: editData.clock_in_time,
          clockOut: editData.clock_out_time,
          totalHours: editData.total_hours,
          overtimeHours: editData.overtime_hours,
          undertimeHours: editData.undertime_hours,
          baseSalary: editData.base_salary,
          overtimePay: editData.overtime_pay,
          undertimeDeduction: editData.undertime_deduction,
          staffHouseDeduction: editData.staff_house_deduction
        }),
      });

      if (response.ok) {
        setEditingEntry(null);
        setEditData({});
        fetchPayrollReport();
      } else {
        alert('Failed to update payroll entry');
      }
    } catch (error) {
      console.error('Error updating payroll entry:', error);
      alert('Failed to update payroll entry');
    }
  };

  const handleCancel = () => {
    setEditingEntry(null);
    setEditData({});
  };

  const handleDateToggle = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date].sort()
    );
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const generateDateRange = (start: string, end: string) => {
    const dates = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const exportToCSV = () => {
    if (payrollData.length === 0) return;

    // Group by department
    const groupedData = DEPARTMENTS.reduce((acc, dept) => {
      acc[dept] = payrollData.filter(entry => entry.department === dept);
      return acc;
    }, {} as Record<string, PayrollEntry[]>);

    const headers = [
      'Department',
      'Employee',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Overtime Hours',
      'Undertime Hours',
      'Base Salary (₱)',
      'Overtime Pay (₱)',
      'Undertime Deduction (₱)',
      'Staff House Deduction (₱)',
      'Total Salary (₱)',
      'Period Start',
      'Period End'
    ];

    const csvRows = [headers];

    // Add data organized by department
    DEPARTMENTS.forEach(dept => {
      const deptEntries = groupedData[dept];
      if (deptEntries.length > 0) {
        deptEntries.forEach(entry => {
          const row = [
            entry.department,
            entry.username,
            formatTime(entry.clock_in_time),
            formatTime(entry.clock_out_time),
            entry.total_hours.toFixed(2),
            entry.overtime_hours.toFixed(2),
            entry.undertime_hours.toFixed(2),
            entry.base_salary.toFixed(2),
            entry.overtime_pay.toFixed(2),
            entry.undertime_deduction.toFixed(2),
            entry.staff_house_deduction.toFixed(2),
            entry.total_salary.toFixed(2),
            entry.week_start,
            entry.week_end
          ];
          csvRows.push(row);
        });
      }
    });

    const csvContent = csvRows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const filename = generationMode === 'specific' 
      ? `payroll_report_selected_days_${selectedDates[0]}_to_${selectedDates[selectedDates.length - 1]}.csv`
      : `payroll_report_selected_days.csv`;
    
    link.download = filename;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return `₱${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalSalary = payrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
  const totalOvertime = payrollData.reduce((sum, entry) => sum + (parseFloat(entry.overtime_pay) || 0), 0);
  const totalDeductions = payrollData.reduce((sum, entry) => sum + (parseFloat(entry.undertime_deduction) || 0) + (parseFloat(entry.staff_house_deduction) || 0), 0);

  // Group payroll data by department
  const groupedPayrollData = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = payrollData.filter(entry => entry.department === dept);
    return acc;
  }, {} as Record<string, PayrollEntry[]>);

  // Group users by department
  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = users.filter(user => user.department === dept);
    return acc;
  }, {} as Record<string, User[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll Management</h2>
          <p className="text-slate-400">Generate and manage employee payroll with flexible date selection</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'generate'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Generate Payslips
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'preview'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Payslip Preview
          </button>
        </div>
      </div>

      {activeTab === 'generate' && (
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
          {/* Generation Mode Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Generation Mode</h3>
            <p className="text-slate-400 text-center">Select specific working days to generate payslips</p>
          </div>

          <div className="space-y-6">
            {/* Date Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Specific Days
                </label>
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                  <div className="flex gap-4 mb-4">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                    />
                    <span className="text-slate-400 self-center">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                    />
                    <button
                      onClick={() => {
                        if (startDate && endDate) {
                          const dates = generateDateRange(startDate, endDate);
                          setSelectedDates(dates);
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Select All Days
                    </button>
                    <button
                      onClick={() => setSelectedDates([])}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {startDate && endDate && (
                    <div className="grid grid-cols-7 gap-2">
                      {generateDateRange(startDate, endDate).map(date => (
                        <button
                          key={date}
                          onClick={() => handleDateToggle(date)}
                          className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedDates.includes(date)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-600/50 text-slate-300 hover:bg-slate-500/50'
                          }`}
                        >
                          {new Date(date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {selectedDates.length > 0 && (
                    <div className="mt-4 p-3 bg-emerald-900/20 rounded-lg border border-emerald-800/50">
                      <p className="text-emerald-400 text-sm">
                        <strong>{selectedDates.length} days selected:</strong> {selectedDates.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Users (Optional - leave empty for all users)
                </label>
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50 max-h-64 overflow-y-auto">
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setSelectedUsers(users.map(u => u.id))}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {DEPARTMENTS.map(dept => {
                    const deptUsers = groupedUsers[dept];
                    if (deptUsers.length === 0) return null;
                    
                    return (
                      <div key={dept} className="mb-4">
                        <h4 className="text-slate-300 font-medium mb-2">{dept}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {deptUsers.map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleUserToggle(user.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-200 ${
                                selectedUsers.includes(user.id)
                                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50'
                                  : 'bg-slate-600/30 text-slate-300 hover:bg-slate-500/30'
                              }`}
                            >
                              {selectedUsers.includes(user.id) ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                              {user.username}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedUsers.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
                    <p className="text-blue-400 text-sm">
                      <strong>{selectedUsers.length} users selected</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={generatePayslips}
                  disabled={loading || selectedDates.length === 0}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <FileText className="w-4 h-4" />
                  {loading ? 'Generating...' : 'Generate Payslips'}
                </button>
                <button
                  onClick={fetchPayrollReport}
                  disabled={selectedDates.length === 0}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <Eye className="w-4 h-4" />
                  Load Report
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <>
          {/* Summary Cards */}
          {payrollData.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Total Employees</p>
                  <p className="text-2xl font-bold text-emerald-400">{payrollData.length}</p>
                </div>
              </div>
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Total Salary</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalSalary)}</p>
                </div>
              </div>
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Overtime Pay</p>
                  <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalOvertime)}</p>
                </div>
              </div>
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
                <div className="text-center">
                  <p className="text-sm text-slate-400">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDeductions)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          {payrollData.length > 0 && (
            <div className="flex justify-end mb-6">
              <button
                onClick={exportToCSV}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          )}

          {/* Payroll Table by Department */}
          {payrollData.length > 0 ? (
            <div className="space-y-6">
              {DEPARTMENTS.map((department) => {
                const deptData = groupedPayrollData[department];
                if (deptData.length === 0) return null;

                const deptTotal = deptData.reduce((sum, entry) => sum + (parseFloat(entry.total_salary) || 0), 0);

                return (
                  <div key={department} className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
                    <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">{department}</h3>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">{deptData.length} employees</p>
                          <p className="text-lg font-bold text-emerald-400">{formatCurrency(deptTotal)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-slate-700/30">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Employee</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">Clock In/Out</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-300">Hours</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-300">Overtime</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-300">Base Pay</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-300">Overtime Pay</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-300">Deductions</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-300">Total</th>
                            <th className="text-center py-3 px-4 font-semibold text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {deptData.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-white">{entry.username}</p>
                                  <p className="text-sm text-slate-400">
                                    {formatDate(entry.week_start)} - {formatDate(entry.week_end)}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {editingEntry === entry.id ? (
                                  <div className="space-y-2">
                                    <input
                                      type="datetime-local"
                                      value={editData.clock_in_time || ''}
                                      onChange={(e) => setEditData({ ...editData, clock_in_time: e.target.value })}
                                      className="w-full text-xs px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-white"
                                    />
                                    <input
                                      type="datetime-local"
                                      value={editData.clock_out_time || ''}
                                      onChange={(e) => setEditData({ ...editData, clock_out_time: e.target.value })}
                                      className="w-full text-xs px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-white"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-sm">
                                    <p className="text-slate-300">In: {formatTime(entry.clock_in_time)}</p>
                                    <p className="text-slate-400">Out: {formatTime(entry.clock_out_time)}</p>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {editingEntry === entry.id ? (
                                  <div className="space-y-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.total_hours || ''}
                                      onChange={(e) => setEditData({ ...editData, total_hours: parseFloat(e.target.value) || 0 })}
                                      className="w-16 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.undertime_hours || ''}
                                      onChange={(e) => setEditData({ ...editData, undertime_hours: parseFloat(e.target.value) || 0 })}
                                      className="w-16 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-white">{(parseFloat(entry.total_hours) || 0).toFixed(2)}h</p>
                                    {(parseFloat(entry.undertime_hours) || 0) > 0 && (
                                      <p className="text-sm text-red-400">-{(parseFloat(entry.undertime_hours) || 0).toFixed(2)}h</p>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-orange-400">
                                {editingEntry === entry.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editData.overtime_hours || ''}
                                    onChange={(e) => setEditData({ ...editData, overtime_hours: parseFloat(e.target.value) || 0 })}
                                    className="w-16 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                  />
                                ) : (
                                  (parseFloat(entry.overtime_hours) || 0) > 0 ? `${(parseFloat(entry.overtime_hours) || 0).toFixed(2)}h` : '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-white">
                                {editingEntry === entry.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editData.base_salary || ''}
                                    onChange={(e) => setEditData({ ...editData, base_salary: parseFloat(e.target.value) || 0 })}
                                    className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                  />
                                ) : (
                                  formatCurrency(parseFloat(entry.base_salary) || 0)
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400">
                                {editingEntry === entry.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editData.overtime_pay || ''}
                                    onChange={(e) => setEditData({ ...editData, overtime_pay: parseFloat(e.target.value) || 0 })}
                                    className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                  />
                                ) : (
                                  (parseFloat(entry.overtime_pay) || 0) > 0 ? formatCurrency(parseFloat(entry.overtime_pay) || 0) : '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-red-400">
                                {editingEntry === entry.id ? (
                                  <div className="space-y-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.undertime_deduction || ''}
                                      onChange={(e) => setEditData({ ...editData, undertime_deduction: parseFloat(e.target.value) || 0 })}
                                      className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.staff_house_deduction || ''}
                                      onChange={(e) => setEditData({ ...editData, staff_house_deduction: parseFloat(e.target.value) || 0 })}
                                      className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                  </div>
                                ) : (
                                  ((parseFloat(entry.undertime_deduction) || 0) + (parseFloat(entry.staff_house_deduction) || 0)) > 0 
                                    ? formatCurrency((parseFloat(entry.undertime_deduction) || 0) + (parseFloat(entry.staff_house_deduction) || 0)) 
                                    : '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <p className="font-bold text-white">
                                  {editingEntry === entry.id 
                                    ? formatCurrency(
                                        (editData.base_salary || 0) + 
                                        (editData.overtime_pay || 0) - 
                                        (editData.undertime_deduction || 0) - 
                                        (editData.staff_house_deduction || 0)
                                      )
                                    : formatCurrency(parseFloat(entry.total_salary) || 0)
                                  }
                                </p>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {editingEntry === entry.id ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleSave(entry.id)}
                                      className="text-emerald-400 hover:text-emerald-300 p-1 rounded transition-colors"
                                      title="Save"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleCancel}
                                      className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleEdit(entry)}
                                    className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading payroll data...</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <PhilippinePeso className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Payroll Data</h3>
              <p className="text-slate-400">
                {selectedDates.length === 0 
                  ? 'Select dates and generate payslips to view preview.' 
                  : 'No payroll data found for selected dates. Try generating payslips first.'}
              </p>
              {selectedDates.length > 0 && (
                <button
                  onClick={generatePayslips}
                  className="mt-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200"
                >
                  Generate Payslips
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}