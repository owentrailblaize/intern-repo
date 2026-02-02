'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Sparkles,
  Target,
  Zap,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Tag,
  Link2,
  ChevronRight,
  MoreHorizontal,
  X,
  Trash2,
  Edit3,
  TrendingUp,
  Users,
  Star,
  Rocket
} from 'lucide-react';
import { Employee } from '@/lib/supabase';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'review' | 'completed';
  progress: number;
  color: string;
  icon: string;
  linkedLeads: string[];
  dueDate: string | null;
  createdAt: string;
}

interface GrowthProjectTrackerProps {
  currentEmployee: Employee | null;
}

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: '#6b7280', bg: '#1f2937' },
  active: { label: 'In Progress', color: '#f59e0b', bg: '#422006' },
  review: { label: 'Review', color: '#8b5cf6', bg: '#2e1065' },
  completed: { label: 'Completed', color: '#10b981', bg: '#022c22' }
};

const PROJECT_ICONS = ['🎯', '🚀', '💡', '📈', '🌟', '⚡', '🔥', '💪', '🎨', '📊'];
const PROJECT_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Store projects in localStorage for now (can be moved to DB later)
const STORAGE_KEY = 'growth_projects';

export function GrowthProjectTracker({ currentEmployee }: GrowthProjectTrackerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    status: 'planning' as Project['status'],
    color: PROJECT_COLORS[0],
    icon: PROJECT_ICONS[0],
    dueDate: ''
  });

  // Load projects from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading projects:', e);
      }
    }
  }, []);

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const createProject = () => {
    if (!newProject.title.trim()) return;

    const project: Project = {
      id: crypto.randomUUID(),
      title: newProject.title,
      description: newProject.description,
      status: newProject.status,
      progress: 0,
      color: newProject.color,
      icon: newProject.icon,
      linkedLeads: [],
      dueDate: newProject.dueDate || null,
      createdAt: new Date().toISOString()
    };

    setProjects(prev => [...prev, project]);
    setShowNewProject(false);
    setNewProject({
      title: '',
      description: '',
      status: 'planning',
      color: PROJECT_COLORS[0],
      icon: PROJECT_ICONS[0],
      dueDate: ''
    });
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setSelectedProject(null);
  };

  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId);
  };

  const handleDragOver = (e: React.DragEvent, status: Project['status']) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Project['status']) => {
    e.preventDefault();
    if (draggedProject) {
      updateProject(draggedProject, { status });
      setDraggedProject(null);
    }
  };

  const getProjectsByStatus = (status: Project['status']) => {
    return projects.filter(p => p.status === status);
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    thisWeek: projects.filter(p => {
      const created = new Date(p.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length
  };

  return (
    <div className="growth-tracker">
      {/* Header */}
      <header className="growth-header">
        <div className="growth-header-left">
          <h1 className="growth-title">
            <Rocket className="growth-title-icon" />
            My Projects
          </h1>
          <p className="growth-subtitle">Track your growth initiatives and link them to leads</p>
        </div>
        <button className="growth-new-btn" onClick={() => setShowNewProject(true)}>
          <Plus size={16} />
          New Project
        </button>
      </header>

      {/* Quick Stats */}
      <div className="growth-stats">
        <div className="growth-stat">
          <div className="growth-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <Target size={18} />
          </div>
          <div className="growth-stat-info">
            <span className="growth-stat-value">{stats.total}</span>
            <span className="growth-stat-label">Total Projects</span>
          </div>
        </div>
        <div className="growth-stat">
          <div className="growth-stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <Zap size={18} />
          </div>
          <div className="growth-stat-info">
            <span className="growth-stat-value">{stats.active}</span>
            <span className="growth-stat-label">In Progress</span>
          </div>
        </div>
        <div className="growth-stat">
          <div className="growth-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="growth-stat-info">
            <span className="growth-stat-value">{stats.completed}</span>
            <span className="growth-stat-label">Completed</span>
          </div>
        </div>
        <div className="growth-stat">
          <div className="growth-stat-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
            <TrendingUp size={18} />
          </div>
          <div className="growth-stat-info">
            <span className="growth-stat-value">{stats.thisWeek}</span>
            <span className="growth-stat-label">This Week</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="growth-board">
        {(Object.keys(STATUS_CONFIG) as Project['status'][]).map(status => (
          <div 
            key={status} 
            className="growth-column"
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="growth-column-header">
              <span 
                className="growth-column-dot" 
                style={{ background: STATUS_CONFIG[status].color }}
              />
              <span className="growth-column-title">{STATUS_CONFIG[status].label}</span>
              <span className="growth-column-count">{getProjectsByStatus(status).length}</span>
            </div>

            <div className="growth-column-content">
              {getProjectsByStatus(status).map(project => (
                <div
                  key={project.id}
                  className={`growth-card ${draggedProject === project.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(project.id)}
                  onClick={() => setSelectedProject(project)}
                  style={{ borderLeftColor: project.color }}
                >
                  <div className="growth-card-header">
                    <span className="growth-card-icon">{project.icon}</span>
                    <h3 className="growth-card-title">{project.title}</h3>
                  </div>
                  
                  {project.description && (
                    <p className="growth-card-desc">{project.description}</p>
                  )}

                  <div className="growth-card-footer">
                    {project.dueDate && (
                      <span className="growth-card-date">
                        <Calendar size={12} />
                        {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {project.linkedLeads.length > 0 && (
                      <span className="growth-card-leads">
                        <Link2 size={12} />
                        {project.linkedLeads.length} leads
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="growth-card-progress">
                    <div 
                      className="growth-card-progress-fill" 
                      style={{ 
                        width: `${project.progress}%`,
                        background: project.color 
                      }}
                    />
                  </div>
                </div>
              ))}

              {getProjectsByStatus(status).length === 0 && (
                <div className="growth-column-empty">
                  <p>Drop projects here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="growth-modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="growth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="growth-modal-header">
              <h3>Create New Project</h3>
              <button onClick={() => setShowNewProject(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="growth-modal-body">
              {/* Icon & Color Picker */}
              <div className="growth-picker-row">
                <div className="growth-picker">
                  <label>Icon</label>
                  <div className="growth-icon-grid">
                    {PROJECT_ICONS.map(icon => (
                      <button
                        key={icon}
                        className={`growth-icon-btn ${newProject.icon === icon ? 'selected' : ''}`}
                        onClick={() => setNewProject({ ...newProject, icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="growth-picker">
                  <label>Color</label>
                  <div className="growth-color-grid">
                    {PROJECT_COLORS.map(color => (
                      <button
                        key={color}
                        className={`growth-color-btn ${newProject.color === color ? 'selected' : ''}`}
                        style={{ background: color }}
                        onClick={() => setNewProject({ ...newProject, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="growth-form-group">
                <label>Project Title</label>
                <input
                  type="text"
                  placeholder="e.g., Q1 Alumni Outreach Campaign"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="growth-form-group">
                <label>Description</label>
                <textarea
                  placeholder="What's this project about?"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="growth-form-row">
                <div className="growth-form-group">
                  <label>Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as Project['status'] })}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">In Progress</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div className="growth-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="growth-modal-footer">
              <button className="growth-cancel-btn" onClick={() => setShowNewProject(false)}>
                Cancel
              </button>
              <button 
                className="growth-create-btn"
                onClick={createProject}
                disabled={!newProject.title.trim()}
              >
                <Sparkles size={14} />
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Sidebar */}
      {selectedProject && (
        <div className="growth-sidebar-overlay" onClick={() => setSelectedProject(null)}>
          <div className="growth-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="growth-sidebar-header">
              <span className="growth-sidebar-icon">{selectedProject.icon}</span>
              <button onClick={() => setSelectedProject(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="growth-sidebar-body">
              <h2 className="growth-sidebar-title">{selectedProject.title}</h2>
              
              {selectedProject.description && (
                <p className="growth-sidebar-desc">{selectedProject.description}</p>
              )}

              <div className="growth-sidebar-section">
                <label>Progress</label>
                <div className="growth-progress-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedProject.progress}
                    onChange={(e) => {
                      const progress = Number(e.target.value);
                      updateProject(selectedProject.id, { progress });
                      setSelectedProject({ ...selectedProject, progress });
                    }}
                    style={{ accentColor: selectedProject.color }}
                  />
                  <span>{selectedProject.progress}%</span>
                </div>
              </div>

              <div className="growth-sidebar-section">
                <label>Status</label>
                <select
                  value={selectedProject.status}
                  onChange={(e) => {
                    const status = e.target.value as Project['status'];
                    updateProject(selectedProject.id, { status });
                    setSelectedProject({ ...selectedProject, status });
                  }}
                >
                  <option value="planning">Planning</option>
                  <option value="active">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="growth-sidebar-section">
                <label>
                  <Link2 size={14} />
                  Linked Leads
                </label>
                <p className="growth-sidebar-hint">
                  Link leads from your pipeline to track conversion
                </p>
                <button className="growth-link-btn">
                  <Plus size={14} />
                  Link a Lead
                </button>
              </div>

              <div className="growth-sidebar-meta">
                <span>Created {new Date(selectedProject.createdAt).toLocaleDateString()}</span>
                {selectedProject.dueDate && (
                  <span>Due {new Date(selectedProject.dueDate).toLocaleDateString()}</span>
                )}
              </div>

              <button 
                className="growth-delete-btn"
                onClick={() => deleteProject(selectedProject.id)}
              >
                <Trash2 size={14} />
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
