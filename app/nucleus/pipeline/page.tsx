'use client';

import React from 'react';
import { ArrowLeft, TrendingUp, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function PipelineModule() {
  // Placeholder data - will be replaced with real data
  const deals = [
    { id: 1, name: 'Deal Name', organization: 'Organization', value: '$0', stage: 'Discovery', probability: '0%' },
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
            <div className="module-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h1>Sales Pipeline</h1>
              <p>Monitor deals, track velocity, and manage opportunities through your funnel.</p>
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
            <span className="module-stat-label">Pipeline Value</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Active Deals</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Won This Month</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">—</span>
            <span className="module-stat-label">Avg Deal Size</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input type="text" placeholder="Search deals..." />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn">
              <Plus size={18} />
              Create Deal
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          <table className="module-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Organization</th>
                <th>Value</th>
                <th>Stage</th>
                <th>Probability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td className="module-table-name">{deal.name}</td>
                  <td>{deal.organization}</td>
                  <td>{deal.value}</td>
                  <td>
                    <span className="module-status pending">{deal.stage}</span>
                  </td>
                  <td>{deal.probability}</td>
                  <td>
                    <button className="module-table-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="module-empty-state">
            <TrendingUp size={48} />
            <h3>No deals in pipeline</h3>
            <p>Create your first deal to start tracking</p>
          </div>
        </div>
      </main>
    </div>
  );
}
