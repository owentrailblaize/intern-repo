'use client';

import React from 'react';
import { ArrowLeft, Rocket, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function FundraisingModule() {
  // Placeholder data - will be replaced with real data
  const contacts = [
    { id: 1, name: 'Investor Name', firm: 'Firm Name', stage: 'Outreach', lastContact: '2025-01-20' },
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
            <div className="module-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
              <Rocket size={24} />
            </div>
            <div>
              <h1>Fundraising & Network</h1>
              <p>Build investor relationships, track outreach, and manage your fundraising pipeline.</p>
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
            <span className="module-stat-label">Total Contacts</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Active Convos</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Meetings Set</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Intros Pending</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input type="text" placeholder="Search investors..." />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn">
              <Plus size={18} />
              Add Contact
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Firm</th>
                <th>Stage</th>
                <th>Last Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="module-table-name">{contact.name}</td>
                  <td>{contact.firm}</td>
                  <td>
                    <span className="module-status pending">{contact.stage}</span>
                  </td>
                  <td>{contact.lastContact}</td>
                  <td>
                    <button className="module-table-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="module-empty-state">
            <Rocket size={48} />
            <h3>No investor contacts yet</h3>
            <p>Start building your fundraising network</p>
          </div>
        </div>
      </main>
    </div>
  );
}
