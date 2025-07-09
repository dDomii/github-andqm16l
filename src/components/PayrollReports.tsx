import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, PhilippinePeso, Download, FileText, Users, Clock, Edit2, Save, X, Filter, Search } from 'lucide-react';
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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
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
    if (selectedDates.length === 2) {
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
      setUsers(data.filter((user: any) => user.active));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPayrollReport = async () => {
    if (selectedDates.length !== 2) return;
    
    setLoading(true);
    try {
      const [startDate, endDate] = selectedDates;
      let url = `http://192.168.100.60:3001/api/payroll-report?startDate=${startDate}&endDate=${endDate}`;
      
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
    if (selectedDates.length !== 2) {
      alert('Please select a date range');
      return;
    }

    setLoading(true);
    try {
      const [startDate, endDate] = selectedDates;
      const response = await fetch('http://192.168.100.60:3001/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate,
          endDate,
          userIds: selectedUsers.length > 0 ? selectedUsers : undefined
        }),
      });

      const data = await response.json();
      
      if (Array.isArray(data)) {
        alert(`Generated ${data.length} payslips successfully!`);
        await fetchPayrollReport();
        
        // Log the generation
        await fetch('http://192.168.100.60:3001/api/payslip-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'generated',
            selectedDates,
            payslipCount: data.length,
            userIds: selectedUsers.length > 0 ? selectedUsers : null
          }),
        });
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
    if (selectedDates.length !== 2) {
      alert('Please select a date range');
      return;
    }

    const confirm = window.confirm('Are you sure you want to release these payslips? This action cannot be undone.');
    if (!confirm) return;

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
        await fetchPayrollReport();
        
        // Log the release
        await fetch('http://192.168.100.60:3001/api/payslip-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'released',
            selectedDates,
            payslipCount: data.releasedCount,
            userIds: selectedUsers.length > 0 ? selectedUsers : null
          }),
        });
      } else {
        alert('Failed to release payslips');
      }
    } catch (error) {
      console.error('Error releasing payslips:', error);
      alert('Failed to release payslips');
    }
    setLoading(false);
  };

  const handleEdit = (entry: PayrollEntry) => {
    setEditingEntry(entry.id);
    setEditData({
      clockIn: entry.clock_in_time ? new Date(entry.clock_in_time).toISOString().slice(0, 16) : '',
      clockOut: entry.clock_out_time ? new Date(entry.clock_out_time).toISOString().slice(0, 16) : '',
      totalHours: entry.total_hours,
      overtimeHours: entry.overtime_hours,
      undertimeHours: entry.undertime_hours,
      baseSalary: entry.base_salary,
      overtimePay: entry.overtime_pay,
      undertimeDeduction: entry.undertime_deduction,
      staffHouseDeduction: entry.staff_house_deduction
    });
  };

  const handleSave = async () => {
    if (!editingEntry) return;

    try {
      const response = await fetch(`http://192.168.100.60:3001/api/payroll/${editingEntry}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchPayrollReport();
        setEditingEntry(null);
        setEditData({});
      } else {
        alert('Failed to update payroll entry');
      }
    } catch (error) {
      console.error('Error updating payroll entry:', error);
      alert('Failed to update payroll entry');
    }
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

    const rows = filteredPayrollData.map(entry => [
      entry.username,
      entry.department,
      formatDate(entry.week_start),
      formatDate(entry.week_end),
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
      : new Date().toISOString().split('T')[0];
    
    link.download = `payroll_report_${dateRange}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (payrollData.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Payroll Report', 20, 20);
    
    // Add date range
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateRange = selectedDates.length === 2 
      ? `${formatDate(selectedDates[0])} - ${formatDate(selectedDates[1])}`
      : 'All Records';
    doc.text(`Period: ${dateRange}`, 20, 30);
    
    // Add generation date
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 37);
    
    // Prepare table data
    const tableHeaders = [
      'Employee',
      'Department',
      'Clock In',
      'Clock Out',
      'Hours',
      'OT Hours',
      'Base Pay',
      'OT Pay',
      'Deductions',
      'Total'
    ];
    
    const tableData = filteredPayrollData.map(entry => [
      entry.username,
      entry.department,
      formatTime(entry.clock_in_time),
      formatTime(entry.clock_out_time),
      entry.total_hours.toFixed(1),
      entry.overtime_hours.toFixed(1),
      `₱${entry.base_salary.toFixed(2)}`,
      `₱${entry.overtime_pay.toFixed(2)}`,
      `₱${(entry.undertime_deduction + entry.staff_house_deduction).toFixed(2)}`,
      `₱${entry.total_salary.toFixed(2)}`
    ]);
    
    // Add table
    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [16, 185, 129], // Emerald color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Employee
        1: { cellWidth: 30 }, // Department
        2: { cellWidth: 20 }, // Clock In
        3: { cellWidth: 20 }, // Clock Out
        4: { cellWidth: 15 }, // Hours
        5: { cellWidth: 15 }, // OT Hours
        6: { cellWidth: 25 }, // Base Pay
        7: { cellWidth: 25 }, // OT Pay
        8: { cellWidth: 25 }, // Deductions
        9: { cellWidth: 25 }, // Total
      },
    });
    
    // Add summary
    const totalSalary = filteredPayrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
    const totalHours = filteredPayrollData.reduce((sum, entry) => sum + entry.total_hours, 0);
    const totalOvertimeHours = filteredPayrollData.reduce((sum, entry) => sum + entry.overtime_hours, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 20, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Employees: ${filteredPayrollData.length}`, 20, finalY + 7);
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 20, finalY + 14);
    doc.text(`Total Overtime Hours: ${totalOvertimeHours.toFixed(2)}`, 20, finalY + 21);
    doc.text(`Total Payroll: ₱${totalSalary.toFixed(2)}`, 20, finalY + 28);
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text('Wither - OJT Daily Time Record System', 20, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    const dateRangeFilename = selectedDates.length === 2 
      ? `${selectedDates[0]}_to_${selectedDates[1]}`
      : new Date().toISOString().split('T')[0];
    
    doc.save(`payroll_report_${dateRangeFilename}.pdf`);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
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

  // Filter payroll data based on search and department
  const filteredPayrollData = payrollData.filter(entry => {
    const matchesSearch = entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === '' || entry.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Calculate statistics
  const stats = {
    totalEmployees: filteredPayrollData.length,
    totalSalary: filteredPayrollData.reduce((sum, entry) => sum + entry.total_salary, 0),
    totalHours: filteredPayrollData.reduce((sum, entry) => sum + entry.total_hours, 0),
    totalOvertimeHours: filteredPayrollData.reduce((sum, entry) => sum + entry.overtime_hours, 0),
    averageSalary: filteredPayrollData.length > 0 ? filteredPayrollData.reduce((sum, entry) => sum + entry.total_salary, 0) / filteredPayrollData.length : 0
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll Reports</h2>
          <p className="text-slate-400">Generate and manage employee payroll reports</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={selectedDates[0] || ''}
              onChange={(e) => {
                const newDates = [...selectedDates];
                newDates[0] = e.target.value;
                if (newDates[1] && new Date(e.target.value) > new Date(newDates[1])) {
                  newDates[1] = getWeekEnd(e.target.value);
                }
                setSelectedDates(newDates);
              }}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={selectedDates[1] || ''}
              onChange={(e) => {
                const newDates = [...selectedDates];
                newDates[1] = e.target.value;
                setSelectedDates(newDates);
              }}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Employees
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Search by name..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Department
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={generatePayslips}
            disabled={loading || selectedDates.length !== 2}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <PhilippinePeso className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Payslips'}
          </button>

          <button
            onClick={releasePayslips}
            disabled={loading || payrollData.length === 0}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <Users className="w-4 h-4" />
            Release Payslips
          </button>

          <button
            onClick={exportToCSV}
            disabled={filteredPayrollData.length === 0}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={exportToPDF}
            disabled={filteredPayrollData.length === 0}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Employees</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.totalEmployees}</p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Payroll</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalSalary)}</p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Hours</p>
            <p className="text-2xl font-bold text-purple-400">{stats.totalHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Overtime Hours</p>
            <p className="text-2xl font-bold text-orange-400">{stats.totalOvertimeHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Average Salary</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.averageSalary)}</p>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading payroll data...</p>
        </div>
      ) : filteredPayrollData.length > 0 ? (
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
          <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
            <h3 className="text-lg font-semibold text-white">
              Payroll Report - {selectedDates.length === 2 ? `${formatDate(selectedDates[0])} to ${formatDate(selectedDates[1])}` : 'All Records'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Showing {filteredPayrollData.length} of {payrollData.length} entries
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Period</th>
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
                {filteredPayrollData.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">{entry.username}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300">{entry.department}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <p className="text-slate-300">{formatDate(entry.week_start)}</p>
                        <p className="text-slate-400">to {formatDate(entry.week_end)}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {editingEntry === entry.id ? (
                        <div className="space-y-1">
                          <input
                            type="datetime-local"
                            value={editData.clockIn}
                            onChange={(e) => setEditData({ ...editData, clockIn: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                          <input
                            type="datetime-local"
                            value={editData.clockOut}
                            onChange={(e) => setEditData({ ...editData, clockOut: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
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
                            value={editData.totalHours}
                            onChange={(e) => setEditData({ ...editData, totalHours: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.overtimeHours}
                            onChange={(e) => setEditData({ ...editData, overtimeHours: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="text-white">{entry.total_hours.toFixed(2)}h</p>
                          {entry.overtime_hours > 0 && (
                            <p className="text-orange-400">+{entry.overtime_hours.toFixed(2)}h OT</p>
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
                            value={editData.baseSalary}
                            onChange={(e) => setEditData({ ...editData, baseSalary: parseFloat(e.target.value) })}
                            className="w-24 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.overtimePay}
                            onChange={(e) => setEditData({ ...editData, overtimePay: parseFloat(e.target.value) })}
                            className="w-24 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="text-white">{formatCurrency(entry.base_salary)}</p>
                          {entry.overtime_pay > 0 && (
                            <p className="text-emerald-400">+{formatCurrency(entry.overtime_pay)}</p>
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
                            value={editData.undertimeDeduction}
                            onChange={(e) => setEditData({ ...editData, undertimeDeduction: parseFloat(e.target.value) })}
                            className="w-24 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.staffHouseDeduction}
                            onChange={(e) => setEditData({ ...editData, staffHouseDeduction: parseFloat(e.target.value) })}
                            className="w-24 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-white"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">
                          {(entry.undertime_deduction + entry.staff_house_deduction) > 0 ? (
                            <>
                              {entry.undertime_deduction > 0 && (
                                <p className="text-red-400">-{formatCurrency(entry.undertime_deduction)}</p>
                              )}
                              {entry.staff_house_deduction > 0 && (
                                <p className="text-red-400">-{formatCurrency(entry.staff_house_deduction)}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-500">-</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-white text-lg">{formatCurrency(entry.total_salary)}</p>
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
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={handleSave}
                            className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-900/30"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEntry(null);
                              setEditData({});
                            }}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-900/30"
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
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Payroll Data</h3>
          <p className="text-slate-400">
            {selectedDates.length === 2 
              ? 'No payroll records found for the selected date range. Generate payslips first.'
              : 'Please select a date range to view payroll data.'}
          </p>
        </div>
      )}
    </div>
  );
}