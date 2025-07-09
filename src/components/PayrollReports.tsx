import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  PhilippinePeso, 
  Download, 
  FileText, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PayrollEntry {
  id: number;
  user_id: number;
  username: string;
  department: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  overtime_hours: number;
  undertime_hours: number;
  base_salary: number;
  overtime_pay: number;
  undertime_deduction: number;
  staff_house_deduction: number;
  total_salary: number;
  clock_in_time: string;
  clock_out_time: string;
  status: string;
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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PayrollEntry>>({});
  const { token } = useAuth();

  useEffect(() => {
    fetchUsers();
    // Set default to current week
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    const currentWeekEnd = getWeekEnd(currentWeekStart);
    setSelectedDates([currentWeekStart, currentWeekEnd]);
  }, []);

  useEffect(() => {
    if (selectedDates.length > 0) {
      fetchPayrollReport();
    }
  }, [selectedDates]);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const getWeekEnd = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

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

  const fetchPayrollReport = async () => {
    if (selectedDates.length === 0) return;
    
    setLoading(true);
    try {
      let url = 'http://192.168.100.60:3001/api/payroll-report';
      
      if (selectedDates.length === 2) {
        // Date range
        url += `?startDate=${selectedDates[0]}&endDate=${selectedDates[1]}`;
      } else {
        // Specific dates
        url += `?selectedDates=${selectedDates.join(',')}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Error fetching payroll report:', error);
      setPayrollData([]);
    }
    setLoading(false);
  };

  const generatePayslips = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.100.60:3001/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          selectedDates,
          userIds: selectedUsers.length > 0 ? selectedUsers : undefined
        }),
      });

      const data = await response.json();
      
      if (Array.isArray(data)) {
        alert(`Generated ${data.length} payslips successfully!`);
        
        // Log the generation
        await logPayslipAction('generated', data.length);
        
        // Refresh the report
        await fetchPayrollReport();
      } else {
        alert('Failed to generate payslips');
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
      alert('Failed to generate payslips');
    }
    setLoading(false);
  };

  const releasePayslips = async () => {
    if (payrollData.length === 0) {
      alert('No payslips to release');
      return;
    }

    const pendingPayslips = payrollData.filter(entry => entry.status === 'pending');
    if (pendingPayslips.length === 0) {
      alert('No pending payslips to release');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to release ${pendingPayslips.length} pending payslips?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('http://192.168.100.60:3001/api/payslips/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          selectedDates,
          userIds: selectedUsers.length > 0 ? selectedUsers : undefined
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        
        // Log the release
        await logPayslipAction('released', data.releasedCount);
        
        // Refresh the report
        await fetchPayrollReport();
      } else {
        alert('Failed to release payslips');
      }
    } catch (error) {
      console.error('Error releasing payslips:', error);
      alert('Failed to release payslips');
    }
    setLoading(false);
  };

  const logPayslipAction = async (action: string, count: number) => {
    try {
      await fetch('http://192.168.100.60:3001/api/payslip-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          selectedDates,
          payslipCount: count,
          userIds: selectedUsers.length > 0 ? selectedUsers : null
        }),
      });
    } catch (error) {
      console.error('Error logging payslip action:', error);
    }
  };

  const handleEdit = (entry: PayrollEntry) => {
    setEditingEntry(entry.id);
    setEditData({
      clock_in_time: entry.clock_in_time ? entry.clock_in_time.slice(0, 16) : '',
      clock_out_time: entry.clock_out_time ? entry.clock_out_time.slice(0, 16) : '',
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

      const data = await response.json();
      
      if (data.success) {
        setEditingEntry(null);
        setEditData({});
        await fetchPayrollReport();
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

  const addDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!selectedDates.includes(today)) {
      setSelectedDates([...selectedDates, today].sort());
    }
  };

  const removeDate = (dateToRemove: string) => {
    setSelectedDates(selectedDates.filter(date => date !== dateToRemove));
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

  const exportToCSV = () => {
    if (payrollData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Employee',
      'Department',
      'Period Start',
      'Period End',
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
      'Status'
    ];

    const rows = payrollData.map(entry => [
      entry.username,
      entry.department,
      entry.week_start,
      entry.week_end,
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
      entry.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const dateRange = selectedDates.length === 2 
      ? `${selectedDates[0]}_to_${selectedDates[1]}`
      : `selected_dates_${selectedDates.join('_')}`;
    
    link.download = `payroll_report_${dateRange}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (payrollData.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Payroll Report', 14, 22);
    
    // Add date range
    doc.setFontSize(12);
    const dateRange = selectedDates.length === 2 
      ? `${formatDate(selectedDates[0])} - ${formatDate(selectedDates[1])}`
      : `Selected Dates: ${selectedDates.map(formatDate).join(', ')}`;
    doc.text(dateRange, 14, 32);
    
    // Add summary
    const totalSalary = payrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
    const totalHours = payrollData.reduce((sum, entry) => sum + entry.total_hours, 0);
    const totalOvertime = payrollData.reduce((sum, entry) => sum + entry.overtime_hours, 0);
    
    doc.text(`Total Employees: ${payrollData.length}`, 14, 42);
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 14, 50);
    doc.text(`Total Overtime: ${totalOvertime.toFixed(2)}`, 14, 58);
    doc.text(`Total Salary: ${formatCurrency(totalSalary)}`, 14, 66);
    
    // Prepare table data
    const tableData = payrollData.map(entry => [
      entry.username,
      entry.department,
      `${entry.total_hours.toFixed(1)}h`,
      `${entry.overtime_hours.toFixed(1)}h`,
      formatCurrency(entry.base_salary),
      formatCurrency(entry.overtime_pay),
      formatCurrency(entry.undertime_deduction + entry.staff_house_deduction),
      formatCurrency(entry.total_salary),
      entry.status
    ]);

    // Add table
    (doc as any).autoTable({
      head: [['Employee', 'Department', 'Hours', 'OT', 'Base', 'OT Pay', 'Deductions', 'Total', 'Status']],
      body: tableData,
      startY: 75,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 75 }
    });
    
    // Save the PDF
    const dateRangeFilename = selectedDates.length === 2 
      ? `${selectedDates[0]}_to_${selectedDates[1]}`
      : `selected_dates_${selectedDates.join('_')}`;
    
    doc.save(`payroll_report_${dateRangeFilename}.pdf`);
  };

  // Calculate summary statistics
  const totalSalary = payrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
  const totalHours = payrollData.reduce((sum, entry) => sum + entry.total_hours, 0);
  const totalOvertime = payrollData.reduce((sum, entry) => sum + entry.overtime_hours, 0);
  const totalDeductions = payrollData.reduce((sum, entry) => sum + entry.undertime_deduction + entry.staff_house_deduction, 0);
  const pendingCount = payrollData.filter(entry => entry.status === 'pending').length;
  const releasedCount = payrollData.filter(entry => entry.status === 'released').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll Reports</h2>
          <p className="text-slate-400">Generate and manage employee payroll</p>
        </div>
        <div className="flex items-center gap-3">
          {payrollData.length > 0 && (
            <>
              <button
                onClick={exportToCSV}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg btn-enhanced"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg btn-enhanced"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            </>
          )}
          <button
            onClick={generatePayslips}
            disabled={loading || selectedDates.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg btn-enhanced"
          >
            <PhilippinePeso className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Payslips'}
          </button>
          {pendingCount > 0 && (
            <button
              onClick={releasePayslips}
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg btn-enhanced"
            >
              <CheckCircle className="w-4 h-4" />
              Release Payslips ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Select Period</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Selected Dates
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedDates.map((date, index) => (
                <div key={date} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg">
                  <span className="text-white">{formatDate(date)}</span>
                  {selectedDates.length > 1 && (
                    <button
                      onClick={() => removeDate(date)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addDate}
              className="mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Today
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Users (Optional)
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([]);
                    }
                  }}
                  className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                />
                <span className="ml-2 text-sm text-slate-300 font-medium">All Users</span>
              </label>
              {DEPARTMENTS.map(dept => {
                const deptUsers = users.filter(user => user.department === dept);
                if (deptUsers.length === 0) return null;
                
                return (
                  <div key={dept} className="ml-4">
                    <p className="text-xs font-medium text-slate-400 mb-1">{dept}</p>
                    {deptUsers.map(user => (
                      <label key={user.id} className="flex items-center ml-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                        />
                        <span className="ml-2 text-sm text-slate-300">{user.username}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {payrollData.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Employees</p>
                <p className="text-2xl font-bold text-white">{payrollData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Hours</p>
                <p className="text-2xl font-bold text-emerald-400">{totalHours.toFixed(1)}h</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Overtime</p>
                <p className="text-2xl font-bold text-orange-400">{totalOvertime.toFixed(1)}h</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Deductions</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 p-3 rounded-lg">
                <PhilippinePeso className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Salary</p>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalSalary)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
                <PhilippinePeso className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {payrollData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending Payslips</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Released Payslips</p>
                <p className="text-2xl font-bold text-emerald-400">{releasedCount}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading payroll data...</p>
        </div>
      ) : payrollData.length > 0 ? (
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
          <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
            <h3 className="text-lg font-semibold text-white">
              Payroll Report - {selectedDates.length === 2 
                ? `${formatDate(selectedDates[0])} to ${formatDate(selectedDates[1])}`
                : `Selected Dates: ${selectedDates.map(formatDate).join(', ')}`
              }
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Time</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Hours</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Pay</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Deductions</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-300">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {payrollData.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">{entry.username}</p>
                        <p className="text-sm text-slate-400">ID: {entry.user_id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300">{entry.department}</span>
                    </td>
                    <td className="py-3 px-4">
                      {editingEntry === entry.id ? (
                        <div className="space-y-1">
                          <input
                            type="datetime-local"
                            value={editData.clock_in_time || ''}
                            onChange={(e) => setEditData({ ...editData, clock_in_time: e.target.value })}
                            className="w-full text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-white"
                          />
                          <input
                            type="datetime-local"
                            value={editData.clock_out_time || ''}
                            onChange={(e) => setEditData({ ...editData, clock_out_time: e.target.value })}
                            className="w-full text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-white"
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
                            value={editData.total_hours || 0}
                            onChange={(e) => setEditData({ ...editData, total_hours: parseFloat(e.target.value) || 0 })}
                            className="w-16 text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.overtime_hours || 0}
                            onChange={(e) => setEditData({ ...editData, overtime_hours: parseFloat(e.target.value) || 0 })}
                            className="w-16 text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-orange-400"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-white">{entry.total_hours.toFixed(2)}h</p>
                          {entry.overtime_hours > 0 && (
                            <p className="text-sm text-orange-400">+{entry.overtime_hours.toFixed(2)}h OT</p>
                          )}
                          {entry.undertime_hours > 0 && (
                            <p className="text-sm text-red-400">-{entry.undertime_hours.toFixed(2)}h</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingEntry === entry.id ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.base_salary || 0}
                            onChange={(e) => setEditData({ ...editData, base_salary: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.overtime_pay || 0}
                            onChange={(e) => setEditData({ ...editData, overtime_pay: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-emerald-400"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-white">{formatCurrency(entry.base_salary)}</p>
                          {entry.overtime_pay > 0 && (
                            <p className="text-sm text-emerald-400">+{formatCurrency(entry.overtime_pay)}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingEntry === entry.id ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.undertime_deduction || 0}
                            onChange={(e) => setEditData({ ...editData, undertime_deduction: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-red-400"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.staff_house_deduction || 0}
                            onChange={(e) => setEditData({ ...editData, staff_house_deduction: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-xs p-1 bg-slate-700/50 border border-slate-600 rounded text-red-400"
                          />
                        </div>
                      ) : (
                        <div>
                          {entry.undertime_deduction > 0 && (
                            <p className="text-sm text-red-400">-{formatCurrency(entry.undertime_deduction)}</p>
                          )}
                          {entry.staff_house_deduction > 0 && (
                            <p className="text-sm text-red-400">-{formatCurrency(entry.staff_house_deduction)}</p>
                          )}
                          {(entry.undertime_deduction + entry.staff_house_deduction) === 0 && (
                            <p className="text-slate-500">-</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-white">
                        {editingEntry === entry.id 
                          ? formatCurrency((editData.base_salary || 0) + (editData.overtime_pay || 0) - (editData.undertime_deduction || 0) - (editData.staff_house_deduction || 0))
                          : formatCurrency(entry.total_salary)
                        }
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'released' 
                          ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50' 
                          : 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/50'
                      }`}>
                        {entry.status === 'released' ? 'Released' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {editingEntry === entry.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSave(entry.id)}
                            className="text-emerald-400 hover:text-emerald-300 p-1"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Payroll Data</h3>
          <p className="text-slate-400">
            {selectedDates.length === 0 
              ? 'Please select dates to generate payroll report.'
              : 'No payroll records found for the selected period. Generate payslips first.'
            }
          </p>
        </div>
      )}
    </div>
  );
}