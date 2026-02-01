'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  Send,
  UserPlus,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  Star
} from 'lucide-react';
import { TaskSection } from '../TaskSection';
import { LeadSection } from '../LeadSection';
import { FocusTimer } from '../FocusTimer';
import { MetricsCards } from '../MetricsCards';
import { TeamList } from '../TeamView';
import { UseWorkspaceDataReturn, WorkspaceStats } from '../../hooks/useWorkspaceData';
import { Employee } from '@/lib/supabase';

interface InternDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

/**
 * Growth Intern Dashboard
 * Focus: Speed, collaboration, and productivity
 */
export function InternDashboard({ data, teamMembers }: InternDashboardProps) {
  const {
    tasks,
    leads,
    stats,
    createTask,
    toggleTask,
    createLead,
    updateLeadStatus
  } = data;

  // Quick action handlers
  const quickActions = [
    { label: 'Add Task', icon: CheckSquare, onClick: () => {} }, // Will trigger task modal
    { label: 'Add Lead', icon: UserPlus, href: '/workspace/leads?add=true' },
    { label: 'Send Message', icon: Send, href: '/workspace/inbox?compose=true' },
  ];

  // Calculate intern-specific stats
  const thisWeekTasks = tasks.filter(t => {
    if (t.status !== 'done') return false;
    const completed = new Date(t.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completed >= weekAgo;
  }).length;

  return (
    <div className="ws-dashboard ws-dashboard-intern">
      {/* Metrics */}
      <MetricsCards stats={stats} />

      {/* Quick Actions - Prominent for speed */}
      <div className="ws-quick-actions-bar">
        <span className="ws-quick-actions-label">
          <Zap size={14} />
          Quick Actions
        </span>
        <div className="ws-quick-actions-buttons">
          {quickActions.map((action) => (
            action.href ? (
              <Link 
                key={action.label} 
                href={action.href} 
                className="ws-quick-action-btn"
              >
                <action.icon size={16} />
                {action.label}
              </Link>
            ) : (
              <button 
                key={action.label} 
                className="ws-quick-action-btn"
                onClick={action.onClick}
              >
                <action.icon size={16} />
                {action.label}
              </button>
            )
          ))}
        </div>
        <div className="ws-keyboard-hint">
          <kbd>⌘K</kbd> to search
        </div>
      </div>

      {/* Main Grid */}
      <div className="ws-grid ws-grid-intern">
        {/* Left Column - Tasks and Leads */}
        <div className="ws-col-main">
          {/* Priority Tasks - Top 5 */}
          <TaskSection
            tasks={tasks}
            onToggleTask={toggleTask}
            onCreateTask={createTask}
            title="Priority Tasks"
            limit={5}
          />

          {/* Leads / Alumni Outreach */}
          <LeadSection
            leads={leads}
            onCreateLead={createLead}
            onUpdateStatus={updateLeadStatus}
            title="🎯 Alumni Outreach"
            limit={4}
          />
        </div>

        {/* Right Column - Timer, Activity, Team */}
        <div className="ws-col-side">
          {/* Focus Timer - Prominent */}
          <FocusTimer />

          {/* Weekly Progress */}
          <section className="ws-card ws-progress-card">
            <div className="ws-card-header">
              <h3>
                <TrendingUp size={16} />
                This Week
              </h3>
            </div>
            <div className="ws-progress-stats">
              <div className="ws-progress-stat">
                <span className="ws-progress-value">{thisWeekTasks}</span>
                <span className="ws-progress-label">Tasks Completed</span>
              </div>
              <div className="ws-progress-stat">
                <span className="ws-progress-value">
                  {leads.filter(l => l.status === 'contacted').length}
                </span>
                <span className="ws-progress-label">Contacts Made</span>
              </div>
            </div>
          </section>

          {/* Collaboration Feed */}
          <section className="ws-card">
            <div className="ws-card-header">
              <h3>
                <MessageSquare size={16} />
                Team Activity
              </h3>
            </div>
            <div className="ws-activity-feed">
              <div className="ws-activity-item">
                <div className="ws-activity-dot" style={{ background: '#10b981' }} />
                <span>New task assigned by team lead</span>
                <span className="ws-activity-time">2h ago</span>
              </div>
              <div className="ws-activity-item">
                <div className="ws-activity-dot" style={{ background: '#3b82f6' }} />
                <span>Weekly sync scheduled</span>
                <span className="ws-activity-time">4h ago</span>
              </div>
            </div>
          </section>

          {/* Team */}
          <TeamList teamMembers={teamMembers} limit={3} />
        </div>
      </div>
    </div>
  );
}
