'use client';

import React from 'react';
import Link from 'next/link';
import { useUserRole } from '../hooks/useUserRole';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  Calendar,
  Users,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  progress: number;
  dueDate: string;
  members: number;
  tasks: { total: number; completed: number };
}

// Mock project data - in production, this would come from the database
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Workspace Consolidation',
    description: 'Merge portal and workspace into unified experience',
    status: 'active',
    progress: 75,
    dueDate: '2026-02-15',
    members: 3,
    tasks: { total: 12, completed: 9 }
  },
  {
    id: '2',
    name: 'Q1 Growth Campaign',
    description: 'Execute multi-channel growth strategy',
    status: 'active',
    progress: 45,
    dueDate: '2026-03-31',
    members: 5,
    tasks: { total: 24, completed: 11 }
  },
  {
    id: '3',
    name: 'API Performance Optimization',
    description: 'Improve database query performance and caching',
    status: 'planning',
    progress: 10,
    dueDate: '2026-02-28',
    members: 2,
    tasks: { total: 8, completed: 1 }
  },
  {
    id: '4',
    name: 'Enterprise Feature Set',
    description: 'Build enterprise-ready features for large organizations',
    status: 'on_hold',
    progress: 30,
    dueDate: '2026-04-15',
    members: 4,
    tasks: { total: 18, completed: 5 }
  }
];

export default function ProjectsPage() {
  const { features, isEngineer, isFounder } = useUserRole();

  const statusColors: Record<string, { bg: string; text: string }> = {
    planning: { bg: '#f3f4f6', text: '#6b7280' },
    active: { bg: '#dcfce7', text: '#16a34a' },
    on_hold: { bg: '#fef3c7', text: '#d97706' },
    completed: { bg: '#dbeafe', text: '#2563eb' }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter projects based on role
  const visibleProjects = mockProjects.filter(p => {
    if (isFounder) return true;
    if (isEngineer) return ['Workspace Consolidation', 'API Performance Optimization', 'Enterprise Feature Set'].includes(p.name);
    return false;
  });

  if (!features.showProjects) {
    return (
      <div className="ws-no-access">
        <FolderKanban size={48} />
        <h2>Access Restricted</h2>
        <p>Your role doesn&apos;t have access to the projects module.</p>
        <Link href="/workspace" className="ws-back-link">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="ws-subpage">
      {/* Header */}
      <header className="ws-subpage-header">
        <div className="ws-subpage-header-left">
          <h1>
            <FolderKanban size={24} />
            Projects
          </h1>
          <span className="ws-subpage-count">{visibleProjects.length} projects</span>
        </div>
        {isFounder && (
          <button className="ws-add-btn">
            <Plus size={18} />
            New Project
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="ws-subpage-stats">
        <div className="ws-subpage-stat">
          <FolderKanban size={18} />
          <span className="ws-subpage-stat-value">{visibleProjects.length}</span>
          <span className="ws-subpage-stat-label">Total Projects</span>
        </div>
        <div className="ws-subpage-stat">
          <Target size={18} />
          <span className="ws-subpage-stat-value">{visibleProjects.filter(p => p.status === 'active').length}</span>
          <span className="ws-subpage-stat-label">Active</span>
        </div>
        <div className="ws-subpage-stat">
          <CheckCircle2 size={18} />
          <span className="ws-subpage-stat-value">{visibleProjects.filter(p => p.status === 'completed').length}</span>
          <span className="ws-subpage-stat-label">Completed</span>
        </div>
        <div className="ws-subpage-stat">
          <AlertCircle size={18} />
          <span className="ws-subpage-stat-value">{visibleProjects.filter(p => p.status === 'on_hold').length}</span>
          <span className="ws-subpage-stat-label">On Hold</span>
        </div>
      </div>

      {/* Project Grid */}
      <div className="ws-projects-grid">
        {visibleProjects.map(project => (
          <div key={project.id} className="ws-project-card">
            <div className="ws-project-header">
              <div className="ws-project-info">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </div>
              <span 
                className="ws-project-status"
                style={{ 
                  background: statusColors[project.status].bg,
                  color: statusColors[project.status].text
                }}
              >
                {getStatusLabel(project.status)}
              </span>
            </div>

            <div className="ws-project-progress">
              <div className="ws-project-progress-header">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="ws-project-progress-bar">
                <div 
                  className="ws-project-progress-fill"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="ws-project-meta">
              <div className="ws-project-meta-item">
                <Calendar size={14} />
                <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="ws-project-meta-item">
                <Users size={14} />
                <span>{project.members} members</span>
              </div>
              <div className="ws-project-meta-item">
                <CheckCircle2 size={14} />
                <span>{project.tasks.completed}/{project.tasks.total} tasks</span>
              </div>
            </div>

            <button className="ws-project-view-btn">
              View Project
              <ChevronRight size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
