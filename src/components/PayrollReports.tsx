import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, DollarSign, FileText, AlertCircle, Edit2, Save, X, Eye } from 'lucide-react';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PayrollEntry>>({});
  const [activeTab, setActiveTab] = useState<'generate' | 'preview'>('generate');
  const { token } = useAuth();

  useEffect(() => {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    const currentWeekEnd = getWeekEnd(today);
    setStartDate(currentWeekStart);
    setEndDate(currentWeekEnd);
  }, []);

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
    if (!startDate) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://192.168.100.60:3001/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekStart: startDate }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.error) {
          setError(data.error);
        } else {
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
    if (!startDate) return;
    
    try {
      const response = await fetch(`http://192.168.100.60:3001/api/payroll-report?weekStart=${startDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Error fetching payroll report:', error);
    }
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
      'Week Start',
      'Week End'
    ];

    let csvContent = headers.join(',') + '\n';

    // Add data organized by department
    DEPARTMENTS.forEach(dept => {
      const deptEntries = groupedData[dept];
      if (deptEntries.length > 0) {
        // Add department header
        csvContent += `\n"${dept} Department"\n`;
        
        deptEntries.forEach(entry => {
          const row = [
            entry.department,
            entry.username,
            entry.clock_in_time || 'N/A',
            entry.clock_out_time || 'N/A',
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
          csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_report_${startDate}_to_${endDate}.csv`;
    link.click();
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

  const totalSalary = payrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
  const totalOvertime = payrollData.reduce((sum, entry) => sum + entry.overtime_pay, 0);
  const totalDeductions = payrollData.reduce((sum, entry) => sum + entry.undertime_deduction + entry.staff_house_deduction, 0);

  // Group payroll data by department
  const groupedPayrollData = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = payrollData.filter(entry => entry.department === dept);
    return acc;
  }, {} as Record<string, PayrollEntry[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll Management</h2>
          <p className="text-slate-400">Generate and manage employee payroll</p>
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
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
              />
            </div>
            <button
              onClick={generatePayslips}
              disabled={loading || !startDate || !endDate}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <FileText className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Payslips'}
            </button>
            <button
              onClick={fetchPayrollReport}
              disabled={!startDate}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <Eye className="w-4 h-4" />
              Load Report
            </button>
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

                const deptTotal = deptData.reduce((sum, entry) => sum + entry.total_salary, 0);

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
                                      value={editData.total_hours || 0}
                                      onChange={(e) => setEditData({ ...editData, total_hours: parseFloat(e.target.value) || 0 })}
                                      className="w-16 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.undertime_hours || 0}
                                      onChange={(e) => setEditData({ ...editData, undertime_hours: parseFloat(e.target.value) || 0 })}
                                      className="w-16 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-white">{entry.total_hours.toFixed(2)}h</p>
                                    {entry.undertime_hours > 0 && (
                                      <p className="text-sm text-red-400">-{entry.undertime_hours.toFixed(2)}h</p>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-orange-400">
                                {editingEntry === entry.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editData.overtime_hours || 0}
                                    onChange={(e) => setEditData({ ...editData, overtime_hours: parseFloat(e.target.value) || 0 })}
                                    className="w-16 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                  />
                                ) : (
                                  entry.overtime_hours > 0 ? `${entry.overtime_hours.toFixed(2)}h` : '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-white">
                                {editingEntry === entry.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editData.base_salary || 0}
                                    onChange={(e) => setEditData({ ...editData, base_salary: parseFloat(e.target.value) || 0 })}
                                    className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                  />
                                ) : (
                                  formatCurrency(entry.base_salary)
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400">
                                {editingEntry === entry.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editData.overtime_pay || 0}
                                    onChange={(e) => setEditData({ ...editData, overtime_pay: parseFloat(e.target.value) || 0 })}
                                    className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                  />
                                ) : (
                                  entry.overtime_pay > 0 ? formatCurrency(entry.overtime_pay) : '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-red-400">
                                {editingEntry === entry.id ? (
                                  <div className="space-y-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.undertime_deduction || 0}
                                      onChange={(e) => setEditData({ ...editData, undertime_deduction: parseFloat(e.target.value) || 0 })}
                                      className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editData.staff_house_deduction || 0}
                                      onChange={(e) => setEditData({ ...editData, staff_house_deduction: parseFloat(e.target.value) || 0 })}
                                      className="w-20 text-xs px-1 py-1 bg-slate-700/50 border border-slate-600 rounded text-right text-white"
                                    />
                                  </div>
                                ) : (
                                  (entry.undertime_deduction + entry.staff_house_deduction) > 0 
                                    ? formatCurrency(entry.undertime_deduction + entry.staff_house_deduction) 
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
                                    : formatCurrency(entry.total_salary)
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
          ) : (
            <div className="text-center py-12">
              <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Payroll Data</h3>
              <p className="text-slate-400">Generate payslips to view preview.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}