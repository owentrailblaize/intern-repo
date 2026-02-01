'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Network, Plus, Search, Filter, X, Trash2, Edit2, Phone, Mail, Linkedin, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { supabase, NetworkContact } from '@/lib/supabase';

export default function FundraisingModule() {
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<NetworkContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    organization: '',
    phone: '',
    email: '',
    linkedin: '',
    contact_type: 'other' as NetworkContact['contact_type'],
    priority: 'warm' as NetworkContact['priority'],
    stage: 'identified' as NetworkContact['stage'],
    first_contact_date: '',
    last_contact_date: '',
    next_followup_date: '',
    potential_value: '',
    how_they_can_help: '',
    how_we_met: '',
    referred_by: '',
    notes: '',
  });

  // Fetch contacts
  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('network_contacts')
      .select('*')
      .order('priority', { ascending: true })
      .order('next_followup_date', { ascending: true });

    if (error) {
      console.error('Error fetching contacts:', error);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  }

  // Create contact
  async function createContact() {
    if (!supabase) return;
    const { error } = await supabase
      .from('network_contacts')
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
    if (!supabase || !editingContact) return;

    const { error } = await supabase
      .from('network_contacts')
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

  // Log followup (quick action)
  async function logFollowup(contact: NetworkContact) {
    if (!supabase) return;
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('network_contacts')
      .update({
        last_contact_date: today,
        next_followup_date: nextWeek,
        followup_count: (contact.followup_count || 0) + 1,
        first_contact_date: contact.first_contact_date || today,
      })
      .eq('id', contact.id);

    if (error) {
      console.error('Error logging followup:', error);
    } else {
      fetchContacts();
    }
  }

  // Delete contact
  async function deleteContact(id: string) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const { error } = await supabase
      .from('network_contacts')
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
      title: '',
      organization: '',
      phone: '',
      email: '',
      linkedin: '',
      contact_type: 'other',
      priority: 'warm',
      stage: 'identified',
      first_contact_date: '',
      last_contact_date: '',
      next_followup_date: '',
      potential_value: '',
      how_they_can_help: '',
      how_we_met: '',
      referred_by: '',
      notes: '',
    });
    setEditingContact(null);
    setShowModal(false);
  }

  function openEditModal(contact: NetworkContact) {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      title: contact.title || '',
      organization: contact.organization || '',
      phone: contact.phone || '',
      email: contact.email || '',
      linkedin: contact.linkedin || '',
      contact_type: contact.contact_type,
      priority: contact.priority,
      stage: contact.stage,
      first_contact_date: contact.first_contact_date || '',
      last_contact_date: contact.last_contact_date || '',
      next_followup_date: contact.next_followup_date || '',
      potential_value: contact.potential_value || '',
      how_they_can_help: contact.how_they_can_help || '',
      how_we_met: contact.how_we_met || '',
      referred_by: contact.referred_by || '',
      notes: contact.notes || '',
    });
    setShowModal(true);
  }

  // Filter contacts
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.organization && c.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || c.contact_type === filterType;
    const matchesPriority = filterPriority === 'all' || c.priority === filterPriority;
    return matchesSearch && matchesType && matchesPriority;
  });

  // Calculate stats
  const totalContacts = contacts.length;
  const hotContacts = contacts.filter(c => c.priority === 'hot').length;
  const needsFollowup = contacts.filter(c => {
    if (!c.next_followup_date) return false;
    return new Date(c.next_followup_date) <= new Date();
  }).length;
  const investors = contacts.filter(c => ['investor', 'angel', 'vc'].includes(c.contact_type)).length;

  const typeLabels: Record<NetworkContact['contact_type'], string> = {
    investor: 'Investor',
    angel: 'Angel',
    vc: 'VC',
    partnership: 'Partnership',
    competitor: 'Competitor',
    connector: 'Connector',
    ifc_president: 'IFC President',
    ifc_advisor: 'IFC Advisor',
    greek_life: 'Greek Life',
    consultant: 'Consultant',
    other: 'Other',
  };

  const stageLabels: Record<NetworkContact['stage'], string> = {
    identified: 'Identified',
    researching: 'Researching',
    outreach_pending: 'Outreach Pending',
    first_contact: 'First Contact',
    follow_up: 'Follow Up',
    in_conversation: 'In Conversation',
    meeting_scheduled: 'Meeting Scheduled',
    met: 'Met',
    nurturing: 'Nurturing',
    committed: 'Committed',
    passed: 'Passed',
    dormant: 'Dormant',
  };

  const priorityLabels: Record<NetworkContact['priority'], string> = {
    hot: '🔥 Hot',
    warm: '☀️ Warm',
    cold: '❄️ Cold',
  };

  function isOverdue(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
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
            <div className="module-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
              <Network size={24} />
            </div>
            <div>
              <h1>Network & Fundraising</h1>
              <p>Your networking machine: investors, connectors, IFCs, and partnerships all in one place.</p>
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
            <span className="module-stat-value" style={{ color: '#ef4444' }}>{hotContacts}</span>
            <span className="module-stat-label">🔥 Hot Leads</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value" style={{ color: needsFollowup > 0 ? '#f59e0b' : undefined }}>{needsFollowup}</span>
            <span className="module-stat-label">Needs Follow-up</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{investors}</span>
            <span className="module-stat-label">Investors</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="module-actions">
            <select 
              className="module-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select 
              className="module-filter-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">☀️ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
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
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Stage</th>
                  <th>Priority</th>
                  <th>Next Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className={isOverdue(contact.next_followup_date) ? 'overdue-row' : ''}>
                    <td>
                      <div className="contact-cell">
                        <span className="module-table-name">{contact.name}</span>
                        <span className="contact-subtitle">
                          {contact.title}{contact.title && contact.organization ? ' @ ' : ''}{contact.organization}
                        </span>
                        <div className="contact-links">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="contact-link" title={contact.phone}>
                              <Phone size={12} />
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="contact-link" title={contact.email}>
                              <Mail size={12} />
                            </a>
                          )}
                          {contact.linkedin && (
                            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="contact-link">
                              <Linkedin size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`module-type ${contact.contact_type}`}>{typeLabels[contact.contact_type]}</span>
                    </td>
                    <td>
                      <span className={`module-status ${contact.stage}`}>{stageLabels[contact.stage]}</span>
                    </td>
                    <td>
                      <span className={`module-priority ${contact.priority}`}>{priorityLabels[contact.priority]}</span>
                    </td>
                    <td>
                      {contact.next_followup_date ? (
                        <span className={isOverdue(contact.next_followup_date) ? 'overdue-date' : ''}>
                          {contact.next_followup_date}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="module-table-actions">
                        <button 
                          className="module-table-action followup" 
                          onClick={() => logFollowup(contact)}
                          title="Log follow-up"
                        >
                          <Clock size={14} />
                        </button>
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
              <Network size={48} />
              <h3>No contacts yet</h3>
              <p>Start building your network</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal module-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
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
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. CEO, IFC President"
                  />
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="Company or school"
                  />
                </div>
                <div className="module-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="module-form-group">
                  <label>LinkedIn</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Contact Type</label>
                  <select
                    value={formData.contact_type}
                    onChange={(e) => setFormData({ ...formData, contact_type: e.target.value as NetworkContact['contact_type'] })}
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="module-form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as NetworkContact['priority'] })}
                  >
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">☀️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>
                <div className="module-form-group">
                  <label>Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as NetworkContact['stage'] })}
                  >
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>First Contact Date</label>
                  <input
                    type="date"
                    value={formData.first_contact_date}
                    onChange={(e) => setFormData({ ...formData, first_contact_date: e.target.value })}
                  />
                </div>
                <div className="module-form-group">
                  <label>Last Contact Date</label>
                  <input
                    type="date"
                    value={formData.last_contact_date}
                    onChange={(e) => setFormData({ ...formData, last_contact_date: e.target.value })}
                  />
                </div>
                <div className="module-form-group">
                  <label>Next Follow-up</label>
                  <input
                    type="date"
                    value={formData.next_followup_date}
                    onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="module-form-group">
                <label>How They Can Help</label>
                <textarea
                  value={formData.how_they_can_help}
                  onChange={(e) => setFormData({ ...formData, how_they_can_help: e.target.value })}
                  placeholder="What value can they bring? Intros, funding, expertise..."
                  rows={2}
                />
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>How We Met</label>
                  <input
                    type="text"
                    value={formData.how_we_met}
                    onChange={(e) => setFormData({ ...formData, how_we_met: e.target.value })}
                    placeholder="e.g. Conference, intro from..."
                  />
                </div>
                <div className="module-form-group">
                  <label>Referred By</label>
                  <input
                    type="text"
                    value={formData.referred_by}
                    onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                    placeholder="Who made the intro?"
                  />
                </div>
              </div>
              <div className="module-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional context, conversation history..."
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
