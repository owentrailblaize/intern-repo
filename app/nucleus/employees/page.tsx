'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Search, Filter, X, Trash2, Edit2, ExternalLink, RefreshCw, Copy, Check, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { supabase, Employee, EmployeeRole, ROLE_LABELS } from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function EmployeesModule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'growth_intern' as EmployeeRole,
    seniority: 1 as 1 | 2 | 3 | 4 | 5,
    department: '',
    status: 'onboarding' as Employee['status'],
    start_date: new Date().toISOString().split('T')[0],
  });

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  }

  // Create employee with auth account
  async function createEmployee() {
    if (!supabase) return;
    
    // Validate email for auth
    if (!formData.email) {
      alert('Email is required to create an account');
      return;
    }
    
    if (!password) {
      alert('Password is required');
      return;
    }

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: password,
      options: {
        data: {
          name: formData.name,
          role: formData.role,
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      alert(`Failed to create account: ${authError.message}`);
      return;
    }

    // Step 2: Create employee record
    const { error } = await supabase
      .from('employees')
      .insert([{
        ...formData,
        auth_user_id: authData.user?.id, // Link to auth user
      }]);

    if (error) {
      console.error('Error creating employee:', error);
      if (error.code === '23505') {
        alert('An employee with this email already exists');
      } else {
        alert(`Failed to create employee: ${error.message}`);
      }
      return;
    }

    // Show credentials to admin
    setCreatedCredentials({ email: formData.email, password: password });
    fetchEmployees();
  }

  // Update employee
  async function updateEmployee() {
    if (!supabase || !editingEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update(formData)
      .eq('id', editingEmployee.id);

    if (error) {
      console.error('Error updating employee:', error);
      if (error.code === '23505') {
        alert('An employee with this email already exists');
      } else {
        alert(`Failed to update employee: ${error.message}`);
      }
    } else {
      resetForm();
      fetchEmployees();
    }
  }

  // Delete employee
  async function deleteEmployee(id: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    } else {
      fetchEmployees();
    }
    setDeleteConfirm({ show: false, id: null });
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      role: 'growth_intern',
      seniority: 1,
      department: '',
      status: 'onboarding',
      start_date: new Date().toISOString().split('T')[0],
    });
    setPassword('');
    setShowPassword(false);
    setCopied(false);
    setEditingEmployee(null);
    setShowModal(false);
  }

  function handleGeneratePassword() {
    const newPassword = generatePassword();
    setPassword(newPassword);
  }

  function copyCredentials() {
    if (createdCredentials) {
      navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function closeCredentialsModal() {
    setCreatedCredentials(null);
    resetForm();
  }

  function openEditModal(employee: Employee) {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      role: employee.role || 'intern',
      seniority: employee.seniority || 1,
      department: employee.department || '',
      status: employee.status,
      start_date: employee.start_date,
    });
    setShowModal(true);
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const onboardingEmployees = employees.filter(e => e.status === 'onboarding').length;
  const thisWeek = employees.filter(e => {
    const startDate = new Date(e.start_date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return startDate >= weekAgo;
  }).length;

  return (
    <div className="module-page">
      {/* Header */}
      <header className="module-header">
        <div className="module-header-content">
          <Link href="/nucleus" className="module-back">
            <ArrowLeft size={20} />
            Back to Nucleus
          </Link>
          <div className="module-title-row">
            <div className="module-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
            <div>
              <h1>Employees & Onboarding</h1>
              <p>Manage team members, track onboarding progress, and streamline new hire workflows.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="module-main">
        {/* Stats Row */}
        <div className="module-stats-row">
          <div className="module-stat">
            <span className="module-stat-value">{totalEmployees}</span>
            <span className="module-stat-label">Total Employees</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{activeEmployees}</span>
            <span className="module-stat-label">Active</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{onboardingEmployees}</span>
            <span className="module-stat-label">In Onboarding</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{thisWeek}</span>
            <span className="module-stat-label">This Week</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              Add Employee
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          {loading ? (
            <div className="module-loading">Loading...</div>
          ) : filteredEmployees.length > 0 ? (
            <table className="module-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="module-table-name">{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>
                      <span className={`employee-role ${employee.role}`}>
                        {ROLE_LABELS[employee.role] || employee.role}
                      </span>
                    </td>
                    <td>
                      <span className={`module-status ${employee.status}`}>{employee.status}</span>
                    </td>
                    <td>{employee.start_date}</td>
                    <td>
                      <div className="module-table-actions">
                        <Link href="/workspace" className="module-table-action" title="View Workspace">
                          <ExternalLink size={14} />
                        </Link>
                        <button className="module-table-action" onClick={() => openEditModal(employee)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="module-table-action delete" onClick={() => setDeleteConfirm({ show: true, id: employee.id })}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="module-empty-state">
              <Users size={48} />
              <h3>No employees yet</h3>
              <p>Add your first team member to get started</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
              <button className="module-modal-close" onClick={() => resetForm()}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="module-form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@trailblaize.net"
                    disabled={!!editingEmployee}
                  />
                </div>
              </div>
              {!editingEmployee && (
                <div className="module-form-group">
                  <label>Password *</label>
                  <div className="password-input-group">
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter or generate password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="password-generate-btn"
                      onClick={handleGeneratePassword}
                    >
                      <RefreshCw size={16} />
                      Generate
                    </button>
                  </div>
                </div>
              )}
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                  >
                    <option value="founder">Founder</option>
                    <option value="cofounder">Co-Founder</option>
                    <option value="growth_intern">Growth Intern</option>
                    <option value="engineer">Engineer</option>
                    <option value="sales_intern">Sales Intern</option>
                    <option value="marketing_intern">Marketing Intern</option>
                    <option value="operations">Operations</option>
                  </select>
                </div>
                <div className="module-form-group">
                  <label>Seniority Level</label>
                  <select
                    value={formData.seniority}
                    onChange={(e) => setFormData({ ...formData, seniority: parseInt(e.target.value) as 1|2|3|4|5 })}
                  >
                    <option value={1}>1 - Entry</option>
                    <option value={2}>2 - Junior</option>
                    <option value={3}>3 - Mid</option>
                    <option value={4}>4 - Senior</option>
                    <option value={5}>5 - Principal</option>
                  </select>
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Engineering, Sales"
                  />
                </div>
                <div className="module-form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee['status'] })}
                  >
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="module-form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => resetForm()}>
                Cancel
              </button>
              <button
                className="module-primary-btn"
                onClick={editingEmployee ? updateEmployee : createEmployee}
                disabled={!formData.name}
              >
                {editingEmployee ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirm.id && deleteEmployee(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />

      {/* Created Credentials Modal */}
      {createdCredentials && (
        <div className="module-modal-overlay" onClick={closeCredentialsModal}>
          <div className="module-modal credentials-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>✅ Employee Created</h2>
              <button className="module-modal-close" onClick={closeCredentialsModal}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <p className="credentials-note">
                Save these credentials - the password won't be shown again!
              </p>
              <div className="credentials-box">
                <div className="credential-row">
                  <span className="credential-label">Email:</span>
                  <span className="credential-value">{createdCredentials.email}</span>
                </div>
                <div className="credential-row">
                  <span className="credential-label">Password:</span>
                  <span className="credential-value">{createdCredentials.password}</span>
                </div>
              </div>
              <button className="copy-credentials-btn" onClick={copyCredentials}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
            </div>
            <div className="module-modal-footer">
              <button className="module-primary-btn" onClick={closeCredentialsModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
