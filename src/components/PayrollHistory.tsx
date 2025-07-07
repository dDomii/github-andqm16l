import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, DollarSign, Clock, TrendingUp, Download } from 'lucide-react';

interface PayrollEntry {
  id: number;
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

export function PayrollHistory() {
  const [payrollHistory, setPayrollHistory] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { token, user } = useAuth();

  useEffect(() => {
    fetchPayrollHistory();
  }, [selectedYear]);

  const fetchPayrollHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://192.168.100.60:3001/api/user-payroll-history?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPayrollHistory(data);
    } catch (error) {
      console.error('Error fetching payroll history:', error);
    }
    setLoading(false);
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

  const calculateStats = () => {
    const totalEarnings = payrollHistory.reduce((sum, entry) => sum + entry.total_salary, 0);
    const totalHours = payrollHistory.reduce((sum, entry) => sum + entry.total_hours, 0);
    const totalOvertimeHours = payrollHistory.reduce((sum, entry) => sum + entry.overtime_hours, 0);
    const totalOvertimePay = payrollHistory.reduce((sum, entry) => sum + entry.overtime_pay, 0);
    const totalDeductions = payrollHistory.reduce((sum, entry) => sum + entry.undertime_deduction + entry.staff_house_deduction, 0);

    return {
      totalEarnings,
      totalHours,
      totalOvertimeHours,
      totalOvertimePay,
      totalDeductions,
      averageWeeklyPay: payrollHistory.length > 0 ? totalEarnings / payrollHistory.length : 0
    };
  };

  const exportToCSV = () => {
    if (payrollHistory.length === 0) return;

    const headers = [
      'Week Start',
      'Week End',
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

    const rows = payrollHistory.map(entry => [
      entry.week_start,
      entry.week_end,
      formatTime(entry.clock_in_time),
      formatTime(entry.clock_out_time),
      entry.total_hours,
      entry.overtime_hours,
      entry.undertime_hours,
      entry.base_salary,
      entry.overtime_pay,
      entry.undertime_deduction,
      entry.staff_house_deduction,
      entry.total_salary,
      entry.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${user?.username}_payroll_history_${selectedYear}.csv`;
    link.click();
  };

  const stats = calculateStats();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll History</h2>
          <p className="text-slate-400">View your earnings and work statistics</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-700/50 border border-slate-600 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {payrollHistory.length > 0 && (
            <button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Earnings</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalEarnings)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Hours</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalHours.toFixed(1)}h</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Overtime Hours</p>
              <p className="text-2xl font-bold text-orange-400">{stats.totalOvertimeHours.toFixed(1)}h</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Avg Weekly Pay</p>
              <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats.averageWeeklyPay)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Payroll History Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading payroll history...</p>
        </div>
      ) : payrollHistory.length > 0 ? (
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Time</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Hours</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Overtime</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Base Pay</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Overtime Pay</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Deductions</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-300">Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {payrollHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">
                          {formatDate(entry.week_start)} - {formatDate(entry.week_end)}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <p className="text-slate-300">In: {formatTime(entry.clock_in_time)}</p>
                        <p className="text-slate-400">Out: {formatTime(entry.clock_out_time)}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div>
                        <p className="text-white">{entry.total_hours}h</p>
                        {entry.undertime_hours > 0 && (
                          <p className="text-sm text-red-400">-{entry.undertime_hours}h</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-orange-400">
                      {entry.overtime_hours > 0 ? `${entry.overtime_hours}h` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      {formatCurrency(entry.base_salary)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      {entry.overtime_pay > 0 ? formatCurrency(entry.overtime_pay) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-red-400">
                      {(entry.undertime_deduction + entry.staff_house_deduction) > 0 
                        ? formatCurrency(entry.undertime_deduction + entry.staff_house_deduction) 
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-white">{formatCurrency(entry.total_salary)}</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Payroll History</h3>
          <p className="text-slate-400">No payroll records found for {selectedYear}.</p>
        </div>
      )}
    </div>
  );
}