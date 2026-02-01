'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import {
  FolderKanban,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  X,
  Check,
  ChevronDown,
  Target,
  Pause,
  Archive,
  CheckCircle2
} from 'lucide-react';

interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  progress: number;
  due_date: string;
  started_at: string;
  completed_at: string;
  created_at: string;
}

type FilterStatus = 'all' | 'active' | 'paused' | 'completed';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    due_date: ''
  });

  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', 
    '#f59e0b', '#10b981', '#06b6d4', '#6366f1'
  ];

  const fetchEmployee = useCallback(async () => {
    if (!supabase || !user) return;

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .single();

    if (data) {
      setCurrentEmployee(data);
    } else {
      const { data: fallback } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      if (fallback) setCurrentEmployee(fallback);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (currentEmployee) {
      fetchProjects();
    }
  }, [currentEmployee]);

  async function fetchProjects() {
    if (!supabase || !currentEmployee) return;
    
    const { data } = await supabase
      .from('portal_projects')
      .select('*')
      .eq('owner_id', currentEmployee.id)
      .order('created_at', { ascending: false });
    
    setProjects(data || []);
  }

  async function createProject() {
    if (!supabase || !currentEmployee || !newProject.name.trim()) return;
    
    await supabase.from('portal_projects').insert([{
      owner_id: currentEmployee.id,
      name: newProject.name,
      description: newProject.description,
      color: newProject.color,
      due_date: newProject.due_date || null,
      status: 'active',
      progress: 0
    }]);

    setNewProject({ name: '', description: '', color: '#3b82f6', due_date: '' });
    setShowNewProject(false);
    fetchProjects();
  }

  async function updateProject() {
    if (!supabase || !editingProject) return;
    
    await supabase.from('portal_projects').update({
      name: editingProject.name,
      description: editingProject.description,
      color: editingProject.color,
      status: editingProject.status,
      progress: editingProject.progress,
      due_date: editingProject.due_date || null,
      completed_at: editingProject.status === 'completed' ? new Date().toISOString().split('T')[0] : null
    }).eq('id', editingProject.id);

    setEditingProject(null);
    fetchProjects();
  }

  async function updateProjectStatus(project: Project, status: Project['status']) {
    if (!supabase) return;
    
    const updateData: Record<string, unknown> = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString().split('T')[0];
      updateData.progress = 100;
    }
    
    await supabase.from('portal_projects').update(updateData).eq('id', project.id);
    fetchProjects();
  }

  async function deleteProject(project: Project) {
    if (!supabase) return;
    await supabase.from('portal_projects').delete().eq('id', project.id);
    fetchProjects();
  }

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && p.status === filterStatus;
  });

  // Stats
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const pausedProjects = projects.filter(p => p.status === 'paused').length;

  const statusIcons = {
    active: Target,
    paused: Pause,
    completed: CheckCircle2,
    archived: Archive
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#dcfce7', text: '#16a34a' },
    paused: { bg: '#fef3c7', text: '#d97706' },
    completed: { bg: '#dbeafe', text: '#2563eb' },
    archived: { bg: '#f1f5f9', text: '#64748b' }
  };

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="portal-loading-spinner" />
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="projects-page">
      {/* Header */}
      <header className="projects-header">
        <div className="projects-header-left">
          <h1>
            <FolderKanban size={24} />
            My Projects
          </h1>
          <span className="projects-count">{activeProjects} active</span>
        </div>
        <button 
          className="projects-new-btn"
          onClick={() => setShowNewProject(true)}
        >
          <Plus size={18} />
          New Project
        </button>
      </header>

      {/* Stats */}
      <div className="projects-stats">
        <div className="projects-stat">
          <Target size={18} />
          <span className="projects-stat-value">{activeProjects}</span>
          <span className="projects-stat-label">Active</span>
        </div>
        <div className="projects-stat">
          <Pause size={18} />
          <span className="projects-stat-value">{pausedProjects}</span>
          <span className="projects-stat-label">Paused</span>
        </div>
        <div className="projects-stat success">
          <CheckCircle2 size={18} />
          <span className="projects-stat-value">{completedProjects}</span>
          <span className="projects-stat-label">Completed</span>
        </div>
        <div className="projects-stat">
          <FolderKanban size={18} />
          <span className="projects-stat-value">{projects.length}</span>
          <span className="projects-stat-label">Total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="projects-filters">
        <div className="projects-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="projects-filter-tabs">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'paused', label: 'Paused' },
            { id: 'completed', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`projects-filter-tab ${filterStatus === tab.id ? 'active' : ''}`}
              onClick={() => setFilterStatus(tab.id as FilterStatus)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="projects-list-container">
        {filteredProjects.length === 0 ? (
          <div className="projects-empty">
            <FolderKanban size={48} />
            <h3>No projects found</h3>
            <p>{filterStatus === 'all' ? 'Create your first project to get started' : `No ${filterStatus} projects`}</p>
            <button onClick={() => setShowNewProject(true)}>
              <Plus size={16} />
              Create Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map(project => {
              const StatusIcon = statusIcons[project.status];
              const statusColor = statusColors[project.status];
              
              return (
                <div 
                  key={project.id}
                  className="projects-card"
                  style={{ borderTop: `4px solid ${project.color}` }}
                >
                  <div className="projects-card-header">
                    <div 
                      className="projects-card-icon"
                      style={{ background: `${project.color}20`, color: project.color }}
                    >
                      <FolderKanban size={20} />
                    </div>
                    <span 
                      className="projects-card-status"
                      style={{ background: statusColor.bg, color: statusColor.text }}
                    >
                      <StatusIcon size={12} />
                      {project.status}
                    </span>
                  </div>

                  <h3 className="projects-card-title">{project.name}</h3>
                  {project.description && (
                    <p className="projects-card-desc">{project.description}</p>
                  )}

                  <div className="projects-card-progress">
                    <div className="projects-progress-header">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="projects-progress-bar">
                      <div 
                        className="projects-progress-fill"
                        style={{ width: `${project.progress}%`, background: project.color }}
                      />
                    </div>
                  </div>

                  <div className="projects-card-meta">
                    {project.due_date && (
                      <span className="projects-card-date">
                        <Calendar size={12} />
                        Due {new Date(project.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {project.started_at && (
                      <span className="projects-card-date">
                        <Clock size={12} />
                        Started {new Date(project.started_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="projects-card-footer">
                    <select
                      className="projects-status-select"
                      value={project.status}
                      onChange={(e) => updateProjectStatus(project, e.target.value as Project['status'])}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>

                    <div className="projects-card-actions">
                      <button 
                        className="projects-card-action"
                        onClick={() => setEditingProject(project)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="projects-card-action delete"
                        onClick={() => deleteProject(project)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="projects-modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="projects-modal" onClick={(e) => e.stopPropagation()}>
            <div className="projects-modal-header">
              <h3>Create Project</h3>
              <button onClick={() => setShowNewProject(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="projects-modal-body">
              <div className="projects-form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                  autoFocus
                />
              </div>

              <div className="projects-form-group">
                <label>Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="What is this project about?"
                  rows={3}
                />
              </div>

              <div className="projects-form-group">
                <label>Color</label>
                <div className="projects-color-picker">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`projects-color-btn ${newProject.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setNewProject({ ...newProject, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="projects-form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={newProject.due_date}
                  onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="projects-modal-footer">
              <button 
                className="projects-modal-cancel"
                onClick={() => setShowNewProject(false)}
              >
                Cancel
              </button>
              <button 
                className="projects-modal-submit"
                onClick={createProject}
                disabled={!newProject.name.trim()}
              >
                <Check size={16} />
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="projects-modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="projects-modal" onClick={(e) => e.stopPropagation()}>
            <div className="projects-modal-header">
              <h3>Edit Project</h3>
              <button onClick={() => setEditingProject(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="projects-modal-body">
              <div className="projects-form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                />
              </div>

              <div className="projects-form-group">
                <label>Description</label>
                <textarea
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="projects-form-group">
                <label>Color</label>
                <div className="projects-color-picker">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`projects-color-btn ${editingProject.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setEditingProject({ ...editingProject, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="projects-form-row">
                <div className="projects-form-group">
                  <label>Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingProject.progress}
                    onChange={(e) => setEditingProject({ ...editingProject, progress: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="projects-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={editingProject.due_date || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="projects-form-group">
                <label>Status</label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as Project['status'] })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="projects-modal-footer">
              <button 
                className="projects-modal-cancel"
                onClick={() => setEditingProject(null)}
              >
                Cancel
              </button>
              <button 
                className="projects-modal-submit"
                onClick={updateProject}
              >
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
