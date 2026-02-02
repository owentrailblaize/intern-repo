'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Circle,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  User,
  Calendar,
  Tag,
  Zap,
  Bug,
  Sparkles,
  Layers,
  Target,
  X,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft
} from 'lucide-react';
import { Employee } from '@/lib/supabase';

// Types
export interface EngineeringIssue {
  id: string;
  project_id: string;
  cycle_id: string | null;
  assignee_id: string | null;
  creator_id: string | null;
  number: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: number;
  labels: string[];
  issue_type: IssueType;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
  assignee?: { id: string; name: string; email: string } | null;
  creator?: { id: string; name: string } | null;
  project?: { id: string; name: string; identifier: string; color: string } | null;
}

export interface EngineeringProject {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  color: string;
  status: string;
  issue_count?: number;
  open_issue_count?: number;
}

type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
type IssueType = 'feature' | 'bug' | 'improvement' | 'task' | 'epic';
type ViewMode = 'all' | 'active' | 'backlog';

interface LinearIssueTrackerProps {
  currentEmployee: Employee | null;
  teamMembers: Employee[];
}

// Status configuration
const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: typeof Circle; color: string }> = {
  backlog: { label: 'Backlog', icon: CircleDashed, color: '#6b7280' },
  todo: { label: 'Todo', icon: Circle, color: '#6b7280' },
  in_progress: { label: 'In Progress', icon: CircleDot, color: '#f59e0b' },
  in_review: { label: 'In Review', icon: CircleDot, color: '#8b5cf6' },
  done: { label: 'Done', icon: CheckCircle2, color: '#10b981' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: '#ef4444' }
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'No priority', color: '#6b7280', icon: '○' },
  1: { label: 'Urgent', color: '#ef4444', icon: '⚡' },
  2: { label: 'High', color: '#f59e0b', icon: '▲' },
  3: { label: 'Medium', color: '#3b82f6', icon: '■' },
  4: { label: 'Low', color: '#6b7280', icon: '▽' }
};

const TYPE_CONFIG: Record<IssueType, { label: string; icon: typeof Bug; color: string }> = {
  feature: { label: 'Feature', icon: Sparkles, color: '#8b5cf6' },
  bug: { label: 'Bug', icon: Bug, color: '#ef4444' },
  improvement: { label: 'Improvement', icon: Zap, color: '#10b981' },
  task: { label: 'Task', icon: Target, color: '#3b82f6' },
  epic: { label: 'Epic', icon: Layers, color: '#f59e0b' }
};

