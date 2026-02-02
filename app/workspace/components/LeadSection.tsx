'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Target,
  UserPlus,
  Plus,
  Mail,
  Phone,
  ArrowRight,
  X,
  Check,
  Building2,
  Trash2,
  Edit3,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { PersonalLead } from '../hooks/useWorkspaceData';

interface LeadSectionProps {
  leads: PersonalLead[];
  onCreateLead: (lead: Partial<PersonalLead>) => Promise<PersonalLead | null>;
  onUpdateStatus: (lead: PersonalLead, status: PersonalLead['status']) => Promise<void>;
  onUpdateLead?: (leadId: string, updates: Partial<PersonalLead>) => Promise<PersonalLead | null>;
  onDeleteLead?: (leadId: string) => Promise<boolean>;
  title?: string;
  showAddButton?: boolean;
  limit?: number;
  compact?: boolean;
  loading?: boolean;
}

export function LeadSection({
  leads,
  onCreateLead,
  onUpdateStatus,
  onUpdateLead,
  onDeleteLead,
  title = 'My Leads',
  showAddButton = true,
  limit = 4,
  compact = false,
  loading = false
}: LeadSectionProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    lead_type: 'alumni' as PersonalLead['lead_type'],
    notes: ''
  });
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<Partial<PersonalLead>>({});
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);

  const displayLeads = leads
    .filter(l => !['converted', 'lost'].includes(l.status))
    .slice(0, limit);

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) return;
    setIsCreating(true);
    
    await onCreateLead(newLead);
    
    setNewLead({ name: '', organization: '', email: '', phone: '', lead_type: 'alumni', notes: '' });
    setShowQuickAdd(false);
    setIsCreating(false);
  };

  const handleUpdateLead = async (leadId: string) => {
    if (!onUpdateLead) return;
    
    await onUpdateLead(leadId, editLead);
    setEditingLeadId(null);
    setEditLead({});
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!onDeleteLead) return;
    
    setDeletingLeadId(leadId);
    await onDeleteLead(leadId);
    setDeletingLeadId(null);
    setShowDeleteConfirm(null);
    setShowActionsFor(null);
  };

  const startEditing = (lead: PersonalLead) => {
    setEditingLeadId(lead.id);
    setEditLead({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      organization: lead.organization || '',
      lead_type: lead.lead_type,
      notes: lead.notes || ''
    });
    setShowActionsFor(null);
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    new: { bg: '#f3f4f6', text: '#6b7280' },
    contacted: { bg: '#dbeafe', text: '#2563eb' },
    responding: { bg: '#e0e7ff', text: '#4f46e5' },
    meeting_set: { bg: '#fef3c7', text: '#d97706' },
    converted: { bg: '#dcfce7', text: '#16a34a' },
    lost: { bg: '#fee2e2', text: '#dc2626' },
  };

  return (
    <section className="ws-card">
      <div className="ws-card-header">
        <h2>
          <Target size={18} />
          {title}
          {loading && <Loader2 size={14} className="ws-spinner" />}
        </h2>
        {showAddButton && (
          <button 
            className="ws-add-btn"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus size={16} />
            {!compact && 'Add Lead'}
          </button>
        )}
      </div>

      {showQuickAdd && (
        <div className="ws-quick-add-form ws-lead-form">
          <input
            type="text"
            placeholder="Contact name *"
            value={newLead.name}
            onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            autoFocus
            disabled={isCreating}
          />
          <input
            type="text"
            placeholder="Organization"
            value={newLead.organization}
            onChange={(e) => setNewLead({ ...newLead, organization: e.target.value })}
            disabled={isCreating}
          />
          <div className="ws-form-row">
            <input
              type="email"
              placeholder="Email"
              value={newLead.email}
              onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              disabled={isCreating}
            />
            <input
              type="tel"
              placeholder="Phone"
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              disabled={isCreating}
            />
          </div>
          <select
            value={newLead.lead_type}
            onChange={(e) => setNewLead({ ...newLead, lead_type: e.target.value as PersonalLead['lead_type'] })}
            disabled={isCreating}
          >
            <option value="alumni">Alumni</option>
            <option value="chapter">Chapter</option>
            <option value="sponsor">Sponsor</option>
            <option value="other">Other</option>
          </select>
          <textarea
            placeholder="Notes (optional)"
            value={newLead.notes}
            onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
            disabled={isCreating}
            rows={2}
          />
          <div className="ws-quick-add-actions">
            <button 
              className="ws-quick-add-confirm" 
              onClick={handleCreateLead}
              disabled={!newLead.name.trim() || isCreating}
            >
              {isCreating ? <Loader2 size={16} className="ws-spinner" /> : <Check size={16} />}
              {isCreating ? 'Creating...' : 'Add Lead'}
            </button>
            <button 
              className="ws-quick-add-cancel" 
              onClick={() => {
                setShowQuickAdd(false);
                setNewLead({ name: '', organization: '', email: '', phone: '', lead_type: 'alumni', notes: '' });
              }}
              disabled={isCreating}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLeadId && (
        <div className="ws-modal-overlay" onClick={() => { setEditingLeadId(null); setEditLead({}); }}>
          <div className="ws-modal" onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Edit Lead</h3>
              <button onClick={() => { setEditingLeadId(null); setEditLead({}); }}>
                <X size={18} />
              </button>
            </div>
            <div className="ws-modal-body">
              <div className="ws-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={editLead.name || ''}
                  onChange={(e) => setEditLead({ ...editLead, name: e.target.value })}
                />
              </div>
              <div className="ws-form-group">
                <label>Organization</label>
                <input
                  type="text"
                  value={editLead.organization || ''}
                  onChange={(e) => setEditLead({ ...editLead, organization: e.target.value })}
                />
              </div>
              <div className="ws-form-row">
                <div className="ws-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editLead.email || ''}
                    onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                  />
                </div>
                <div className="ws-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={editLead.phone || ''}
                    onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="ws-form-group">
                <label>Lead Type</label>
                <select
                  value={editLead.lead_type || 'other'}
                  onChange={(e) => setEditLead({ ...editLead, lead_type: e.target.value as PersonalLead['lead_type'] })}
                >
                  <option value="alumni">Alumni</option>
                  <option value="chapter">Chapter</option>
                  <option value="sponsor">Sponsor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="ws-form-group">
                <label>Notes</label>
                <textarea
                  value={editLead.notes || ''}
                  onChange={(e) => setEditLead({ ...editLead, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="ws-modal-footer">
              <button className="ws-btn-secondary" onClick={() => { setEditingLeadId(null); setEditLead({}); }}>
                Cancel
              </button>
              <button 
                className="ws-btn-primary" 
                onClick={() => handleUpdateLead(editingLeadId)}
                disabled={!editLead.name?.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ws-leads-list">
        {loading && leads.length === 0 ? (
          <div className="ws-loading">
            <Loader2 size={24} className="ws-spinner" />
            <p>Loading leads...</p>
          </div>
        ) : displayLeads.length === 0 ? (
          <div className="ws-empty">
            <UserPlus size={32} />
            <p>No leads yet. Add your first one!</p>
          </div>
        ) : (
          displayLeads.map(lead => {
            const isDeleting = deletingLeadId === lead.id;
            const showConfirm = showDeleteConfirm === lead.id;
            const showActions = showActionsFor === lead.id;
            
            return (
              <div key={lead.id} className={`ws-lead-item ${isDeleting ? 'deleting' : ''}`}>
                <div className="ws-lead-info">
                  <span className="ws-lead-name">{lead.name}</span>
                  {lead.organization && (
                    <span className="ws-lead-org">
                      <Building2 size={12} />
                      {lead.organization}
                    </span>
                  )}
                  <div className="ws-lead-contact">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} title={lead.email}>
                        <Mail size={12} />
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} title={lead.phone}>
                        <Phone size={12} />
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="ws-lead-actions">
                  <select 
                    className="ws-lead-status"
                    value={lead.status}
                    onChange={(e) => onUpdateStatus(lead, e.target.value as PersonalLead['status'])}
                    style={{ 
                      background: statusColors[lead.status]?.bg,
                      color: statusColors[lead.status]?.text
                    }}
                    disabled={isDeleting}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="responding">Responding</option>
                    <option value="meeting_set">Meeting Set</option>
                    <option value="converted">Converted ✓</option>
                    <option value="lost">Lost</option>
                  </select>

                  {(onUpdateLead || onDeleteLead) && (
                    <div className="ws-lead-menu">
                      <button
                        className="ws-menu-trigger"
                        onClick={() => setShowActionsFor(showActions ? null : lead.id)}
                        disabled={isDeleting}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {showActions && (
                        <div className="ws-menu-dropdown">
                          {onUpdateLead && (
                            <button onClick={() => startEditing(lead)}>
                              <Edit3 size={14} />
                              Edit
                            </button>
                          )}
                          {onDeleteLead && (
                            showConfirm ? (
                              <div className="ws-menu-confirm">
                                <span>Delete?</span>
                                <button 
                                  className="confirm-yes"
                                  onClick={() => handleDeleteLead(lead.id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? <Loader2 size={12} className="ws-spinner" /> : 'Yes'}
                                </button>
                                <button 
                                  className="confirm-no"
                                  onClick={() => setShowDeleteConfirm(null)}
                                  disabled={isDeleting}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="delete"
                                onClick={() => setShowDeleteConfirm(lead.id)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link href="/workspace/leads" className="ws-card-link">
        View All Leads
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
