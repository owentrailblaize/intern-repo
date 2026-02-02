'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Briefcase,
  ArrowRight,
  Mail,
  CheckSquare
} from 'lucide-react';
import { TaskSection } from '../TaskSection';
import { LeadSection } from '../LeadSection';
import { FocusTimer } from '../FocusTimer';
import { TeamView, TeamList } from '../TeamView';
import { CalendarHero } from '../CalendarHero';
import { SmartSuggestions } from '../SmartSuggestions';
import { GoogleGmailWidget } from '../GoogleGmailWidget';
import { UseWorkspaceDataReturn } from '../../hooks/useWorkspaceData';
import { useGoogleIntegration } from '../../hooks/useGoogleIntegration';
import { Employee } from '@/lib/supabase';

interface FounderDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

/**
 * Founder Dashboard
 * Calendar-centric, awareness-focused design
 * Shows what's happening now and suggests contextual actions
 */
export function FounderDashboard({ data, teamMembers }: FounderDashboardProps) {
  const {
    currentEmployee,
    viewAsEmployee,
    setViewAsEmployee,
    tasks,
    leads,
    stats,
    tasksLoading,
    leadsLoading,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
  } = data;

  const [showSecondaryWidgets, setShowSecondaryWidgets] = useState(true);

  // Google Integration
  const google = useGoogleIntegration(currentEmployee?.id);

  // Calculate meeting context for smart suggestions
  const meetingContext = useMemo(() => {
    const now = Date.now();
    
    const currentEvent = google.calendarEvents.find(event => {
      if (!event.start.dateTime || !event.end.dateTime) return false;
      const start = new Date(event.start.dateTime).getTime();
      const end = new Date(event.end.dateTime).getTime();
      return now >= start && now <= end;
    });

    const nextEvent = google.calendarEvents.find(event => {
      if (!event.start.dateTime) return false;
      const start = new Date(event.start.dateTime).getTime();
      return start > now;
    });

    let minutesUntilNext: number | null = null;
    if (nextEvent?.start.dateTime) {
      minutesUntilNext = Math.floor((new Date(nextEvent.start.dateTime).getTime() - now) / 60000);
    }

    return {
      isInMeeting: !!currentEvent,
      minutesUntilNext,
      currentEvent,
      nextEvent
    };
  }, [google.calendarEvents]);

  // Priority tasks for this week
  const thisWeekTasks = tasks.filter(t => {
    if (!t.due_date) return t.status !== 'done';
    const due = new Date(t.due_date);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return due <= nextWeek && t.status !== 'done';
  });

  // Stats for smart suggestions
  const suggestionStats = {
    openTasks: thisWeekTasks.length,
    overdueItems: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
    unreadMessages: google.unreadCount,
    activeLeads: leads.filter(l => !['converted', 'lost'].includes(l.status)).length,
    pendingFollowups: leads.filter(l => l.status === 'contacted').length,
  };

  return (
    <div className="ws-dashboard ws-dashboard-awareness">
      {/* Team Switcher (top-right, non-intrusive) */}
      <div className="ws-awareness-header">
        <TeamView
          currentEmployee={currentEmployee}
          teamMembers={teamMembers}
          viewAsEmployee={viewAsEmployee}
          onViewAsChange={setViewAsEmployee}
        />
      </div>

      {/* Calendar Hero - The Focal Point */}
      <CalendarHero
        events={google.calendarEvents}
        loading={google.calendarLoading}
        connected={google.status?.connected || false}
        onConnect={google.connect}
        onRefresh={google.fetchCalendarEvents}
      />

      {/* Smart Suggestions - Contextual Actions */}
      <SmartSuggestions
        role="founder"
        isInMeeting={meetingContext.isInMeeting}
        minutesUntilNext={meetingContext.minutesUntilNext}
        stats={suggestionStats}
      />

      {/* Quick Stats Bar */}
      <div className="ws-quick-stats-bar">
        <div className="ws-quick-stat">
          <CheckSquare size={16} />
          <span className="quick-stat-value">{thisWeekTasks.length}</span>
          <span className="quick-stat-label">Tasks</span>
        </div>
        <div className="ws-quick-stat">
          <Mail size={16} />
          <span className="quick-stat-value">{google.unreadCount}</span>
          <span className="quick-stat-label">Unread</span>
        </div>
        <div className="ws-quick-stat">
          <Target size={16} />
          <span className="quick-stat-value">{leads.length}</span>
          <span className="quick-stat-label">Leads</span>
        </div>
        <div className="ws-quick-stat">
          <Users size={16} />
          <span className="quick-stat-value">{teamMembers.length}</span>
          <span className="quick-stat-label">Team</span>
        </div>
        <div className="ws-quick-stats-spacer" />
        <FocusTimer compact />
      </div>

      {/* Secondary Widgets - Collapsible */}
      <div className="ws-secondary-section">
        <button 
          className="ws-secondary-toggle"
          onClick={() => setShowSecondaryWidgets(!showSecondaryWidgets)}
        >
          <span>Details & Actions</span>
          {showSecondaryWidgets ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showSecondaryWidgets && (
          <div className="ws-secondary-grid">
            {/* Tasks */}
            <div className="ws-secondary-widget">
              <TaskSection
                tasks={thisWeekTasks}
                onToggleTask={toggleTask}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                title="Priority Tasks"
                limit={4}
                compact
                loading={tasksLoading}
              />
            </div>

            {/* Gmail */}
            <div className="ws-secondary-widget">
              <GoogleGmailWidget
                emails={google.emails}
                unreadCount={google.unreadCount}
                loading={google.gmailLoading}
                connected={google.status?.connected || false}
                onConnect={google.connect}
                onRefresh={google.fetchEmails}
              />
            </div>

            {/* Leads */}
            <div className="ws-secondary-widget">
              <LeadSection
                leads={leads}
                onCreateLead={createLead}
                onUpdateStatus={updateLeadStatus}
                onUpdateLead={updateLead}
                onDeleteLead={deleteLead}
                title="Active Leads"
                limit={3}
                compact
                loading={leadsLoading}
              />
            </div>

            {/* Team */}
            <div className="ws-secondary-widget">
              <section className="ws-card ws-team-compact-card">
                <div className="ws-card-header">
                  <h3>
                    <Users size={16} />
                    Team
                  </h3>
                  <Link href="/workspace/team" className="ws-see-all">
                    View all
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="ws-team-avatars">
                  {teamMembers.slice(0, 6).map((member, i) => (
                    <div 
                      key={member.id} 
                      className="ws-team-avatar-small"
                      style={{ 
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'][i % 6],
                        zIndex: 6 - i
                      }}
                      title={member.name}
                    >
                      {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                  ))}
                  {teamMembers.length > 6 && (
                    <div className="ws-team-avatar-more">
                      +{teamMembers.length - 6}
                    </div>
                  )}
                </div>
                <Link href="/nucleus" className="ws-card-link">
                  Open Nucleus
                  <ArrowRight size={14} />
                </Link>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
