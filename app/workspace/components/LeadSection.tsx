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
  Building2
} from 'lucide-react';
import { PersonalLead } from '../hooks/useWorkspaceData';

interface LeadSectionProps {
  leads: PersonalLead[];
  onCreateLead: (lead: Partial<PersonalLead>) => Promise<void>;
  onUpdateStatus: (lead: PersonalLead, status: PersonalLead['status']) => Promise<void>;
  title?: string;
  showAddButton?: boolean;
  limit?: number;
  compact?: boolean;
}

export function LeadSection({
  leads,
  onCreateLead,
  onUpdateStatus,
  title = 'My Leads',
  showAddButton = true,
  limit = 4,
  compact = false
}: LeadSectionProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    organization: '',
    email: '',
    lead_type: 'alumni' as PersonalLead['lead_type']
  });

  const displayLeads = leads
    .filter(l => !['converted', 'lost'].includes(l.status))
    .slice(0, limit);

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) return;
    await onCreateLead(newLead);
    setNewLead({ name: '', organization: '', email: '', lead_type: 'alumni' });
    setShowQuickAdd(false);
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
        </h2>
        {showAddButton && (
          <button 
            className="ws-add-btn"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showQuickAdd && (
        <div className="ws-quick-add-form">
          <input
            type="text"
            placeholder="Contact name"
            value={newLead.name}
            onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            autoFocus
          />
          <input
            type="text"
            placeholder="Organization"
            value={newLead.organization}
            onChange={(e) => setNewLead({ ...newLead, organization: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            value={newLead.email}
            onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
          />
          <select
            value={newLead.lead_type}
            onChange={(e) => setNewLead({ ...newLead, lead_type: e.target.value as PersonalLead['lead_type'] })}
          >
            <option value="alumni">Alumni</option>
            <option value="chapter">Chapter</option>
            <option value="sponsor">Sponsor</option>
            <option value="other">Other</option>
          </select>
          <div className="ws-quick-add-actions">
            <button 
              className="ws-quick-add-confirm" 
              onClick={handleCreateLead}
              disabled={!newLead.name.trim()}
            >
              <Check size={16} />
              Add Lead
            </button>
            <button 
              className="ws-quick-add-cancel" 
              onClick={() => {
                setShowQuickAdd(false);
                setNewLead({ name: '', organization: '', email: '', lead_type: 'alumni' });
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="ws-leads-list">
        {displayLeads.length === 0 ? (
          <div className="ws-empty">
            <UserPlus size={32} />
            <p>No leads yet. Add your first one!</p>
          </div>
        ) : (
          displayLeads.map(lead => (
            <div key={lead.id} className="ws-lead-item">
              <div className="ws-lead-info">
                <span className="ws-lead-name">{lead.name}</span>
                {lead.organization && (
                  <span className="ws-lead-org">
                    <Building2 size={12} />
                    {lead.organization}
                  </span>
                )}
                <div className="ws-lead-contact">
                  {lead.email && <Mail size={12} />}
                  {lead.phone && <Phone size={12} />}
                </div>
              </div>
              <select 
                className="ws-lead-status"
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead, e.target.value as PersonalLead['status'])}
                style={{ 
                  background: statusColors[lead.status]?.bg,
                  color: statusColors[lead.status]?.text
                }}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="responding">Responding</option>
                <option value="meeting_set">Meeting Set</option>
                <option value="converted">Converted ✓</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          ))
        )}
      </div>

      <Link href="/workspace/leads" className="ws-card-link">
        View All Leads
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
