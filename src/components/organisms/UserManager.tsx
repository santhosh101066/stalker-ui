import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { toast } from 'react-toastify';
import { Plus, Trash2, Edit2, Users, Check, X, Shield, Loader2 } from 'lucide-react';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';

interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');

  // Confirmation Modal
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    userId: number | null;
    email: string;
  }>({
    isOpen: false,
    userId: null,
    email: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<UserRecord[]>('/admin/users');
      if (response.data) {
        setUsers(response.data);
      }
    } catch {
      toast.error('Failed to load user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error('Email and Name are required');
      return;
    }

    try {
      const response = await api.post<UserRecord>('/admin/users', {
        email: email.trim(),
        name: name.trim(),
        role,
        isActive,
        password: password.trim() || undefined,
      });

      if (response.data) {
        toast.success(`User ${name} added successfully`);
        setShowAddModal(false);
        // Reset form
        setEmail('');
        setName('');
        setRole('user');
        setIsActive(true);
        setPassword('');
        fetchUsers();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to add user');
    }
  };

  const handleEditClick = (user: UserRecord) => {
    setCurrentUser(user);
    setName(user.name);
    setRole(user.role);
    setIsActive(user.isActive);
    setPassword('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const response = await api.put<UserRecord>(`/admin/users/${currentUser.id}`, {
        name: name.trim(),
        role,
        isActive,
        password: password.trim() || undefined,
      });

      if (response.data) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setCurrentUser(null);
        setPassword('');
        fetchUsers();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteClick = (user: UserRecord) => {
    setConfirmDelete({
      isOpen: true,
      userId: user.id,
      email: user.email,
    });
  };

  const handleConfirmDelete = async () => {
    const { userId } = confirmDelete;
    if (!userId) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      setConfirmDelete({ isOpen: false, userId: null, email: '' });
      fetchUsers();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/30 border border-gray-800 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white text-lg">User Registry</h3>
            <p className="text-xs text-gray-500">Manage user authorization and roles.</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-grow md:w-64 bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none transition-all duration-300"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/15 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500">Loading user registry...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="border border-gray-800 rounded-3xl p-12 text-center text-gray-500 italic">
          No users found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-gray-800 bg-gray-900/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/20 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40 text-sm">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-900/30 transition-colors duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white">{user.name}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user.role === 'admin'
                        ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                        : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                    }`}>
                      {user.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : null}
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      user.isActive
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{user.isActive ? 'Active' : 'Disabled'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700/80 text-gray-300 transition-colors cursor-pointer"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 rounded-lg bg-red-950/20 border border-red-900/20 text-red-500 hover:bg-red-900/20 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-gray-900 border border-gray-850 rounded-3xl p-6 shadow-2xl space-y-6">
            <h4 className="text-lg font-bold text-white text-left">Add Authorized User</h4>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Account State</label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setPassword('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-gray-900 border border-gray-850 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-left">
              <h4 className="text-lg font-bold text-white">Modify User Profile</h4>
              <p className="text-xs text-gray-500 mt-1">Editing authorization settings for {currentUser.email}</p>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Reset Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Account State</label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentUser(null);
                    setPassword('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        title="Remove Authorized User"
        message={`Are you sure you want to delete user ${confirmDelete.email}? This will revoke their access immediately.`}
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, userId: null, email: '' })}
      />
    </div>
  );
}
