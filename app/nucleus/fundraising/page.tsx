'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Rocket, Plus, Search, Filter, X, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { supabase, FundraisingContact } from '@/lib/supabase';

export default function FundraisingModule() {
  const [contacts, setContacts] = useState<FundraisingContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<FundraisingContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    firm: '',
    email: '',
    stage: 'outreach' as FundraisingContact['stage'],
    notes: '',
    last_contact: new Date().toISOString().split('T')[0],
  });

  // Fetch contacts
  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fundraising_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  }

  // Create contact
  async function createContact() {
    const { error } = await supabase
      .from('fundraising_contacts')
      .insert([formData]);

    if (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact');
    } else {
      resetForm();
      fetchContacts();
    }
  }

  // Update contact
  async function updateContact() {
    if (!editingContact) return;

    const { error } = await supabase
      .from('fundraising_contacts')
      .update(formData)
      .eq('id', editingContact.id);

    if (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    } else {
      resetForm();
      fetchContacts();
    }
  }

  // Delete contact
  async function deleteContact(id: string) {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const { error } = await supabase
      .from('fundraising_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    } else {
      fetchContacts();
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      firm: '',
      email: '',
      stage: 'outreach',
      notes: '',
      last_contact: new Date().toISOString().split('T')[0],
    });
    setEditingContact(null);
    setShowModal(false);
  }

  function openEditModal(contact: FundraisingContact) {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      firm: contact.firm || '',
      email: contact.email || '',
      stage: contact.stage,
      notes: contact.notes || '',
      last_contact: contact.last_contact,
    });
    setShowModal(true);
  }

  // Filter contacts
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.firm && c.firm.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate stats
  const totalContacts = contacts.length;
  const activeConvos = contacts.filter(c => c.stage === 'in_conversation').length;
  const meetingsSet = contacts.filter(c => c.stage === 'meeting_set').length;
  const committed = contacts.filter(c => c.stage === 'committed').length;

  const stageLabels: Record<FundraisingContact['stage'], string> = {
    outreach: 'Outreach',
    meeting_set: 'Meeting Set',
    in_conversation: 'In Conversation',
    committed: 'Committed',
    passed: 'Passed',
  };

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
            <span className="module-stat-value">{totalContacts}</span>
            <span className="module-stat-label">Total Contacts</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{activeConvos}</span>
            <span className="module-stat-label">Active Convos</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{meetingsSet}</span>
            <span className="module-stat-label">Meetings Set</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{committed}</span>
            <span className="module-stat-label">Committed</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search investors..."
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
              Add Contact
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          {loading ? (
            <div className="module-loading">Loading...</div>
          ) : filteredContacts.length > 0 ? (
            <table className="module-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Firm</th>
                  <th>Email</th>
                  <th>Stage</th>
                  <th>Last Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="module-table-name">{contact.name}</td>
                    <td>{contact.firm}</td>
                    <td>{contact.email}</td>
                    <td>
                      <span className={`module-status ${contact.stage}`}>{stageLabels[contact.stage]}</span>
                    </td>
                    <td>{contact.last_contact}</td>
                    <td>
                      <div className="module-table-actions">
                        <button className="module-table-action" onClick={() => openEditModal(contact)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="module-table-action delete" onClick={() => deleteContact(contact.id)}>
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
              <Rocket size={48} />
              <h3>No investor contacts yet</h3>
              <p>Start building your fundraising network</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
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
                  placeholder="Enter name"
                />
              </div>
              <div className="module-form-group">
                <label>Firm</label>
                <input
                  type="text"
                  value={formData.firm}
                  onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                  placeholder="e.g. Sequoia Capital"
                />
              </div>
              <div className="module-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="module-form-group">
                <label>Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as FundraisingContact['stage'] })}
                >
                  <option value="outreach">Outreach</option>
                  <option value="meeting_set">Meeting Set</option>
                  <option value="in_conversation">In Conversation</option>
                  <option value="committed">Committed</option>
                  <option value="passed">Passed</option>
                </select>
              </div>
              <div className="module-form-group">
                <label>Last Contact</label>
                <input
                  type="date"
                  value={formData.last_contact}
                  onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })}
                />
              </div>
              <div className="module-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => resetForm()}>
                Cancel
              </button>
              <button
                className="module-primary-btn"
                onClick={editingContact ? updateContact : createContact}
                disabled={!formData.name}
              >
                {editingContact ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