export function LinearIssueTracker({ currentEmployee, teamMembers }: LinearIssueTrackerProps) {
  // State
  const [issues, setIssues] = useState<EngineeringIssue[]>([]);
  const [projects, setProjects] = useState<EngineeringProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<EngineeringIssue | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<IssueStatus>>(new Set(['done', 'cancelled']));
  
  // Filters
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<number | null>(null);
  
  // New issue form
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    status: 'todo' as IssueStatus,
    priority: 0,
    issue_type: 'task' as IssueType,
    assignee_id: '',
    project_id: ''
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/engineering/projects');
      const { data } = await res.json();
      if (data) {
        setProjects(data);
        if (data.length > 0 && !newIssue.project_id) {
          setNewIssue(prev => ({ ...prev, project_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, [newIssue.project_id]);

  const fetchIssues = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (viewMode === 'active') params.set('status', 'active');
      if (viewMode === 'backlog') params.set('status', 'backlog');
      if (filterProject) params.set('project_id', filterProject);
      if (filterAssignee) params.set('assignee_id', filterAssignee);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/engineering/issues?${params}`);
      const { data } = await res.json();
      if (data) setIssues(data);
    } catch (err) {
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, filterProject, filterAssignee, searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Group issues by status
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, EngineeringIssue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: []
    };

    let filtered = issues;
    
    if (filterPriority !== null) {
      filtered = filtered.filter(i => i.priority === filterPriority);
    }

    filtered.forEach(issue => {
      groups[issue.status].push(issue);
    });

    return groups;
  }, [issues, filterPriority]);

  // Flat list for keyboard navigation
  const flatIssueList = useMemo(() => {
    const statusOrder: IssueStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled'];
    const result: EngineeringIssue[] = [];
    
    statusOrder.forEach(status => {
      if (!collapsedStatuses.has(status)) {
        result.push(...groupedIssues[status]);
      }
    });
    
    return result;
  }, [groupedIssues, collapsedStatuses]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case 'c':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowNewIssue(true);
          }
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, flatIssueList.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatIssueList[selectedIndex]) {
            setSelectedIssue(flatIssueList[selectedIndex]);
          }
          break;
        case 'Escape':
          setSelectedIssue(null);
          setShowNewIssue(false);
          setShowFilters(false);
          break;
        case '1':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            updateIssueStatus(flatIssueList[selectedIndex]?.id, 'todo');
          }
          break;
        case '2':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            updateIssueStatus(flatIssueList[selectedIndex]?.id, 'in_progress');
          }
          break;
        case '3':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            updateIssueStatus(flatIssueList[selectedIndex]?.id, 'in_review');
          }
          break;
        case '4':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            updateIssueStatus(flatIssueList[selectedIndex]?.id, 'done');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatIssueList, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatIssueList[selectedIndex]) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, flatIssueList]);

  // API actions
  const createIssue = async () => {
    if (!newIssue.title.trim() || !newIssue.project_id) return;

    try {
      const res = await fetch('/api/engineering/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newIssue,
          creator_id: currentEmployee?.id,
          assignee_id: newIssue.assignee_id || null
        })
      });

      if (res.ok) {
        setShowNewIssue(false);
        setNewIssue({
          title: '',
          description: '',
          status: 'todo',
          priority: 0,
          issue_type: 'task',
          assignee_id: '',
          project_id: projects[0]?.id || ''
        });
        fetchIssues();
      }
    } catch (err) {
      console.error('Error creating issue:', err);
    }
  };

  const updateIssueStatus = async (issueId: string | undefined, status: IssueStatus) => {
    if (!issueId) return;

    try {
      await fetch(`/api/engineering/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchIssues();
    } catch (err) {
      console.error('Error updating issue:', err);
    }
  };

  const toggleStatusCollapse = (status: IssueStatus) => {
    setCollapsedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  // Render status group
  const renderStatusGroup = (status: IssueStatus, issues: EngineeringIssue[]) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    const isCollapsed = collapsedStatuses.has(status);
    
    if (issues.length === 0 && status !== 'todo' && status !== 'in_progress') return null;

    return (
      <div key={status} className="linear-status-group">
        <button 
          className="linear-status-header"
          onClick={() => toggleStatusCollapse(status)}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <Icon size={14} style={{ color: config.color }} />
          <span className="linear-status-label">{config.label}</span>
          <span className="linear-status-count">{issues.length}</span>
        </button>

        {!isCollapsed && (
          <div className="linear-issues-list">
            {issues.map((issue, idx) => {
              const globalIndex = flatIssueList.findIndex(i => i.id === issue.id);
              const isSelected = globalIndex === selectedIndex;
              const TypeIcon = TYPE_CONFIG[issue.issue_type].icon;
              
              return (
                <div
                  key={issue.id}
                  data-index={globalIndex}
                  className={`linear-issue-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedIndex(globalIndex);
                    setSelectedIssue(issue);
                  }}
                >
                  <div className="linear-issue-left">
                    <span 
                      className="linear-issue-priority"
                      title={PRIORITY_CONFIG[issue.priority].label}
                      style={{ color: PRIORITY_CONFIG[issue.priority].color }}
                    >
                      {PRIORITY_CONFIG[issue.priority].icon}
                    </span>
                    <span className="linear-issue-id">
                      {issue.project?.identifier}-{issue.number}
                    </span>
                    <TypeIcon 
                      size={12} 
                      className="linear-issue-type"
                      style={{ color: TYPE_CONFIG[issue.issue_type].color }}
                    />
                    <span className="linear-issue-title">{issue.title}</span>
                  </div>
                  
                  <div className="linear-issue-right">
                    {issue.labels.length > 0 && (
                      <div className="linear-issue-labels">
                        {issue.labels.slice(0, 2).map(label => (
                          <span key={label} className="linear-label">{label}</span>
                        ))}
                      </div>
                    )}
                    {issue.due_date && (
                      <span className="linear-issue-date">
                        <Calendar size={12} />
                        {new Date(issue.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {issue.assignee ? (
                      <div 
                        className="linear-issue-assignee"
                        title={issue.assignee.name}
                      >
                        {issue.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                    ) : (
                      <div className="linear-issue-assignee unassigned">
                        <User size={12} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="linear-loading">
        <div className="linear-loading-spinner" />
        <p>Loading issues...</p>
      </div>
    );
  }

  return (
    <div className="linear-container">
      {/* Header */}
      <header className="linear-header">
        <div className="linear-header-left">
          <h1 className="linear-title">Product Development</h1>
          <div className="linear-view-tabs">
            <button 
              className={`linear-view-tab ${viewMode === 'active' ? 'active' : ''}`}
              onClick={() => setViewMode('active')}
            >
              Active
              <span className="linear-tab-count">
                {groupedIssues.todo.length + groupedIssues.in_progress.length + groupedIssues.in_review.length}
              </span>
            </button>
            <button 
              className={`linear-view-tab ${viewMode === 'backlog' ? 'active' : ''}`}
              onClick={() => setViewMode('backlog')}
            >
              Backlog
              <span className="linear-tab-count">{groupedIssues.backlog.length}</span>
            </button>
            <button 
              className={`linear-view-tab ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              All
            </button>
          </div>
        </div>

        <div className="linear-header-right">
          <div className="linear-search">
            <Search size={14} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <kbd>/</kbd>
          </div>
          
          <button 
            className={`linear-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            Filter
          </button>

          <button 
            className="linear-new-btn"
            onClick={() => setShowNewIssue(true)}
          >
            <Plus size={14} />
            New Issue
            <kbd>C</kbd>
          </button>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <div className="linear-filters">
          <div className="linear-filter-group">
            <label>Project</label>
            <select 
              value={filterProject} 
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="linear-filter-group">
            <label>Assignee</label>
            <select 
              value={filterAssignee} 
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="">Anyone</option>
              <option value={currentEmployee?.id || ''}>Me</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="linear-filter-group">
            <label>Priority</label>
            <select 
              value={filterPriority ?? ''} 
              onChange={(e) => setFilterPriority(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Any</option>
              <option value="1">Urgent</option>
              <option value="2">High</option>
              <option value="3">Medium</option>
              <option value="4">Low</option>
            </select>
          </div>

          <button 
            className="linear-clear-filters"
            onClick={() => {
              setFilterProject('');
              setFilterAssignee('');
              setFilterPriority(null);
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Issue List */}
      <div className="linear-list" ref={listRef}>
        {viewMode === 'all' || viewMode === 'active' ? (
          <>
            {renderStatusGroup('in_progress', groupedIssues.in_progress)}
            {renderStatusGroup('in_review', groupedIssues.in_review)}
            {renderStatusGroup('todo', groupedIssues.todo)}
            {viewMode === 'all' && renderStatusGroup('backlog', groupedIssues.backlog)}
            {viewMode === 'all' && renderStatusGroup('done', groupedIssues.done)}
            {viewMode === 'all' && renderStatusGroup('cancelled', groupedIssues.cancelled)}
          </>
        ) : (
          renderStatusGroup('backlog', groupedIssues.backlog)
        )}

        {flatIssueList.length === 0 && (
          <div className="linear-empty">
            <Target size={32} />
            <h3>No issues found</h3>
            <p>Create your first issue to get started</p>
            <button onClick={() => setShowNewIssue(true)}>
              <Plus size={14} />
              New Issue
            </button>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts footer */}
      <footer className="linear-footer">
        <div className="linear-shortcuts">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>C</kbd> Create</span>
          <span><kbd>1-4</kbd> Set status</span>
          <span><kbd>/</kbd> Search</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </footer>

      {/* New Issue Modal */}
      {showNewIssue && (
        <div className="linear-modal-overlay" onClick={() => setShowNewIssue(false)}>
          <div className="linear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="linear-modal-header">
              <h3>New Issue</h3>
              <button onClick={() => setShowNewIssue(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="linear-modal-body">
              <input
                type="text"
                className="linear-issue-input"
                placeholder="Issue title"
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                autoFocus
              />

              <textarea
                className="linear-issue-textarea"
                placeholder="Add description..."
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                rows={3}
              />

              <div className="linear-issue-meta-row">
                <select
                  value={newIssue.status}
                  onChange={(e) => setNewIssue({ ...newIssue, status: e.target.value as IssueStatus })}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                </select>

                <select
                  value={newIssue.priority}
                  onChange={(e) => setNewIssue({ ...newIssue, priority: Number(e.target.value) })}
                >
                  <option value="0">No priority</option>
                  <option value="1">⚡ Urgent</option>
                  <option value="2">▲ High</option>
                  <option value="3">■ Medium</option>
                  <option value="4">▽ Low</option>
                </select>

                <select
                  value={newIssue.issue_type}
                  onChange={(e) => setNewIssue({ ...newIssue, issue_type: e.target.value as IssueType })}
                >
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                </select>

                <select
                  value={newIssue.project_id}
                  onChange={(e) => setNewIssue({ ...newIssue, project_id: e.target.value })}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.identifier}</option>
                  ))}
                </select>

                <select
                  value={newIssue.assignee_id}
                  onChange={(e) => setNewIssue({ ...newIssue, assignee_id: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  <option value={currentEmployee?.id || ''}>Me</option>
                  {teamMembers.filter(m => m.id !== currentEmployee?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="linear-modal-footer">
              <button className="linear-cancel-btn" onClick={() => setShowNewIssue(false)}>
                Cancel
              </button>
              <button 
                className="linear-create-btn"
                onClick={createIssue}
                disabled={!newIssue.title.trim() || !newIssue.project_id}
              >
                Create Issue
                <CornerDownLeft size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Detail Sidebar */}
      {selectedIssue && (
        <div className="linear-sidebar-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="linear-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="linear-sidebar-header">
              <span className="linear-sidebar-id">
                {selectedIssue.project?.identifier}-{selectedIssue.number}
              </span>
              <button onClick={() => setSelectedIssue(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="linear-sidebar-body">
              <h2 className="linear-sidebar-title">{selectedIssue.title}</h2>
              
              {selectedIssue.description && (
                <p className="linear-sidebar-desc">{selectedIssue.description}</p>
              )}

              <div className="linear-sidebar-meta">
                <div className="linear-meta-item">
                  <label>Status</label>
                  <select
                    value={selectedIssue.status}
                    onChange={(e) => {
                      updateIssueStatus(selectedIssue.id, e.target.value as IssueStatus);
                      setSelectedIssue({ ...selectedIssue, status: e.target.value as IssueStatus });
                    }}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="linear-meta-item">
                  <label>Priority</label>
                  <span style={{ color: PRIORITY_CONFIG[selectedIssue.priority].color }}>
                    {PRIORITY_CONFIG[selectedIssue.priority].icon} {PRIORITY_CONFIG[selectedIssue.priority].label}
                  </span>
                </div>

                <div className="linear-meta-item">
                  <label>Type</label>
                  <span style={{ color: TYPE_CONFIG[selectedIssue.issue_type].color }}>
                    {TYPE_CONFIG[selectedIssue.issue_type].label}
                  </span>
                </div>

                <div className="linear-meta-item">
                  <label>Assignee</label>
                  <span>{selectedIssue.assignee?.name || 'Unassigned'}</span>
                </div>

                <div className="linear-meta-item">
                  <label>Created</label>
                  <span>{new Date(selectedIssue.created_at).toLocaleDateString()}</span>
                </div>

                {selectedIssue.due_date && (
                  <div className="linear-meta-item">
                    <label>Due</label>
                    <span>{new Date(selectedIssue.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
