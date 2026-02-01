'use client';

import React from 'react';
import { ArrowLeft, HeartHandshake, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function CustomerSuccessModule() {
  // Placeholder data - will be replaced with real data
  const customers = [
    { id: 1, name: 'Customer Name', organization: 'Organization', stage: 'Onboarding', health: 'Good', nextAction: 'Kickoff Call' },
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
            <div className="module-icon" style={{ backgroundColor: '#ec489915', color: '#ec4899' }}>
              <HeartHandshake size={24} />
            </div>
            <div>
              <h1>Customer Success</h1>
              <p>Track the entire onboarding and customer success process from signup to expansion.</p>
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
            <span className="module-stat-label">Active Customers</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">In Onboarding</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">At Risk</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">NPS Score</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input type="text" placeholder="Search customers..." />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn">
              <Plus size={18} />
              Add Customer
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Organization</th>
                <th>Stage</th>
                <th>Health</th>
                <th>Next Action</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="module-table-name">{customer.name}</td>
                  <td>{customer.organization}</td>
                  <td>
                    <span className="module-status pending">{customer.stage}</span>
                  </td>
                  <td>
                    <span className="module-health good">{customer.health}</span>
                  </td>
                  <td>{customer.nextAction}</td>
                  <td>
                    <button className="module-table-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="module-empty-state">
            <HeartHandshake size={48} />
            <h3>No customers tracked yet</h3>
            <p>Add customers to track their success journey</p>
          </div>
        </div>
      </main>
    </div>
  );
}
