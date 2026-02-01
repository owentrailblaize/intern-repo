'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Target,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Briefcase,
  ArrowRight
} from 'lucide-react';
import { TaskSection } from '../TaskSection';
import { LeadSection } from '../LeadSection';
import { FocusTimer } from '../FocusTimer';
import { MetricsCards } from '../MetricsCards';
import { TeamView, TeamList } from '../TeamView';
import { GoogleCalendarWidget } from '../GoogleCalendarWidget';
import { GoogleGmailWidget } from '../GoogleGmailWidget';
import { GoogleIntegrationCard } from '../GoogleIntegrationCard';
import { UseWorkspaceDataReturn } from '../../hooks/useWorkspaceData';
import { useGoogleIntegration } from '../../hooks/useGoogleIntegration';
import { Employee } from '@/lib/supabase';

interface FounderDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

/**
 * Founder Dashboard
 * Focus: Personal productivity FIRST, strategic oversight SECOND
 */
export function FounderDashboard({ data, teamMembers }: FounderDashboardProps) {
  const {
    currentEmployee,
    viewAsEmployee,
    setViewAsEmployee,
    tasks,
    leads,
    stats,
    createTask,
    toggleTask,
    createLead,
    updateLeadStatus,
  } = data;

  const [showTeamMetrics, setShowTeamMetrics] = useState(false);

  // Google Integration
  const google = useGoogleIntegration(currentEmployee?.id);

  // Priority tasks for this week
  const thisWeekTasks = tasks.filter(t => {
    if (!t.due_date) return t.status !== 'done';
    const due = new Date(t.due_date);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return due <= nextWeek && t.status !== 'done';
  });

  return (
    <div className="ws-dashboard ws-dashboard-founder">
      {/* Team Switcher (top-right, non-intrusive) */}
      <div className="ws-founder-header">
        <div className="ws-founder-greeting">
          <h2>Personal Workspace</h2>
          <p>Focus on your priorities. Team metrics are secondary.</p>
        </div>
        <TeamView
          currentEmployee={currentEmployee}
          teamMembers={teamMembers}
          viewAsEmployee={viewAsEmployee}
          onViewAsChange={setViewAsEmployee}
        />
      </div>

      {/* Personal Metrics */}
      <MetricsCards stats={stats} />

      {/* Main Grid */}
      <div className="ws-grid ws-grid-founder">
        {/* Left Column - Personal Productivity */}
        <div className="ws-col-main">
          {/* Priority Tasks */}
          <TaskSection
            tasks={thisWeekTasks}
            onToggleTask={toggleTask}
            onCreateTask={createTask}
            title="My Priority Tasks"
            limit={6}
          />

          {/* Active Leads/Deals */}
          <LeadSection
            leads={leads}
            onCreateLead={createLead}
            onUpdateStatus={updateLeadStatus}
            title="My Active Leads"
            limit={4}
          />

          {/* Strategic Initiatives */}
          <section className="ws-card ws-strategic-card">
            <div className="ws-card-header">
              <h2>
                <Briefcase size={18} />
                Strategic Projects
              </h2>
              <Link href="/workspace/projects" className="ws-see-all">
                See all
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="ws-strategic-list">
              <div className="ws-strategic-item">
                <div className="ws-strategic-progress" style={{ '--progress': '65%' } as React.CSSProperties} />
                <div className="ws-strategic-info">
                  <span className="ws-strategic-title">Q1 Growth Targets</span>
                  <span className="ws-strategic-meta">65% complete • Due Feb 28</span>
                </div>
              </div>
              <div className="ws-strategic-item">
                <div className="ws-strategic-progress" style={{ '--progress': '30%' } as React.CSSProperties} />
                <div className="ws-strategic-info">
                  <span className="ws-strategic-title">Enterprise Launch</span>
                  <span className="ws-strategic-meta">30% complete • Due Mar 15</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column - Timer, Calendar, Gmail, Team Overview */}
        <div className="ws-col-side">
          {/* Google Integration Status */}
          <GoogleIntegrationCard
            status={google.status}
            loading={google.loading}
            onConnect={google.connect}
            onDisconnect={google.disconnect}
          />

          {/* Focus Timer */}
          <FocusTimer />

          {/* Google Calendar */}
          <GoogleCalendarWidget
            events={google.calendarEvents}
            loading={google.calendarLoading}
            connected={google.status?.connected || false}
            onConnect={google.connect}
            onRefresh={google.fetchCalendarEvents}
          />

          {/* Google Gmail */}
          <GoogleGmailWidget
            emails={google.emails}
            unreadCount={google.unreadCount}
            loading={google.gmailLoading}
            connected={google.status?.connected || false}
            onConnect={google.connect}
            onRefresh={google.fetchEmails}
          />

          {/* Team Performance (Collapsible) */}
          <section className="ws-card ws-team-metrics-card">
            <button 
              className="ws-card-header ws-collapsible-header"
              onClick={() => setShowTeamMetrics(!showTeamMetrics)}
            >
              <h3>
                <Users size={16} />
                Team Performance
              </h3>
              {showTeamMetrics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showTeamMetrics && (
              <div className="ws-team-metrics">
                <div className="ws-team-metric">
                  <div className="ws-team-metric-icon">
                    <TrendingUp size={16} />
                  </div>
                  <div className="ws-team-metric-info">
                    <span className="ws-team-metric-value">{teamMembers.length}</span>
                    <span className="ws-team-metric-label">Active Members</span>
                  </div>
                </div>
                <div className="ws-team-metric">
                  <div className="ws-team-metric-icon">
                    <Target size={16} />
                  </div>
                  <div className="ws-team-metric-info">
                    <span className="ws-team-metric-value">87%</span>
                    <span className="ws-team-metric-label">Task Completion</span>
                  </div>
                </div>
                <div className="ws-team-metric">
                  <div className="ws-team-metric-icon">
                    <DollarSign size={16} />
                  </div>
                  <div className="ws-team-metric-info">
                    <span className="ws-team-metric-value">12</span>
                    <span className="ws-team-metric-label">Leads This Week</span>
                  </div>
                </div>
              </div>
            )}
            
            <Link href="/nucleus" className="ws-card-link">
              View Full Metrics in Nucleus
              <ArrowRight size={14} />
            </Link>
          </section>

          {/* Team List */}
          <TeamList teamMembers={teamMembers} limit={4} />
        </div>
      </div>
    </div>
  );
}
