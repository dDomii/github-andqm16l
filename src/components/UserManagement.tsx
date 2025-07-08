import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, User, Shield, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: string;
  department: string;
  staff_house: boolean;
  active: boolean;
  created_at: string;
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
  'Human Resource': {
    bg: 'bg-orange-100/10',
    border: 'border-orange-300/30',
    text: 'text-orange-300',
    accent: 'from-orange-400/20 to-orange-500/20',
    icon: 'text-orange-400'
  },
  'Marketing': {
    bg: 'bg-gray-100/10',
    border: 'border-gray-300/30',
    text: 'text-gray-300',
    accent: 'from-gray-400/20 to-gray-500/20',
    icon: 'text-gray-400'
  },
  'Finance': {
    bg: 'bg-sky-100/10',
    border: 'border-sky-300/30',
    text: 'text-sky-300',
    accent: 'from-sky-400/20 to-sky-500/20',
    icon: 'text-sky-400'
  },
  'Account Management': {
    bg: 'bg-yellow-100/10',
    border: 'border-yellow-300/30',
    text: 'text-yellow-300',
    accent: 'from-yellow-400/20 to-yellow-500/20',
    icon: 'text-yellow-400'
  },
  'System Automation': {
    bg: 'bg-green-100/10',
    border: 'border-green-300/30',
    text: 'text-green-300',
    accent: 'from-green-400/20 to-green-500/20',
    icon: 'text-green-400'
  },
  'Sales': {
    bg: 'bg-pink-100/10',
    border: 'border-pink-300/30',
    text: 'text-pink-300',
    accent: 'from-pink-400/20 to-pink-500/20',
    icon: 'text-pink-400'
  },
  'Training': {
    bg: 'bg-cyan-100/10',
    border: 'border-cyan-300/30',
    text: 'text-cyan-300',
    accent: 'from-cyan-400/20 to-cyan-500/20',
    icon: 'text-cyan-400'
  },
  'IT Department': {
    bg: 'bg-purple-100/10',
    border: 'border-purple-300/30',
    text: 'text-purple-300',
    accent: 'from-purple-400/20 to-purple-500/20',
    icon: 'text-purple-400'
  }
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set(DEPARTMENTS));
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'ojt',
    department: DEPARTMENTS[0],
    staff_house: false,
    active: true
  });
  const [timeAdjustment, setTimeAdjustment] = useState({
    clockIn: '',
    clockOut: '',
    date: new Date().toISOString().split('T')[0]
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://192.168.100.60:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `http://192.168.100.60:3001/api/users/${editingUser.id}`
        : 'http://192.168.100.60:3001/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
        setShowModal(false);
        resetForm();
      } else {
        alert(data.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleTimeAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) return;

    try {
      const response = await fetch(`http://192.168.100.60:3001/api/users/${selectedUserId}/adjust-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(timeAdjustment),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Time adjustment saved successfully');
        setShowTimeModal(false);
        setTimeAdjustment({
          clockIn: '',
          clockOut: '',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        alert(data.message || 'Failed to adjust time');
      }
    } catch (error) {
      console.error('Error adjusting time:', error);
      alert('Failed to adjust time');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      const response = await fetch(`http://192.168.100.60:3001/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message || 'User deleted successfully');
        fetchUsers();
        setShowDeleteModal(false);
        setDeletingUser(null);
      } else {
        alert(data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'ojt',
      department: DEPARTMENTS[0],
      staff_house: false,
      active: true
    });
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      department: user.department,
      staff_house: user.staff_house,
      active: user.active
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleTimeEdit = (userId: number) => {
    setSelectedUserId(userId);
    setShowTimeModal(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const toggleDepartment = (department: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  // Group users by department
  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = users.filter(user => user.department === dept);
    return acc;
  }, {} as Record<string, User[]>);

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.active).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-slate-400">Manage users organized by department</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-400">Total Users</p>
            <p className="text-lg font-semibold text-white">{totalUsers} ({activeUsers} active)</p>
          </div>
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Department-wise User Lists */}
      <div className="space-y-4">
        {DEPARTMENTS.map((department) => {
          const deptUsers = groupedUsers[department];
          const colors = DEPARTMENT_COLORS[department];
          const isExpanded = expandedDepartments.has(department);
          const activeCount = deptUsers.filter(user => user.active).length;

          return (
            <div key={department} className={`${colors.bg} backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border ${colors.border}`}>
              <button
                onClick={() => toggleDepartment(department)}
                className={`w-full px-6 py-4 bg-gradient-to-r ${colors.accent} border-b ${colors.border} flex items-center justify-between hover:opacity-80 transition-all duration-200`}
              >
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${colors.accent} p-2 rounded-lg border ${colors.border}`}>
                    <User className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`text-lg font-semibold ${colors.text}`}>{department}</h3>
                    <p className="text-sm text-slate-400">
                      {deptUsers.length} total • {activeCount} active
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colors.border} ${colors.text}`}>
                    {deptUsers.length} users
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="divide-y divide-slate-700/30">
                  {deptUsers.length > 0 ? (
                    deptUsers.map((user) => (
                      <div key={user.id} className="p-6 hover:bg-slate-700/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`bg-gradient-to-br ${colors.accent} p-3 rounded-lg border ${colors.border}`}>
                              {user.role === 'admin' ? (
                                <Shield className={`w-5 h-5 ${colors.icon}`} />
                              ) : (
                                <User className={`w-5 h-5 ${colors.icon}`} />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{user.username}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.role === 'admin' 
                                    ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50' 
                                    : 'bg-blue-900/20 text-blue-400 border border-blue-800/50'
                                }`}>
                                  {user.role.toUpperCase()}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.staff_house 
                                    ? 'bg-purple-900/20 text-purple-400 border border-purple-800/50' 
                                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                                }`}>
                                  {user.staff_house ? 'Staff House' : 'No Staff House'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.active 
                                    ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50' 
                                    : 'bg-red-900/20 text-red-400 border border-red-800/50'
                                }`}>
                                  {user.active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">
                                Created {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-900/20 transition-all duration-200"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTimeEdit(user.id)}
                              className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-900/20 transition-all duration-200"
                              title="Adjust Time"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-all duration-200"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <div className={`bg-gradient-to-br ${colors.accent} p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border ${colors.border}`}>
                        <User className={`w-8 h-8 ${colors.icon}`} />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No Users in {department}</h3>
                      <p className="text-slate-400">Add users to this department to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                >
                  <option value="ojt">OJT</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.staff_house}
                    onChange={(e) => setFormData({ ...formData, staff_house: e.target.checked })}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                  />
                  <span className="ml-2 text-sm text-slate-300">Staff House</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                  />
                  <span className="ml-2 text-sm text-slate-300">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Time Adjustment Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Adjust Time Entry
            </h3>
            
            <form onSubmit={handleTimeAdjustment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={timeAdjustment.date}
                  onChange={(e) => setTimeAdjustment({ ...timeAdjustment, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Clock In Time
                </label>
                <input
                  type="time"
                  value={timeAdjustment.clockIn}
                  onChange={(e) => setTimeAdjustment({ ...timeAdjustment, clockIn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Clock Out Time (optional)
                </label>
                <input
                  type="time"
                  value={timeAdjustment.clockOut}
                  onChange={(e) => setTimeAdjustment({ ...timeAdjustment, clockOut: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                />
              </div>

              <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/50">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> This will override existing time entries for the selected date. Use with caution.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200"
                >
                  Adjust Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Delete User
            </h3>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete <strong className="text-white">{deletingUser.username}</strong>?
              </p>
              <div className="bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                <p className="text-sm text-red-400">
                  <strong>Warning:</strong> If this user has existing time entries or payroll records, 
                  they will be deactivated instead of deleted to preserve data integrity.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}