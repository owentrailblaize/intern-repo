'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Code,
  GitBranch,
  Bug,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Target,
  FileCode,
  Users,
  CheckSquare,
  CircleDot,
  Circle,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Zap,
  Layers,
  Clock,
  ArrowRight,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  Flame,
  Activity,
  BarChart3,
  User,
  Ticket,
  MessageSquare,
} from 'lucide-react';
import { FocusTimer } from '../FocusTimer';
import { UseWorkspaceDataReturn } from '../../hooks/useWorkspaceData';
import { Employee } from '@/lib/supabase';

interface EngineerDashboardProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
}

interface EngineeringIssue {
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

interface EngineeringProject {
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

// Ticket types for the dashboard widget
interface DashboardTicket {
  id: string;
  number: number;
  title: string;
  description: string | null;
  type: 'bug' | 'feature_request' | 'issue' | 'improvement' | 'task' | 'epic';
  priority: 'none' | 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'todo' | 'open' | 'in_progress' | 'in_review' | 'testing' | 'done' | 'canceled';
  creator_id: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  external_id: string | null;
  labels: string[];
  project: string | null;
  story_points: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  creator?: { id: string; name: string; email: string; role: string } | null;
  assignee?: { id: string; name: string; email: string; role: string } | null;
  reviewer?: { id: string; name: string; email: string; role: string } | null;
}

const TICKET_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#9ca3af' },
  todo: { label: 'Todo', color: '#6b7280' },
  open: { label: 'Open', color: '#6b7280' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  in_review: { label: 'In Review', color: '#8b5cf6' },
  testing: { label: 'Testing', color: '#3b82f6' },
  done: { label: 'Done', color: '#10b981' },
  canceled: { label: 'Canceled', color: '#ef4444' },
};

const TICKET_PRIORITY_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  critical: { label: 'P0', color: '#ef4444', badge: 'P0' },
  high: { label: 'P1', color: '#f59e0b', badge: 'P1' },
  medium: { label: 'P2', color: '#3b82f6', badge: 'P2' },
  low: { label: 'P3', color: '#6b7280', badge: 'P3' },
  none: { label: 'P4', color: '#d1d5db', badge: 'P4' },
};

const TICKET_TYPE_ICONS: Record<string, { icon: typeof Bug; color: string }> = {
  bug: { icon: Bug, color: '#ef4444' },
  feature_request: { icon: Sparkles, color: '#8b5cf6' },
  issue: { icon: AlertTriangle, color: '#f59e0b' },
  improvement: { icon: Zap, color: '#10b981' },
  task: { icon: Target, color: '#3b82f6' },
  epic: { icon: Layers, color: '#f59e0b' },
};

const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: typeof Circle; color: string }> = {
  backlog: { label: 'Backlog', icon: CircleDashed, color: '#6b7280' },
  todo: { label: 'Todo', icon: Circle, color: '#6b7280' },
  in_progress: { label: 'In Progress', icon: CircleDot, color: '#f59e0b' },
  in_review: { label: 'In Review', icon: CircleDot, color: '#8b5cf6' },
  done: { label: 'Done', icon: CheckCircle2, color: '#10b981' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: '#ef4444' },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'No priority', color: '#6b7280', icon: '—' },
  1: { label: 'Urgent', color: '#ef4444', icon: '⚡' },
  2: { label: 'High', color: '#f59e0b', icon: '▲' },
  3: { label: 'Medium', color: '#3b82f6', icon: '■' },
  4: { label: 'Low', color: '#6b7280', icon: '▽' },
};

const TYPE_CONFIG: Record<IssueType, { label: string; icon: typeof Bug; color: string }> = {
  feature: { label: 'Feature', icon: Sparkles, color: '#8b5cf6' },
  bug: { label: 'Bug', icon: Bug, color: '#ef4444' },
  improvement: { label: 'Improvement', icon: Zap, color: '#10b981' },
  task: { label: 'Task', icon: Target, color: '#3b82f6' },
  epic: { label: 'Epic', icon: Layers, color: '#f59e0b' },
};

