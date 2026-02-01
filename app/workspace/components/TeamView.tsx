'use client';

import React from 'react';
import { Employee, ROLE_LABELS } from '@/lib/supabase';
import { Users, ChevronDown } from 'lucide-react';

interface TeamViewProps {
  currentEmployee: Employee | null;
  teamMembers: Employee[];
  viewAsEmployee: Employee | null;
  onViewAsChange: (employee: Employee | null) => void;
}

export function TeamView({
  currentEmployee,
  teamMembers,
  viewAsEmployee,
  onViewAsChange
}: TeamViewProps) {
  const activeEmployee = viewAsEmployee || currentEmployee;

  if (!currentEmployee || teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="ws-team-switcher">
      <label className="ws-team-switcher-label">
        <Users size={14} />
        View as:
      </label>
      <div className="ws-team-select-wrapper">
        <select
          className="ws-team-select"
          value={activeEmployee?.id || ''}
          onChange={(e) => {
            if (e.target.value === currentEmployee.id) {
              onViewAsChange(null);
            } else {
              const emp = teamMembers.find(m => m.id === e.target.value);
              if (emp) onViewAsChange(emp);
            }
          }}
        >
          <option value={currentEmployee.id}>
            {currentEmployee.name} (You)
          </option>
          {teamMembers
            .filter(m => m.id !== currentEmployee.id)
            .map(member => (
              <option key={member.id} value={member.id}>
                {member.name} ({ROLE_LABELS[member.role]})
              </option>
            ))
          }
        </select>
        <ChevronDown size={14} className="ws-team-select-icon" />
      </div>
      {viewAsEmployee && (
        <span className="ws-viewing-as-badge">
          Viewing {viewAsEmployee.name}&apos;s workspace
        </span>
      )}
    </div>
  );
}

interface TeamListProps {
  teamMembers: Employee[];
  limit?: number;
}

export function TeamList({ teamMembers, limit = 4 }: TeamListProps) {
  const displayMembers = teamMembers.slice(0, limit);

  return (
    <section className="ws-card">
      <div className="ws-card-header">
        <h2>
          <Users size={18} />
          Team
        </h2>
      </div>

      <div className="ws-team-list">
        {displayMembers.map(member => (
          <div key={member.id} className="ws-team-member">
            <div className="ws-team-avatar">
              {member.name.charAt(0)}
            </div>
            <div className="ws-team-member-info">
              <span className="ws-team-name">{member.name}</span>
              <span className="ws-team-role">{ROLE_LABELS[member.role]}</span>
            </div>
            <span 
              className="ws-team-status"
              data-status={member.status}
            >
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
