'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Code,
  GitBranch,
  Bug,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  FileCode,
  Users,
  CheckSquare,
  Mail,
  ArrowRight
} from 'lucide-react';
import { TaskSection } from '../TaskSection';
import { FocusTimer } from '../FocusTimer';
import { TeamList } from '../TeamView';
import { CalendarHero } from '../CalendarHero';
import { SmartSuggestions } from '../SmartSuggestions';
import { GoogleGmailWidget } from '../GoogleGmailWidget';
import { UseWorkspaceDataReturn } from '../../hooks/useWorkspaceData';
import { useGoogleIntegration } from '../../hooks/useGoogleIntegration';
import { Employee } from '@/lib/supabase';

interface EngineerDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

/**
 * Engineer Dashboard
 * Calendar-centric design with focus on development tasks and code reviews
 */
export function EngineerDashboard({ data, teamMembers }: EngineerDashboardProps) {
  const {
    currentEmployee,
    tasks,
    stats,
    tasksLoading,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
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

  // Engineering-specific task categories
  const devTasks = tasks.filter(t => t.status !== 'done');
  const bugTasks = tasks.filter(t => t.category === 'bug' && t.status !== 'done');
  const reviewTasks = tasks.filter(t => t.category === 'review' && t.status !== 'done');

  // Stats for smart suggestions
  const suggestionStats = {
    openTasks: devTasks.length,
    overdueItems: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
    unreadMessages: google.unreadCount,
  };

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
        role="engineer"
        isInMeeting={meetingContext.isInMeeting}
        minutesUntilNext={meetingContext.minutesUntilNext}
        stats={suggestionStats}
      />

      {/* Quick Stats Bar */}
      <div className="ws-quick-stats-bar">
        <div className="ws-quick-stat">
          <CheckSquare size={16} />
          <span className="quick-stat-value">{devTasks.length}</span>
          <span className="quick-stat-label">Tasks</span>
        </div>
        <div className="ws-quick-stat">
          <GitBranch size={16} />
          <span className="quick-stat-value">{reviewTasks.length}</span>
          <span className="quick-stat-label">Reviews</span>
        </div>
        <div className="ws-quick-stat">
          <Bug size={16} />
          <span className="quick-stat-value">{bugTasks.length}</span>
          <span className="quick-stat-label">Bugs</span>
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
            {/* Development Tasks */}
            <div className="ws-secondary-widget">
              <TaskSection
                tasks={devTasks}
                onToggleTask={toggleTask}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                title="Development Tasks"
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

            {/* Code Reviews & Bugs */}
            <div className="ws-secondary-widget">
              <section className="ws-card">
                <div className="ws-card-header">
                  <h3>
                    <GitBranch size={16} />
                    Code Reviews
                  </h3>
                  <span className="ws-badge">{reviewTasks.length}</span>
                </div>
                {reviewTasks.length === 0 ? (
                  <p className="ws-empty-text">No pending reviews</p>
                ) : (
                  <div className="ws-compact-list">
                    {reviewTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="ws-compact-item">
                        <FileCode size={14} />
                        <span>{task.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="ws-card-divider" />
                
                <div className="ws-card-header">
                  <h3>
                    <Bug size={16} />
                    Bug Queue
                  </h3>
                  <span className="ws-badge ws-badge-warning">{bugTasks.length}</span>
                </div>
                {bugTasks.length === 0 ? (
                  <p className="ws-empty-text">No open bugs 🎉</p>
                ) : (
                  <div className="ws-compact-list">
                    {bugTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="ws-compact-item">
                        <Bug size={14} />
                        <span>{task.title}</span>
                        <span className={`ws-priority-dot priority-${task.priority}`} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Engineering Quick Links */}
            <div className="ws-secondary-widget">
              <section className="ws-card">
                <div className="ws-card-header">
                  <h3>
                    <Code size={16} />
                    Quick Links
                  </h3>
                </div>
                <div className="ws-quick-links">
                  <a
                    href="https://github.com/trailblaize"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-quick-link"
                  >
                    <GitBranch size={16} />
                    GitHub Repos
                    <ChevronRight size={14} />
                  </a>
                  <Link href="/nucleus/operations" className="ws-quick-link">
                    <Bug size={16} />
                    Bug Tracker
                    <ChevronRight size={14} />
                  </Link>
                  <Link href="/nucleus/operations" className="ws-quick-link">
                    <Sparkles size={16} />
                    Feature Requests
                    <ChevronRight size={14} />
                  </Link>
                </div>
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
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
