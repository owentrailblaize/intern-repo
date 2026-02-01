'use client';

import React from 'react';
import Link from 'next/link';
import {
  Code,
  GitBranch,
  Bug,
  Sparkles,
  ChevronRight,
  Target,
  Calendar,
  FileCode
} from 'lucide-react';
import { TaskSection } from '../TaskSection';
import { FocusTimer } from '../FocusTimer';
import { MetricsCards } from '../MetricsCards';
import { TeamList } from '../TeamView';
import { UseWorkspaceDataReturn, WorkspaceStats } from '../../hooks/useWorkspaceData';
import { Employee } from '@/lib/supabase';

interface EngineerDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

/**
 * Engineer Dashboard
 * Focus: Collaboration, big-picture goals, technical sections
 */
export function EngineerDashboard({ data, teamMembers }: EngineerDashboardProps) {
  const {
    tasks,
    stats,
    createTask,
    toggleTask,
  } = data;

  // Engineering-specific task categories
  const devTasks = tasks.filter(t => t.category === 'engineering' || t.category === 'development');
  const bugTasks = tasks.filter(t => t.category === 'bug');
  const reviewTasks = tasks.filter(t => t.category === 'review');

  return (
    <div className="ws-dashboard ws-dashboard-engineer">
      {/* Metrics */}
      <MetricsCards stats={stats} />

      {/* Big Picture Goals */}
      <section className="ws-goals-section">
        <div className="ws-goals-header">
          <h2>
            <Target size={18} />
            Sprint Goals
          </h2>
          <span className="ws-sprint-label">Sprint 12 • Jan 27 - Feb 10</span>
        </div>
        <div className="ws-goals-grid">
          <div className="ws-goal-card">
            <div className="ws-goal-progress" style={{ '--progress': '75%' } as React.CSSProperties}>
              <span>75%</span>
            </div>
            <div className="ws-goal-info">
              <span className="ws-goal-title">Workspace Consolidation</span>
              <span className="ws-goal-desc">Merge portal & workspace routes</span>
            </div>
          </div>
          <div className="ws-goal-card">
            <div className="ws-goal-progress" style={{ '--progress': '40%' } as React.CSSProperties}>
              <span>40%</span>
            </div>
            <div className="ws-goal-info">
              <span className="ws-goal-title">API Performance</span>
              <span className="ws-goal-desc">Optimize database queries</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="ws-grid ws-grid-engineer">
        {/* Left Column - Development Work */}
        <div className="ws-col-main">
          {/* Current Sprint Tasks */}
          <TaskSection
            tasks={tasks}
            onToggleTask={toggleTask}
            onCreateTask={createTask}
            title="Development Tasks"
            limit={6}
          />

          {/* Technical Sections */}
          <div className="ws-technical-sections">
            {/* Code Reviews */}
            <section className="ws-card ws-card-compact">
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
            </section>

            {/* Bug Tracker */}
            <section className="ws-card ws-card-compact">
              <div className="ws-card-header">
                <h3>
                  <Bug size={16} />
                  Bugs
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
        </div>

        {/* Right Column - Focus, Links, Team */}
        <div className="ws-col-side">
          {/* Focus Timer */}
          <FocusTimer />

          {/* Engineering Quick Links */}
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
          </section>

          {/* Upcoming */}
          <section className="ws-card">
            <div className="ws-card-header">
              <h3>
                <Calendar size={16} />
                Upcoming
              </h3>
            </div>
            <div className="ws-upcoming-list">
              <div className="ws-upcoming-item">
                <span className="ws-upcoming-date">Today</span>
                <span className="ws-upcoming-title">Sprint Planning</span>
              </div>
              <div className="ws-upcoming-item">
                <span className="ws-upcoming-date">Wed</span>
                <span className="ws-upcoming-title">Code Review Session</span>
              </div>
              <div className="ws-upcoming-item">
                <span className="ws-upcoming-date">Fri</span>
                <span className="ws-upcoming-title">Sprint Demo</span>
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
