'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, HeartHandshake, Plus, Search, Filter, X, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { supabase, Customer } from '@/lib/supabase';

export default function CustomerSuccessModule() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    stage: 'onboarding' as Customer['stage'],
    health: 'good' as Customer['health'],
    next_action: '',
    mrr: 0,
  });

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }

  // Create customer
  async function createCustomer() {
    if (!supabase) return;
    const { error } = await supabase
      .from('customers')
      .insert([formData]);

    if (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    } else {
      resetForm();
      fetchCustomers();
    }
  }

  // Update customer
  async function updateCustomer() {
    if (!supabase || !editingCustomer) return;

    const { error } = await supabase
      .from('customers')
      .update(formData)
      .eq('id', editingCustomer.id);

    if (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    } else {
      resetForm();
      fetchCustomers();
    }
  }

  // Delete customer
  async function deleteCustomer(id: string) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this customer?')) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    } else {
      fetchCustomers();
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      organization: '',
      email: '',
      stage: 'onboarding',
      health: 'good',
      next_action: '',
      mrr: 0,
    });
    setEditingCustomer(null);
    setShowModal(false);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      organization: customer.organization || '',
      email: customer.email || '',
      stage: customer.stage,
      health: customer.health,
      next_action: customer.next_action || '',
      mrr: customer.mrr || 0,
    });
    setShowModal(true);
  }

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.organization && c.organization.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate stats
  const activeCustomers = customers.filter(c => c.stage === 'active').length;
  const inOnboarding = customers.filter(c => c.stage === 'onboarding').length;
  const atRisk = customers.filter(c => c.stage === 'at_risk' || c.health === 'critical').length;
  const totalMRR = customers.reduce((sum, c) => sum + (c.mrr || 0), 0);

  const stageLabels: Record<Customer['stage'], string> = {
    onboarding: 'Onboarding',
    active: 'Active',
    at_risk: 'At Risk',
    churned: 'Churned',
  };

  const healthLabels: Record<Customer['health'], string> = {
    good: 'Good',
    warning: 'Warning',
    critical: 'Critical',
  };

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

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
            <span className="module-stat-value">{activeCustomers}</span>
            <span className="module-stat-label">Active Customers</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{inOnboarding}</span>
            <span className="module-stat-label">In Onboarding</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{atRisk}</span>
            <span className="module-stat-label">At Risk</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{formatCurrency(totalMRR)}</span>
            <span className="module-stat-label">Total MRR</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search customers..."
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
              Add Customer
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          {loading ? (
            <div className="module-loading">Loading...</div>
          ) : filteredCustomers.length > 0 ? (
            <table className="module-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Organization</th>
                  <th>Stage</th>
                  <th>Health</th>
                  <th>MRR</th>
                  <th>Next Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="module-table-name">{customer.name}</td>
                    <td>{customer.organization}</td>
                    <td>
                      <span className={`module-status ${customer.stage}`}>{stageLabels[customer.stage]}</span>
                    </td>
                    <td>
                      <span className={`module-health ${customer.health}`}>{healthLabels[customer.health]}</span>
                    </td>
                    <td>{formatCurrency(customer.mrr)}</td>
                    <td>{customer.next_action || '—'}</td>
                    <td>
                      <div className="module-table-actions">
                        <button className="module-table-action" onClick={() => openEditModal(customer)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="module-table-action delete" onClick={() => deleteCustomer(customer.id)}>
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
              <HeartHandshake size={48} />
              <h3>No customers tracked yet</h3>
              <p>Add customers to track their success journey</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button className="module-modal-close" onClick={() => resetForm()}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <div className="module-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="module-form-group">
                <label>Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Company or school name"
                />
              </div>
              <div className="module-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
              <div className="module-form-group">
                <label>Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as Customer['stage'] })}
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="at_risk">At Risk</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
              <div className="module-form-group">
                <label>Health</label>
                <select
                  value={formData.health}
                  onChange={(e) => setFormData({ ...formData, health: e.target.value as Customer['health'] })}
                >
                  <option value="good">Good</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="module-form-group">
                <label>MRR ($)</label>
                <input
                  type="number"
                  value={formData.mrr}
                  onChange={(e) => setFormData({ ...formData, mrr: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="module-form-group">
                <label>Next Action</label>
                <input
                  type="text"
                  value={formData.next_action}
                  onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                  placeholder="e.g. Schedule check-in call"
                />
              </div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => resetForm()}>
                Cancel
              </button>
              <button
                className="module-primary-btn"
                onClick={editingCustomer ? updateCustomer : createCustomer}
                disabled={!formData.name}
              >
                {editingCustomer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
