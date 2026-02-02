'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Send,
  UserPlus,
  CheckSquare,
  TrendingUp,
  Target,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Users
} from 'lucide-react';
import { TaskSection } from '../TaskSection';
import { LeadSection } from '../LeadSection';
import { FocusTimer } from '../FocusTimer';
import { TeamList } from '../TeamView';
import { CalendarHero } from '../CalendarHero';
import { SmartSuggestions } from '../SmartSuggestions';
import { GoogleGmailWidget } from '../GoogleGmailWidget';
import { UseWorkspaceDataReturn } from '../../hooks/useWorkspaceData';
import { useGoogleIntegration } from '../../hooks/useGoogleIntegration';
import { Employee } from '@/lib/supabase';

interface InternDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

/**
 * Growth Intern Dashboard
 * Calendar-centric design with focus on outreach and lead management
 */
export function InternDashboard({ data, teamMembers }: InternDashboardProps) {
  const {
    currentEmployee,
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
    };
  }, [google.calendarEvents]);

  // Intern-specific calculations
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const activeLeads = leads.filter(l => !['converted', 'lost'].includes(l.status));
  
  // Stats for smart suggestions
  const suggestionStats = {
    openTasks: activeTasks.length,
    overdueItems: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
    unreadMessages: google.unreadCount,
    activeLeads: activeLeads.length,
    pendingFollowups: leads.filter(l => l.status === 'contacted').length,
  };

  // Calculate weekly progress
  const thisWeekTasks = tasks.filter(t => {
    if (t.status !== 'done') return false;
    const completed = new Date(t.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completed >= weekAgo;
  }).length;

  const thisWeekContacts = leads.filter(l => {
    const created = new Date(l.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  }).length;

  return (
    <div className="ws-dashboard ws-dashboard-awareness">
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
        role="growth_intern"
        isInMeeting={meetingContext.isInMeeting}
        minutesUntilNext={meetingContext.minutesUntilNext}
        stats={suggestionStats}
      />

      {/* Quick Stats Bar */}
      <div className="ws-quick-stats-bar">
        <div className="ws-quick-stat">
          <CheckSquare size={16} />
          <span className="quick-stat-value">{activeTasks.length}</span>
          <span className="quick-stat-label">Tasks</span>
        </div>
        <div className="ws-quick-stat">
          <Target size={16} />
          <span className="quick-stat-value">{activeLeads.length}</span>
          <span className="quick-stat-label">Leads</span>
        </div>
        <div className="ws-quick-stat">
          <Phone size={16} />
          <span className="quick-stat-value">{thisWeekContacts}</span>
          <span className="quick-stat-label">Contacted</span>
        </div>
        <div className="ws-quick-stat">
          <Mail size={16} />
          <span className="quick-stat-value">{google.unreadCount}</span>
          <span className="quick-stat-label">Unread</span>
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
            {/* Priority Tasks */}
            <div className="ws-secondary-widget">
              <TaskSection
                tasks={activeTasks}
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

            {/* Alumni Outreach */}
            <div className="ws-secondary-widget">
              <LeadSection
                leads={activeLeads}
                onCreateLead={createLead}
                onUpdateStatus={updateLeadStatus}
                onUpdateLead={updateLead}
                onDeleteLead={deleteLead}
                title="Alumni Outreach"
                limit={3}
                compact
                loading={leadsLoading}
              />
            </div>

            {/* Weekly Progress */}
            <div className="ws-secondary-widget">
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
                    <span className="ws-progress-label">Tasks Done</span>
                  </div>
                  <div className="ws-progress-stat">
                    <span className="ws-progress-value">{thisWeekContacts}</span>
                    <span className="ws-progress-label">Contacts Made</span>
                  </div>
                </div>
                
                {/* Team Preview */}
                <div className="ws-team-avatars" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--ws-border)' }}>
                  {teamMembers.slice(0, 5).map((member, i) => (
                    <div 
                      key={member.id} 
                      className="ws-team-avatar-small"
                      style={{ 
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
                        zIndex: 5 - i
                      }}
                      title={member.name}
                    >
                      {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                  ))}
                  {teamMembers.length > 5 && (
                    <div className="ws-team-avatar-more">
                      +{teamMembers.length - 5}
                    </div>
                  )}
                </div>
                <Link href="/workspace/team" className="ws-card-link">
                  View Team
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