/**
 * Engineer Dashboard
 * Ticket-first, work-focused command center.
 * Centered on engineering issues, active work, and sprint progress.
 */
export function EngineerDashboard({ data, teamMembers }: EngineerDashboardProps) {
  const { currentEmployee, tasks, stats, tasksLoading } = data;

  const [issues, setIssues] = useState<EngineeringIssue[]>([]);
  const [projects, setProjects] = useState<EngineeringProject[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<IssueStatus>>(
    new Set(['done', 'cancelled', 'backlog'])
  );

  // Ticket data for dashboard widget
  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets?status=active');
      const { data: ticketData } = await res.json();
      if (ticketData) setTickets(ticketData);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as DashboardTicket['status'] } : t));
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actor_id: currentEmployee?.id }),
      });
      const result = await res.json();
      if (result.error) {
        alert(result.error.message);
        fetchTickets();
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      fetchTickets();
    }
  };

  const updateTicketAssignee = async (ticketId: string, assigneeId: string | null) => {
    try {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignee_id: assigneeId } : t));
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId, actor_id: currentEmployee?.id }),
      });
      fetchTickets();
    } catch (err) {
      console.error('Error updating ticket assignee:', err);
      fetchTickets();
    }
  };

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/engineering/projects');
      const { data: projectData } = await res.json();
      if (projectData) setProjects(projectData);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set('project_id', filterProject);
      if (filterAssignee) params.set('assignee_id', filterAssignee);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/engineering/issues?${params}`);
      const { data: issueData } = await res.json();
      if (issueData) setIssues(issueData);
    } catch (err) {
      console.error('Error fetching issues:', err);
    } finally {
      setIssuesLoading(false);
    }
  }, [filterProject, filterAssignee, searchQuery]);

  useEffect(() => {
    fetchProjects();
    fetchTickets();
  }, [fetchProjects, fetchTickets]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const updateIssueStatus = async (issueId: string, status: IssueStatus) => {
    try {
      setIssues(prev =>
        prev.map(i => (i.id === issueId ? { ...i, status } : i))
      );
      await fetch(`/api/engineering/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchIssues();
    } catch (err) {
      console.error('Error updating issue status:', err);
      fetchIssues();
    }
  };

  // Derived data
  const myIssues = useMemo(
    () => issues.filter(i => i.assignee_id === currentEmployee?.id),
    [issues, currentEmployee?.id]
  );

  const activeWork = useMemo(
    () => myIssues.filter(i => i.status === 'in_progress'),
    [myIssues]
  );

  const myReviewIssues = useMemo(
    () => myIssues.filter(i => i.status === 'in_review'),
    [myIssues]
  );

  const myTodoIssues = useMemo(
    () => myIssues.filter(i => i.status === 'todo'),
    [myIssues]
  );

  const myBugs = useMemo(
    () => myIssues.filter(i => i.issue_type === 'bug' && !['done', 'cancelled'].includes(i.status)),
    [myIssues]
  );

  const recentlyCompleted = useMemo(
    () =>
      myIssues
        .filter(i => i.status === 'done' && i.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
        .slice(0, 5),
    [myIssues]
  );

  const allOpenIssues = useMemo(
    () => myIssues.filter(i => !['done', 'cancelled'].includes(i.status)),
    [myIssues]
  );

  const allDoneIssues = useMemo(
    () => myIssues.filter(i => i.status === 'done'),
    [myIssues]
  );

  const completionRate = useMemo(() => {
    const total = myIssues.length;
    if (total === 0) return 0;
    return Math.round((allDoneIssues.length / total) * 100);
  }, [myIssues, allDoneIssues]);

  // Ticket widget derived data
  const myTickets = useMemo(
    () => tickets.filter(t => t.assignee_id === currentEmployee?.id && t.status !== 'done' && t.status !== 'canceled'),
    [tickets, currentEmployee?.id]
  );

  const sortedTickets = useMemo(() => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    return [...tickets]
      .filter(t => t.status !== 'done' && t.status !== 'canceled')
      .sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 3;
        const pb = priorityOrder[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
      .slice(0, 10);
  }, [tickets]);

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Group all issues by status for the full tracker
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, EngineeringIssue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    };
    issues.forEach(issue => {
      groups[issue.status].push(issue);
    });
    return groups;
  }, [issues]);

  const toggleStatusCollapse = (status: IssueStatus) => {
    setCollapsedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const firstName = currentEmployee?.name?.split(' ')[0] || 'Engineer';

  return (
    <div className="eng-dash">
      {/* ── Header ── */}
      <header className="eng-dash__header">
        <div className="eng-dash__header-left">
          <h1 className="eng-dash__greeting">
            {greeting}, {firstName}
          </h1>
          <span className="eng-dash__date">{todayStr}</span>
        </div>
        <div className="eng-dash__header-right">
          <FocusTimer compact />
        </div>
      </header>

      {/* ── Stats Strip ── */}
      <div className="eng-dash__stats">
        <div className="eng-dash__stat">
          <div className="eng-dash__stat-icon" style={{ color: '#f59e0b' }}>
            <CircleDot size={16} />
          </div>
          <div className="eng-dash__stat-info">
            <span className="eng-dash__stat-value">{activeWork.length}</span>
            <span className="eng-dash__stat-label">In Progress</span>
          </div>
        </div>
        <div className="eng-dash__stat">
          <div className="eng-dash__stat-icon" style={{ color: '#8b5cf6' }}>
            <GitBranch size={16} />
          </div>
          <div className="eng-dash__stat-info">
            <span className="eng-dash__stat-value">{myReviewIssues.length}</span>
            <span className="eng-dash__stat-label">In Review</span>
          </div>
        </div>
        <div className="eng-dash__stat">
          <div className="eng-dash__stat-icon" style={{ color: '#3b82f6' }}>
            <CheckSquare size={16} />
          </div>
          <div className="eng-dash__stat-info">
            <span className="eng-dash__stat-value">{myTodoIssues.length}</span>
            <span className="eng-dash__stat-label">Todo</span>
          </div>
        </div>
        <div className="eng-dash__stat">
          <div className="eng-dash__stat-icon" style={{ color: '#ef4444' }}>
            <Bug size={16} />
          </div>
          <div className="eng-dash__stat-info">
            <span className="eng-dash__stat-value">{myBugs.length}</span>
            <span className="eng-dash__stat-label">Bugs</span>
          </div>
        </div>
        <div className="eng-dash__stat">
          <div className="eng-dash__stat-icon" style={{ color: '#10b981' }}>
            <BarChart3 size={16} />
          </div>
          <div className="eng-dash__stat-info">
            <span className="eng-dash__stat-value">{completionRate}%</span>
            <span className="eng-dash__stat-label">Done</span>
          </div>
        </div>
      </div>

      {/* ── Ticket Widget ── */}
      <section className="eng-dash__tickets">
        <div className="eng-dash__section-header">
          <h2>
            <Ticket size={18} />
            My Tickets
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {myTickets.length > 0 && (
              <span className="eng-dash__badge eng-dash__badge--warning">
                {myTickets.length} unresolved
              </span>
            )}
            <Link href="/workspace/tickets" className="eng-dash__view-all">
              View All <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {ticketsLoading ? (
          <div className="eng-dash__loading">Loading tickets...</div>
        ) : sortedTickets.length === 0 ? (
          <div className="eng-dash__empty-active">
            <Ticket size={24} />
            <p>No open tickets. Create one from the <Link href="/workspace/tickets">Tickets page</Link>.</p>
          </div>
        ) : (
          <div className="eng-dash__ticket-list">
            {sortedTickets.map(ticket => {
              const TypeIconInfo = TICKET_TYPE_ICONS[ticket.type] || TICKET_TYPE_ICONS.issue;
              const TypeIcon = TypeIconInfo.icon;
              const priorityCfg = TICKET_PRIORITY_CONFIG[ticket.priority];
              const statusCfg = TICKET_STATUS_CONFIG[ticket.status];
              return (
                <div key={ticket.id} className="eng-dash__ticket-row">
                  <div className="eng-dash__ticket-left">
                    <span
                      className="eng-dash__ticket-priority-badge"
                      style={{ backgroundColor: `${priorityCfg.color}18`, color: priorityCfg.color }}
                    >
                      {priorityCfg.badge}
                    </span>
                    <TypeIcon size={14} style={{ color: TypeIconInfo.color, flexShrink: 0 }} />
                    <span className="eng-dash__ticket-number">
                      #{ticket.number}
                      {ticket.external_id && <span className="eng-dash__ticket-ext-id">{ticket.external_id}</span>}
                    </span>
                    <span className="eng-dash__ticket-title">{ticket.title}</span>
                  </div>
                  <div className="eng-dash__ticket-right">
                    <span
                      className="eng-dash__ticket-status"
                      style={{ backgroundColor: `${statusCfg.color}18`, color: statusCfg.color }}
                    >
                      {statusCfg.label}
                    </span>
                    {ticket.assignee ? (
                      <div
                        className="eng-dash__ticket-avatar"
                        title={ticket.assignee.name}
                      >
                        {ticket.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                    ) : (
                      <div className="eng-dash__ticket-avatar unassigned" title="Unassigned">
                        <User size={12} />
                      </div>
                    )}
                    <span className="eng-dash__ticket-age">{timeAgo(ticket.created_at)}</span>
                    {/* Inline actions */}
                    <div className="eng-dash__ticket-actions">
                      {(ticket.status === 'open' || ticket.status === 'backlog' || ticket.status === 'todo') && (
                        <button
                          className="eng-dash__tkt-action-btn"
                          onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                          title="Start working"
                        >
                          <CircleDot size={12} />
                        </button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <button
                          className="eng-dash__tkt-action-btn"
                          onClick={() => updateTicketStatus(ticket.id, 'in_review')}
                          title="Move to review"
                        >
                          <GitBranch size={12} />
                        </button>
                      )}
                      {ticket.status === 'in_review' && (
                        <button
                          className="eng-dash__tkt-action-btn"
                          onClick={() => updateTicketStatus(ticket.id, 'testing')}
                          title="Move to testing"
                        >
                          <CheckSquare size={12} />
                        </button>
                      )}
                      {!ticket.assignee_id && currentEmployee?.id && (
                        <button
                          className="eng-dash__tkt-action-btn eng-dash__tkt-action-btn--assign"
                          onClick={() => updateTicketAssignee(ticket.id, currentEmployee.id)}
                          title="Assign to me"
                        >
                          <User size={12} />
                        </button>
                      )}
                      <Link
                        href="/workspace/tickets"
                        className="eng-dash__tkt-action-btn"
                        title="Add comment"
                      >
                        <MessageSquare size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Active Work Hero ── */}
      <section className="eng-dash__active">
        <div className="eng-dash__section-header">
          <h2>
            <Flame size={18} />
            Active Work
          </h2>
          <span className="eng-dash__badge">{activeWork.length}</span>
        </div>

        {issuesLoading ? (
          <div className="eng-dash__loading">Loading...</div>
        ) : activeWork.length === 0 ? (
          <div className="eng-dash__empty-active">
            <Activity size={24} />
            <p>No issues in progress. Pick up a ticket below to get started.</p>
          </div>
        ) : (
          <div className="eng-dash__active-grid">
            {activeWork.map(issue => {
              const TypeIcon = TYPE_CONFIG[issue.issue_type].icon;
              return (
                <div key={issue.id} className="eng-dash__active-card">
                  <div className="eng-dash__active-card-top">
                    <span
                      className="eng-dash__active-project"
                      style={{
                        backgroundColor: `${issue.project?.color || '#5e6ad2'}15`,
                        color: issue.project?.color || '#5e6ad2',
                      }}
                    >
                      {issue.project?.identifier}-{issue.number}
                    </span>
                    <TypeIcon
                      size={14}
                      style={{ color: TYPE_CONFIG[issue.issue_type].color }}
                    />
                    <span
                      className="eng-dash__active-priority"
                      style={{ color: PRIORITY_CONFIG[issue.priority].color }}
                    >
                      {PRIORITY_CONFIG[issue.priority].icon}
                    </span>
                  </div>
                  <h3 className="eng-dash__active-title">{issue.title}</h3>
                  {issue.description && (
                    <p className="eng-dash__active-desc">
                      {issue.description.slice(0, 100)}
                      {issue.description.length > 100 ? '...' : ''}
                    </p>
                  )}
                  <div className="eng-dash__active-card-bottom">
                    {issue.due_date && (
                      <span className="eng-dash__active-due">
                        <Clock size={12} />
                        {new Date(issue.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    <div className="eng-dash__active-actions">
                      <button
                        className="eng-dash__status-btn eng-dash__status-btn--review"
                        onClick={() => updateIssueStatus(issue.id, 'in_review')}
                        title="Move to In Review"
                      >
                        <GitBranch size={12} />
                        Review
                      </button>
                      <button
                        className="eng-dash__status-btn eng-dash__status-btn--done"
                        onClick={() => updateIssueStatus(issue.id, 'done')}
                        title="Mark as Done"
                      >
                        <CheckCircle2 size={12} />
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Issue Tracker ── */}
      <section className="eng-dash__tracker">
        <div className="eng-dash__tracker-header">
          <div className="eng-dash__tracker-header-left">
            <h2>
              <Layers size={18} />
              All Issues
            </h2>
            <span className="eng-dash__tracker-count">{issues.length} total</span>
          </div>
          <div className="eng-dash__tracker-header-right">
            <div className="eng-dash__search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className={`eng-dash__filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} />
              Filter
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="eng-dash__filters">
            <div className="eng-dash__filter-group">
              <label>Project</label>
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="eng-dash__filter-group">
              <label>Assignee</label>
              <select
                value={filterAssignee}
                onChange={e => setFilterAssignee(e.target.value)}
              >
                <option value="">Anyone</option>
                {currentEmployee && (
                  <option value={currentEmployee.id}>Me</option>
                )}
                {teamMembers
                  .filter(m => m.id !== currentEmployee?.id)
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="eng-dash__clear-filters"
              onClick={() => {
                setFilterProject('');
                setFilterAssignee('');
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div className="eng-dash__tracker-list">
          {issuesLoading ? (
            <div className="eng-dash__loading">Loading issues...</div>
          ) : (
            (['in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled'] as IssueStatus[]).map(
              status => {
                const statusIssues = groupedIssues[status];
                if (
                  statusIssues.length === 0 &&
                  status !== 'todo' &&
                  status !== 'in_progress'
                )
                  return null;

                const config = STATUS_CONFIG[status];
                const StatusIcon = config.icon;
                const isCollapsed = collapsedStatuses.has(status);

                return (
                  <div key={status} className="eng-dash__status-group">
                    <button
                      className="eng-dash__status-header"
                      onClick={() => toggleStatusCollapse(status)}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      <StatusIcon size={14} style={{ color: config.color }} />
                      <span className="eng-dash__status-label">
                        {config.label}
                      </span>
                      <span className="eng-dash__status-count">
                        {statusIssues.length}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="eng-dash__issue-list">
                        {statusIssues.length === 0 ? (
                          <div className="eng-dash__issue-empty">
                            No {config.label.toLowerCase()} issues
                          </div>
                        ) : (
                          statusIssues.map(issue => {
                            const TypeIcon = TYPE_CONFIG[issue.issue_type].icon;
                            return (
                              <div key={issue.id} className="eng-dash__issue-row">
                                <div className="eng-dash__issue-left">
                                  <span
                                    className="eng-dash__issue-priority"
                                    style={{
                                      color: PRIORITY_CONFIG[issue.priority].color,
                                    }}
                                  >
                                    {PRIORITY_CONFIG[issue.priority].icon}
                                  </span>
                                  <span className="eng-dash__issue-id">
                                    {issue.project?.identifier}-{issue.number}
                                  </span>
                                  <TypeIcon
                                    size={12}
                                    style={{
                                      color: TYPE_CONFIG[issue.issue_type].color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span className="eng-dash__issue-title">
                                    {issue.title}
                                  </span>
                                </div>
                                <div className="eng-dash__issue-right">
                                  {issue.labels.length > 0 && (
                                    <div className="eng-dash__issue-labels">
                                      {issue.labels.slice(0, 2).map(label => (
                                        <span
                                          key={label}
                                          className="eng-dash__label"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {issue.due_date && (
                                    <span className="eng-dash__issue-date">
                                      <Calendar size={12} />
                                      {new Date(issue.due_date).toLocaleDateString(
                                        'en-US',
                                        { month: 'short', day: 'numeric' }
                                      )}
                                    </span>
                                  )}
                                  {issue.assignee ? (
                                    <div
                                      className="eng-dash__issue-assignee"
                                      title={issue.assignee.name}
                                    >
                                      {issue.assignee.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .substring(0, 2)}
                                    </div>
                                  ) : (
                                    <div className="eng-dash__issue-assignee unassigned">
                                      <User size={12} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )
          )}
        </div>
      </section>

      {/* ── Bottom Panels ── */}
      <div className="eng-dash__bottom">
        {/* Recently Completed */}
        <section className="eng-dash__panel">
          <div className="eng-dash__panel-header">
            <h3>
              <CheckCircle2 size={16} />
              Recently Completed
            </h3>
          </div>
          {recentlyCompleted.length === 0 ? (
            <p className="eng-dash__panel-empty">No completed issues yet</p>
          ) : (
            <div className="eng-dash__compact-list">
              {recentlyCompleted.map(issue => (
                <div key={issue.id} className="eng-dash__compact-item">
                  <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span className="eng-dash__compact-id">
                    {issue.project?.identifier}-{issue.number}
                  </span>
                  <span className="eng-dash__compact-title">{issue.title}</span>
                  {issue.completed_at && (
                    <span className="eng-dash__compact-date">
                      {new Date(issue.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bug Queue */}
        <section className="eng-dash__panel">
          <div className="eng-dash__panel-header">
            <h3>
              <Bug size={16} />
              Bug Queue
            </h3>
            <span className="eng-dash__badge eng-dash__badge--warning">
              {myBugs.length}
            </span>
          </div>
          {myBugs.length === 0 ? (
            <p className="eng-dash__panel-empty">No open bugs</p>
          ) : (
            <div className="eng-dash__compact-list">
              {myBugs.slice(0, 5).map(issue => (
                <div key={issue.id} className="eng-dash__compact-item">
                  <span
                    className="eng-dash__compact-priority"
                    style={{ color: PRIORITY_CONFIG[issue.priority].color }}
                  >
                    {PRIORITY_CONFIG[issue.priority].icon}
                  </span>
                  <span className="eng-dash__compact-id">
                    {issue.project?.identifier}-{issue.number}
                  </span>
                  <span className="eng-dash__compact-title">{issue.title}</span>
                  <span
                    className="eng-dash__compact-status"
                    style={{ color: STATUS_CONFIG[issue.status].color }}
                  >
                    {STATUS_CONFIG[issue.status].label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links & Team */}
        <section className="eng-dash__panel">
          <div className="eng-dash__panel-header">
            <h3>
              <Code size={16} />
              Quick Links
            </h3>
          </div>
          <div className="eng-dash__links">
            <a
              href="https://github.com/trailblaize"
              target="_blank"
              rel="noopener noreferrer"
              className="eng-dash__link"
            >
              <GitBranch size={14} />
              GitHub
              <ChevronRight size={12} />
            </a>
            <Link href="/nucleus/operations" className="eng-dash__link">
              <Bug size={14} />
              Bug Tracker
              <ChevronRight size={12} />
            </Link>
            <Link href="/nucleus/operations" className="eng-dash__link">
              <Sparkles size={14} />
              Features
              <ChevronRight size={12} />
            </Link>
          </div>
          <div className="eng-dash__team-strip">
            {teamMembers.slice(0, 6).map((member, i) => (
              <div
                key={member.id}
                className="eng-dash__team-avatar"
                style={{
                  backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'][i % 6],
                  zIndex: 6 - i,
                }}
                title={member.name}
              >
                {member.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
            ))}
            {teamMembers.length > 6 && (
              <div className="eng-dash__team-more">+{teamMembers.length - 6}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
