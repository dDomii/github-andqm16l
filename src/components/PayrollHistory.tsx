import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, PhilippinePeso, Clock, TrendingUp, Download } from 'lucide-react';

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
  const [selectedWeek, setSelectedWeek] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    // Set current week as default
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    setSelectedWeek(currentWeekStart);
    fetchPayrollHistory();
  }, [selectedWeek]);

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

  const generateWeekOptions = () => {
    const weeks = [];
    const today = new Date();
    
    // Generate last 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      const weekStart = getWeekStart(weekDate);
      const weekEnd = getWeekEnd(weekStart);
      
      weeks.push({
        value: weekStart,
        label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
        isCurrent: i === 0
      });
    }
    
    return weeks;
  };

  const fetchPayrollHistory = async () => {
    setLoading(true);
    try {
      const weekEnd = getWeekEnd(selectedWeek);
      const response = await fetch(`http://192.168.100.60:3001/api/user-payroll-history?weekStart=${selectedWeek}&weekEnd=${weekEnd}`, {
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
      weeklyPay: totalEarnings
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
    link.download = `${user?.username}_payroll_week_${selectedWeek}.csv`;
    link.click();
  };

  const stats = calculateStats();
  const weekOptions = generateWeekOptions();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll History</h2>
          <p className="text-slate-400">View your weekly earnings and work statistics</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {weekOptions.map(week => (
              <option key={week.value} value={week.value}>
                {week.label} {week.isCurrent ? '(Current Week)' : ''}
              </option>
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
              <p className="text-sm text-slate-400">Week Earnings</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalEarnings)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <PhilippinePeso className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Week Hours</p>
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
              <p className="text-sm text-slate-400">Week Overtime</p>
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
              <p className="text-sm text-slate-400">Week Deductions</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalDeductions)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-400" />
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
          <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
            <h3 className="text-lg font-semibold text-white">
              Week of {formatDate(selectedWeek)} - {formatDate(getWeekEnd(selectedWeek))}
            </h3>
          </div>
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
                        <p className="text-white">{entry.total_hours.toFixed(2)}h</p>
                        {entry.undertime_hours > 0 && (
                          <p className="text-sm text-red-400">-{entry.undertime_hours.toFixed(2)}h</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-orange-400">
                      {entry.overtime_hours > 0 ? `${entry.overtime_hours.toFixed(2)}h` : '-'}
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
          <p className="text-slate-400">No payroll records found for the selected week.</p>
        </div>
      )}
    </div>
  );
}