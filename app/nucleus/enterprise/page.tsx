'use client';

import React from 'react';
import { ArrowLeft, Building2, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function EnterpriseModule() {
  // Placeholder data - will be replaced with real data
  const contracts = [
    { id: 1, name: 'Organization Name', type: 'IFC', stage: 'Negotiation', value: '$0', contact: 'Contact Name' },
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
            <div className="module-icon" style={{ backgroundColor: '#06b6d415', color: '#06b6d4' }}>
              <Building2 size={24} />
            </div>
            <div>
              <h1>Enterprise Contracts</h1>
              <p>Manage enterprise deals with IFCs, national organizations, and large partnerships.</p>
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
            <span className="module-stat-label">Active Contracts</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">In Negotiation</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Total Value</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Pending Signatures</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input type="text" placeholder="Search contracts..." />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn">
              <Plus size={18} />
              New Contract
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Type</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="module-table-name">{contract.name}</td>
                  <td>{contract.type}</td>
                  <td>
                    <span className="module-status pending">{contract.stage}</span>
                  </td>
                  <td>{contract.value}</td>
                  <td>{contract.contact}</td>
                  <td>
                    <button className="module-table-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="module-empty-state">
            <Building2 size={48} />
            <h3>No enterprise contracts yet</h3>
            <p>Add contracts to track enterprise partnerships</p>
          </div>
        </div>
      </main>
    </div>
  );
}
