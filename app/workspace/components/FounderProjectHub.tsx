'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Code,
  TrendingUp,
  Users,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Layers,
  GitBranch,
  Bug,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Employee } from '@/lib/supabase';
import { LinearIssueTracker } from './LinearIssueTracker';
import { GrowthProjectTracker } from './GrowthProjectTracker';

interface FounderProjectHubProps {
  currentEmployee: Employee | null;
  teamMembers: Employee[];
}

type ViewMode = 'overview' | 'product' | 'growth';

interface EngineeringStats {
  total: number;
  inProgress: number;
  inReview: number;
  completed: number;
  bugs: number;
}

export function FounderProjectHub({ currentEmployee, teamMembers }: FounderProjectHubProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [engineeringStats, setEngineeringStats] = useState<EngineeringStats>({
    total: 0,
    inProgress: 0,
    inReview: 0,
    completed: 0,
    bugs: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch engineering stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/engineering/issues?status=all');
        const { data } = await res.json();
        if (data) {
          setEngineeringStats({
            total: data.length,
            inProgress: data.filter((i: { status: string }) => i.status === 'in_progress').length,
            inReview: data.filter((i: { status: string }) => i.status === 'in_review').length,
            completed: data.filter((i: { status: string }) => i.status === 'done').length,
            bugs: data.filter((i: { issue_type: string }) => i.issue_type === 'bug').length
          });
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Get growth projects from localStorage
  const [growthStats, setGrowthStats] = useState({ total: 0, active: 0, completed: 0 });
  
  useEffect(() => {
    const stored = localStorage.getItem('growth_projects');
    if (stored) {
      try {
        const projects = JSON.parse(stored);
        setGrowthStats({
          total: projects.length,
          active: projects.filter((p: { status: string }) => p.status === 'active').length,
          completed: projects.filter((p: { status: string }) => p.status === 'completed').length
        });
      } catch (e) {
        console.error('Error loading growth stats:', e);
      }
    }
  }, [viewMode]);

  if (viewMode === 'product') {
    return (
      <div className="founder-hub">
        <button className="founder-back-btn" onClick={() => setViewMode('overview')}>
          ← Back to Overview
        </button>
        <div className="founder-full-view">
          <LinearIssueTracker currentEmployee={currentEmployee} teamMembers={teamMembers} />
        </div>
      </div>
    );
  }

  if (viewMode === 'growth') {
    return (
      <div className="founder-hub">
        <button className="founder-back-btn" onClick={() => setViewMode('overview')}>
          ← Back to Overview
        </button>
        <div className="founder-full-view growth-view">
          <GrowthProjectTracker currentEmployee={currentEmployee} />
        </div>
      </div>
    );
  }

  return (
    <div className="founder-hub">
      {/* Header */}
      <header className="founder-header">
        <div className="founder-header-content">
          <h1 className="founder-title">
            <LayoutDashboard className="founder-title-icon" />
            Project Hub
          </h1>
          <p className="founder-subtitle">
            Complete visibility across engineering and growth initiatives
          </p>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="founder-overview">
        {/* Engineering Card */}
        <div className="founder-section-card engineering">
          <div className="founder-card-header">
            <div className="founder-card-icon engineering">
              <Code size={20} />
            </div>
            <div className="founder-card-title">
              <h2>Product Development</h2>
              <p>Engineering issues and features</p>
            </div>
            <button 
              className="founder-card-action"
              onClick={() => setViewMode('product')}
            >
              Open
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="founder-stats-grid">
            <div className="founder-stat-item">
              <div className="founder-stat-icon">
                <Layers size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{engineeringStats.total}</span>
                <span className="founder-stat-label">Total Issues</span>
              </div>
            </div>
            <div className="founder-stat-item">
              <div className="founder-stat-icon active">
                <GitBranch size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{engineeringStats.inProgress}</span>
                <span className="founder-stat-label">In Progress</span>
              </div>
            </div>
            <div className="founder-stat-item">
              <div className="founder-stat-icon review">
                <Clock size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{engineeringStats.inReview}</span>
                <span className="founder-stat-label">In Review</span>
              </div>
            </div>
            <div className="founder-stat-item">
              <div className="founder-stat-icon bug">
                <Bug size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{engineeringStats.bugs}</span>
                <span className="founder-stat-label">Open Bugs</span>
              </div>
            </div>
          </div>

          <div className="founder-progress-section">
            <div className="founder-progress-header">
              <span>Sprint Progress</span>
              <span className="founder-progress-percent">
                {engineeringStats.total > 0 
                  ? Math.round((engineeringStats.completed / engineeringStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="founder-progress-bar">
              <div 
                className="founder-progress-fill engineering"
                style={{ 
                  width: `${engineeringStats.total > 0 
                    ? (engineeringStats.completed / engineeringStats.total) * 100 
                    : 0}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Growth Card */}
        <div className="founder-section-card growth">
          <div className="founder-card-header">
            <div className="founder-card-icon growth">
              <TrendingUp size={20} />
            </div>
            <div className="founder-card-title">
              <h2>Growth Initiatives</h2>
              <p>Outreach, campaigns, and leads</p>
            </div>
            <button 
              className="founder-card-action"
              onClick={() => setViewMode('growth')}
            >
              Open
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="founder-stats-grid">
            <div className="founder-stat-item">
              <div className="founder-stat-icon">
                <Target size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{growthStats.total}</span>
                <span className="founder-stat-label">Projects</span>
              </div>
            </div>
            <div className="founder-stat-item">
              <div className="founder-stat-icon active">
                <Zap size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{growthStats.active}</span>
                <span className="founder-stat-label">Active</span>
              </div>
            </div>
            <div className="founder-stat-item">
              <div className="founder-stat-icon success">
                <CheckCircle2 size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{growthStats.completed}</span>
                <span className="founder-stat-label">Completed</span>
              </div>
            </div>
            <div className="founder-stat-item">
              <div className="founder-stat-icon users">
                <Users size={16} />
              </div>
              <div className="founder-stat-data">
                <span className="founder-stat-number">{teamMembers.filter(m => m.role?.includes('intern')).length}</span>
                <span className="founder-stat-label">Team</span>
              </div>
            </div>
          </div>

          <div className="founder-progress-section">
            <div className="founder-progress-header">
              <span>Growth Progress</span>
              <span className="founder-progress-percent">
                {growthStats.total > 0 
                  ? Math.round((growthStats.completed / growthStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="founder-progress-bar">
              <div 
                className="founder-progress-fill growth"
                style={{ 
                  width: `${growthStats.total > 0 
                    ? (growthStats.completed / growthStats.total) * 100 
                    : 0}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team Activity Section */}
      <div className="founder-team-section">
        <h3 className="founder-section-title">
          <Activity size={18} />
          Team Overview
        </h3>
        <div className="founder-team-grid">
          {teamMembers.slice(0, 6).map(member => (
            <div key={member.id} className="founder-team-card">
              <div 
                className="founder-team-avatar"
                style={{ 
                  background: member.role?.includes('engineer') 
                    ? 'linear-gradient(135deg, #5e6ad2, #8b5cf6)'
                    : member.role?.includes('founder')
                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(135deg, #10b981, #06b6d4)'
                }}
              >
                {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="founder-team-info">
                <span className="founder-team-name">{member.name}</span>
                <span className="founder-team-role">
                  {member.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="founder-actions">
        <button className="founder-quick-action" onClick={() => setViewMode('product')}>
          <Code size={16} />
          Create Engineering Issue
        </button>
        <button className="founder-quick-action" onClick={() => setViewMode('growth')}>
          <Sparkles size={16} />
          Create Growth Project
        </button>
      </div>
    </div>
  );
}
