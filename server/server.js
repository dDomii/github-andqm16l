import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database.js';
import { loginUser, verifyToken, createUser, updateUser, deleteUser } from './auth.js';
import { clockIn, clockOut, getTodayEntry, getOvertimeRequests, approveOvertime } from './timeTracking.js';
import { generateWeeklyPayslips, generatePayslipsForDateRange, generatePayslipsForSpecificDays, getPayrollReport, updatePayrollEntry } from './payroll.js';
import { pool } from './database.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
await initializeDatabase();

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  req.user = decoded;
  next();
};

// Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await loginUser(username, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

app.post('/api/clock-in', authenticate, async (req, res) => {
  const result = await clockIn(req.user.userId);
  res.json(result);
});

app.post('/api/clock-out', authenticate, async (req, res) => {
  const { overtimeNote } = req.body;
  const result = await clockOut(req.user.userId, overtimeNote);
  res.json(result);
});

app.get('/api/today-entry', authenticate, async (req, res) => {
  const entry = await getTodayEntry(req.user.userId);
  res.json(entry);
});

app.get('/api/user-payroll-history', authenticate, async (req, res) => {
  const { weekStart, weekEnd, specificDay } = req.query;
  
  try {
    let query, params;
    
    if (specificDay) {
      // Get specific day
      query = `SELECT * FROM payslips 
               WHERE user_id = ? AND DATE(week_start) <= ? AND DATE(week_end) >= ?
               ORDER BY week_start DESC`;
      params = [req.user.userId, specificDay, specificDay];
    } else if (weekStart && weekEnd) {
      // Get specific week
      query = `SELECT * FROM payslips 
               WHERE user_id = ? AND week_start = ? AND week_end = ?
               ORDER BY week_start DESC`;
      params = [req.user.userId, weekStart, weekEnd];
    } else {
      // Get current year if no specific week
      query = `SELECT * FROM payslips 
               WHERE user_id = ? AND YEAR(week_start) = ?
               ORDER BY week_start DESC`;
      params = [req.user.userId, new Date().getFullYear()];
    }
    
    const [payslips] = await pool.execute(query, params);
    res.json(payslips);
  } catch (error) {
    console.error('Error fetching user payroll history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, username, role, department, staff_house, active, created_at FROM users ORDER BY department, username'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const result = await createUser(req.body);
  res.json(result);
});

app.put('/api/users/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const result = await updateUser(req.params.id, req.body);
  res.json(result);
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const result = await deleteUser(req.params.id);
  res.json(result);
});

app.post('/api/users/:id/adjust-time', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { id } = req.params;
  const { date, clockIn, clockOut } = req.body;

  try {
    const weekStart = getWeekStart(new Date(date));
    
    // Delete existing entry for this date
    await pool.execute(
      'DELETE FROM time_entries WHERE user_id = ? AND DATE(clock_in) = ?',
      [id, date]
    );

    // Create new entry with adjusted times
    const clockInDateTime = new Date(`${date}T${clockIn}:00`);
    let clockOutDateTime = null;
    
    if (clockOut) {
      clockOutDateTime = new Date(`${date}T${clockOut}:00`);
    }

    await pool.execute(
      'INSERT INTO time_entries (user_id, clock_in, clock_out, date, week_start) VALUES (?, ?, ?, ?, ?)',
      [id, clockInDateTime, clockOutDateTime, date, weekStart]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Time adjustment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

app.get('/api/overtime-requests', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const requests = await getOvertimeRequests();
  res.json(requests);
});

app.post('/api/overtime-requests/:id/approve', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { approved } = req.body;
  const result = await approveOvertime(req.params.id, approved, req.user.userId);
  res.json(result);
});

app.post('/api/overtime-request', authenticate, async (req, res) => {
  const { overtimeNote, date } = req.body;
  
  try {
    const weekStart = getWeekStart(new Date(date));
    
    // Check if user already has a time entry for this date
    const [existingEntry] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND DATE(clock_in) = ?',
      [req.user.userId, date]
    );
    
    if (existingEntry.length > 0) {
      // Update existing entry with overtime request
      await pool.execute(
        `UPDATE time_entries 
         SET overtime_requested = TRUE, overtime_note = ?, overtime_approved = NULL
         WHERE id = ?`,
        [overtimeNote, existingEntry[0].id]
      );
    } else {
      // Create a new overtime-only entry for admin review
      const clockIn = new Date(`${date}T16:00:00`); // 4 PM start for manual OT
      const clockOut = new Date(`${date}T18:00:00`); // 2 hours of OT
      
      await pool.execute(
        `INSERT INTO time_entries (user_id, clock_in, clock_out, date, week_start, overtime_requested, overtime_note, overtime_approved) 
         VALUES (?, ?, ?, ?, ?, TRUE, ?, NULL)`,
        [req.user.userId, clockIn, clockOut, date, weekStart, overtimeNote]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Manual overtime request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/payslips/generate', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { weekStart, startDate, endDate, selectedDates, userIds } = req.body;
  
  try {
    // Support multiple generation modes
    let payslips;
    if (selectedDates && selectedDates.length > 0) {
      // Generate for specific selected days
      payslips = await generatePayslipsForSpecificDays(selectedDates, userIds);
    } else if (startDate && endDate) {
      // Generate for date range
      payslips = await generatePayslipsForDateRange(startDate, endDate);
    } else if (weekStart) {
      // Generate for week (backward compatibility)
      payslips = await generateWeeklyPayslips(weekStart);
    } else {
      return res.status(400).json({ message: 'Either weekStart, startDate/endDate, or selectedDates is required' });
    }
    
    res.json(payslips);
  } catch (error) {
    console.error('Error generating payslips:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/payroll-report', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { weekStart, startDate, endDate, selectedDates } = req.query;
  
  console.log('Payroll report request:', { weekStart, startDate, endDate, selectedDates });
  
  let report;
  if (selectedDates) {
    // Handle specific dates - parse the comma-separated string
    const datesArray = selectedDates.split(',');
    const sortedDates = datesArray.sort();
    console.log('Fetching report for dates:', sortedDates);
    report = await getPayrollReport(sortedDates[0], sortedDates[sortedDates.length - 1]);
  } else if (startDate && endDate) {
    report = await getPayrollReport(startDate, endDate);
  } else if (weekStart) {
    report = await getPayrollReport(weekStart);
  } else {
    return res.status(400).json({ message: 'Either weekStart, startDate/endDate, or selectedDates is required' });
  }
  
  console.log('Payroll report result:', report.length, 'entries');
  res.json(report);
});

app.put('/api/payroll/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const result = await updatePayrollEntry(req.params.id, req.body);
  res.json(result);
});

app.get('/api/active-users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const [activeUsers] = await pool.execute(`
      SELECT 
        u.id,
        u.username,
        u.department,
        te.clock_in
      FROM users u
      JOIN time_entries te ON u.id = te.user_id
      WHERE DATE(te.clock_in) = ? 
        AND te.clock_out IS NULL
        AND u.active = TRUE
      ORDER BY u.department, te.clock_in ASC
    `, [today]);

    res.json(activeUsers);
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(port, '192.168.100.60', () => {
  console.log(`Server running at http://192.168.100.60:${port}`);
});