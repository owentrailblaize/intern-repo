'use client';

import React from 'react';
import { ArrowLeft, Users, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesModule() {
  // Placeholder data - will be replaced with real data
  const employees = [
    { id: 1, name: 'Employee Name', role: 'Role', status: 'Active', startDate: '2025-01-15' },
  ];

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
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Total Employees</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Active Interns</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">In Onboarding</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">This Week</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input type="text" placeholder="Search employees..." />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn">
              <Plus size={18} />
              Add Employee
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="module-table-name">{employee.name}</td>
                  <td>{employee.role}</td>
                  <td>
                    <span className="module-status active">{employee.status}</span>
                  </td>
                  <td>{employee.startDate}</td>
                  <td>
                    <button className="module-table-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="module-empty-state">
            <Users size={48} />
            <h3>No employees yet</h3>
            <p>Add your first team member to get started</p>
          </div>
        </div>
      </main>
    </div>
  );
}
