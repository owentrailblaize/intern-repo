'use client';

import React from 'react';
import { ArrowLeft, CheckSquare, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function OperationsModule() {
  // Placeholder data - will be replaced with real data
  const tasks = [
    { id: 1, title: 'Task Title', assignee: 'Assignee', priority: 'High', dueDate: '2025-01-25', status: 'In Progress' },
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
            <div className="module-icon" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <h1>Operations & Tasks</h1>
              <p>Coordinate day-to-day activities and keep the business running smoothly.</p>
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
            <span className="module-stat-label">Open Tasks</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">In Progress</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Due Today</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Completed</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input type="text" placeholder="Search tasks..." />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn">
              <Plus size={18} />
              Add Task
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="module-table-name">{task.title}</td>
                  <td>{task.assignee}</td>
                  <td>
                    <span className="module-priority high">{task.priority}</span>
                  </td>
                  <td>{task.dueDate}</td>
                  <td>
                    <span className="module-status pending">{task.status}</span>
                  </td>
                  <td>
                    <button className="module-table-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="module-empty-state">
            <CheckSquare size={48} />
            <h3>No tasks yet</h3>
            <p>Create tasks to track your operations</p>
          </div>
        </div>
      </main>
    </div>
  );
}
