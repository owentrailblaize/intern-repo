'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Clock,
  AlertTriangle,
  Bug,
  Sparkles,
  AlertCircle,
  User,
  Users,
  MessageSquare,
  Activity,
  Send,
  Bell,
  BellOff,
  ArrowRight,
  MoreHorizontal,
  Loader2,
  Trash2,
  Ticket,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

type TicketStatus = 'open' | 'in_progress' | 'in_review' | 'testing' | 'done';
type TicketType = 'bug' | 'feature_request' | 'issue';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type ViewMode = 'board' | 'list';

interface TicketData {
  id: string;
  number: number;
  title: string;
  description: string | null;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  creator_id: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  creator?: { id: string; name: string; email: string; role: string } | null;
  assignee?: { id: string; name: string; email: string; role: string } | null;
  reviewer?: { id: string; name: string; email: string; role: string } | null;
}

interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  content: string;
  mentions: string[];
  created_at: string;
  author?: { id: string; name: string; email: string; role: string } | null;
}

interface TicketActivityEntry {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor?: { id: string; name: string; email: string } | null;
}

interface TicketNotification {
  id: string;
  recipient_id: string;
  ticket_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  ticket?: { id: string; number: number; title: string; status: string } | null;
  actor?: { id: string; name: string } | null;
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const STATUS_COLUMNS: { key: TicketStatus; label: string; color: string }[] = [
  { key: 'open', label: 'Open', color: '#6b7280' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'in_review', label: 'In Review', color: '#8b5cf6' },
  { key: 'testing', label: 'Testing', color: '#3b82f6' },
  { key: 'done', label: 'Done', color: '#10b981' },
];

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: '#6b7280', icon: '▽' },
  medium: { label: 'Medium', color: '#3b82f6', icon: '■' },
  high: { label: 'High', color: '#f59e0b', icon: '▲' },
  critical: { label: 'Critical', color: '#ef4444', icon: '⚡' },
};

const TYPE_CONFIG: Record<TicketType, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug', icon: Bug, color: '#ef4444' },
  feature_request: { label: 'Feature', icon: Sparkles, color: '#8b5cf6' },
  issue: { label: 'Issue', icon: AlertCircle, color: '#f59e0b' },
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export function TicketBoard() {
  const { user, profile } = useAuth();

  // State
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ── Data fetching ──

  const fetchCurrentEmployee = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .single();
    if (data) setCurrentEmployee(data);
  }, [user]);

  const fetchEmployees = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('name');
    if (data) setEmployees(data);
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAssignee) params.set('assignee_id', filterAssignee);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/tickets?${params}`);
      const { data } = await res.json();
      if (data) setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filterAssignee, filterPriority, filterType, filterStatus, searchQuery]);

  const fetchNotifications = useCallback(async () => {
    if (!currentEmployee) return;
    try {
      const res = await fetch(
        `/api/tickets/notifications?recipient_id=${currentEmployee.id}&unread_only=true`
      );
      const { data } = await res.json();
      if (data) setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [currentEmployee]);

  useEffect(() => {
    fetchCurrentEmployee();
    fetchEmployees();
  }, [fetchCurrentEmployee, fetchEmployees]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Grouped tickets for Kanban ──

  const groupedTickets = useMemo(() => {
    const groups: Record<TicketStatus, TicketData[]> = {
      open: [],
      in_progress: [],
      in_review: [],
      testing: [],
      done: [],
    };
    tickets.forEach(t => groups[t.status]?.push(t));
    return groups;
  }, [tickets]);

  // ── Actions ──

  const markNotificationsRead = async () => {
    if (!currentEmployee || notifications.length === 0) return;
    try {
      await fetch('/api/tickets/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true, recipient_id: currentEmployee.id }),
      });
      setNotifications([]);
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const activeFilterCount = [filterStatus, filterAssignee, filterPriority, filterType].filter(Boolean).length;

  return (
    <div className="tkt">
      {/* ── Header ── */}
      <header className="tkt__header">
        <div className="tkt__header-left">
          <Ticket size={22} />
          <h1>Tickets</h1>
        </div>
        <div className="tkt__header-right">
          <div className="tkt__search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            className={`tkt__icon-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <Filter size={16} />
            {activeFilterCount > 0 && (
              <span className="tkt__filter-count">{activeFilterCount}</span>
            )}
          </button>

          <div className="tkt__view-toggle">
            <button
              className={viewMode === 'board' ? 'active' : ''}
              onClick={() => setViewMode('board')}
              title="Board view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Notifications */}
          <div className="tkt__notif-wrapper">
            <button
              className="tkt__icon-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span className="tkt__notif-dot">{notifications.length}</span>
              )}
            </button>
            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
                onClose={() => setShowNotifications(false)}
                onMarkRead={markNotificationsRead}
                onTicketClick={id => {
                  const t = tickets.find(tk => tk.id === id);
                  if (t) setSelectedTicket(t);
                  setShowNotifications(false);
                }}
              />
            )}
          </div>

          <button className="tkt__create-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Ticket
          </button>
        </div>
      </header>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="tkt__filters">
          <div className="tkt__filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              {STATUS_COLUMNS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="tkt__filter-group">
            <label>Assignee</label>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="">Anyone</option>
              {currentEmployee && <option value={currentEmployee.id}>Me</option>}
              {employees
                .filter(e => e.id !== currentEmployee?.id)
                .map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
            </select>
          </div>
          <div className="tkt__filter-group">
            <label>Priority</label>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">Any</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="tkt__filter-group">
            <label>Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Any</option>
              <option value="bug">Bug</option>
              <option value="feature_request">Feature</option>
              <option value="issue">Issue</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              className="tkt__clear-filters"
              onClick={() => {
                setFilterStatus('');
                setFilterAssignee('');
                setFilterPriority('');
                setFilterType('');
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="tkt__loading">
          <Loader2 size={24} className="tkt__spinner" />
          <p>Loading tickets...</p>
        </div>
      ) : viewMode === 'board' ? (
        <div className="tkt__board">
          {STATUS_COLUMNS.map(col => (
            <KanbanColumn
              key={col.key}
              status={col.key}
              label={col.label}
              color={col.color}
              tickets={groupedTickets[col.key]}
              onTicketClick={setSelectedTicket}
              employees={employees}
              currentEmployee={currentEmployee}
              onStatusChange={(ticketId, newStatus, reviewerId) =>
                handleStatusChange(ticketId, newStatus, currentEmployee, reviewerId, fetchTickets)
              }
            />
          ))}
        </div>
      ) : (
        <TicketListView
          tickets={tickets}
          onTicketClick={setSelectedTicket}
        />
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateTicketModal
          employees={employees}
          currentEmployee={currentEmployee}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTickets();
          }}
        />
      )}

      {/* ── Detail Panel ── */}
      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          employees={employees}
          currentEmployee={currentEmployee}
          onClose={() => setSelectedTicket(null)}
          onUpdate={() => {
            fetchTickets();
            fetchNotifications();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// STATUS CHANGE HELPER
// ═══════════════════════════════════════════

async function handleStatusChange(
  ticketId: string,
  newStatus: TicketStatus,
  currentEmployee: Employee | null,
  reviewerId: string | null,
  onDone: () => void
) {
  try {
    const body: Record<string, unknown> = {
      status: newStatus,
      actor_id: currentEmployee?.id,
    };
    if (reviewerId) body.reviewer_id = reviewerId;

    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (result.error) {
      alert(result.error.message);
    }
    onDone();
  } catch (err) {
    console.error('Error changing status:', err);
  }
}

// ═══════════════════════════════════════════
// KANBAN COLUMN
// ═══════════════════════════════════════════

function KanbanColumn({
  status,
  label,
  color,
  tickets,
  onTicketClick,
  employees,
  currentEmployee,
  onStatusChange,
}: {
  status: TicketStatus;
  label: string;
  color: string;
  tickets: TicketData[];
  onTicketClick: (t: TicketData) => void;
  employees: Employee[];
  currentEmployee: Employee | null;
  onStatusChange: (ticketId: string, newStatus: TicketStatus, reviewerId: string | null) => void;
}) {
  return (
    <div className="tkt__column">
      <div className="tkt__column-header">
        <span className="tkt__column-dot" style={{ background: color }} />
        <span className="tkt__column-label">{label}</span>
        <span className="tkt__column-count">{tickets.length}</span>
      </div>
      <div className="tkt__column-body">
        {tickets.length === 0 ? (
          <div className="tkt__column-empty">No tickets</div>
        ) : (
          tickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TICKET CARD (Kanban)
// ═══════════════════════════════════════════

function TicketCard({ ticket, onClick }: { ticket: TicketData; onClick: () => void }) {
  const TypeIcon = TYPE_CONFIG[ticket.type]?.icon || AlertCircle;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];

  return (
    <div className="tkt__card" onClick={onClick}>
      <div className="tkt__card-top">
        <span className="tkt__card-number">#{ticket.number}</span>
        <span className="tkt__card-priority" style={{ color: priorityCfg.color }}>
          {priorityCfg.icon}
        </span>
      </div>
      <h4 className="tkt__card-title">{ticket.title}</h4>
      <div className="tkt__card-bottom">
        <span className="tkt__card-type" style={{ color: TYPE_CONFIG[ticket.type]?.color }}>
          <TypeIcon size={12} />
          {TYPE_CONFIG[ticket.type]?.label}
        </span>
        {ticket.assignee ? (
          <div className="tkt__card-assignee" title={ticket.assignee.name}>
            {ticket.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
        ) : (
          <div className="tkt__card-assignee unassigned">
            <User size={12} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════

function TicketListView({
  tickets,
  onTicketClick,
}: {
  tickets: TicketData[];
  onTicketClick: (t: TicketData) => void;
}) {
  return (
    <div className="tkt__list">
      <div className="tkt__list-header-row">
        <span className="tkt__list-col tkt__list-col--id">#</span>
        <span className="tkt__list-col tkt__list-col--title">Title</span>
        <span className="tkt__list-col tkt__list-col--status">Status</span>
        <span className="tkt__list-col tkt__list-col--priority">Priority</span>
        <span className="tkt__list-col tkt__list-col--type">Type</span>
        <span className="tkt__list-col tkt__list-col--assignee">Assignee</span>
        <span className="tkt__list-col tkt__list-col--date">Created</span>
      </div>
      {tickets.length === 0 ? (
        <div className="tkt__list-empty">No tickets found</div>
      ) : (
        tickets.map(ticket => {
          const statusCol = STATUS_COLUMNS.find(s => s.key === ticket.status);
          const TypeIcon = TYPE_CONFIG[ticket.type]?.icon || AlertCircle;
          return (
            <div
              key={ticket.id}
              className="tkt__list-row"
              onClick={() => onTicketClick(ticket)}
            >
              <span className="tkt__list-col tkt__list-col--id">{ticket.number}</span>
              <span className="tkt__list-col tkt__list-col--title">{ticket.title}</span>
              <span className="tkt__list-col tkt__list-col--status">
                <span className="tkt__status-pill" style={{ color: statusCol?.color, background: `${statusCol?.color}15` }}>
                  {statusCol?.label}
                </span>
              </span>
              <span className="tkt__list-col tkt__list-col--priority">
                <span style={{ color: PRIORITY_CONFIG[ticket.priority].color }}>
                  {PRIORITY_CONFIG[ticket.priority].icon} {PRIORITY_CONFIG[ticket.priority].label}
                </span>
              </span>
              <span className="tkt__list-col tkt__list-col--type">
                <TypeIcon size={12} style={{ color: TYPE_CONFIG[ticket.type]?.color }} />
                {TYPE_CONFIG[ticket.type]?.label}
              </span>
              <span className="tkt__list-col tkt__list-col--assignee">
                {ticket.assignee?.name || 'Unassigned'}
              </span>
              <span className="tkt__list-col tkt__list-col--date">
                {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CREATE TICKET MODAL
// ═══════════════════════════════════════════

function CreateTicketModal({
  employees,
  currentEmployee,
  onClose,
  onCreated,
}: {
  employees: Employee[];
  currentEmployee: Employee | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('bug');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          priority,
          assignee_id: assigneeId || null,
          creator_id: currentEmployee?.id || null,
        }),
      });
      const result = await res.json();
      if (result.error) {
        alert(result.error.message);
      } else {
        onCreated();
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="tkt__overlay" onClick={onClose}>
      <div className="tkt__modal" onClick={e => e.stopPropagation()}>
        <div className="tkt__modal-header">
          <h2>New Ticket</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="tkt__modal-body">
          <div className="tkt__field">
            <label>Title *</label>
            <input
              type="text"
              placeholder="Brief summary of the issue..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="tkt__field">
            <label>Description</label>
            <textarea
              placeholder="Steps to reproduce, expected behavior, screenshots..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="tkt__field-row">
            <div className="tkt__field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value as TicketType)}>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="issue">Issue</option>
              </select>
            </div>
            <div className="tkt__field">
              <label>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="tkt__field">
              <label>Assign to</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="tkt__modal-footer">
          <button className="tkt__btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="tkt__btn-primary"
            onClick={handleSubmit}
            disabled={!title.trim() || creating}
          >
            {creating ? <Loader2 size={14} className="tkt__spinner" /> : <Plus size={14} />}
            {creating ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TICKET DETAIL PANEL (slide-over)
// ═══════════════════════════════════════════

function TicketDetailPanel({
  ticket,
  employees,
  currentEmployee,
  onClose,
  onUpdate,
}: {
  ticket: TicketData;
  employees: Employee[];
  currentEmployee: Employee | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activity, setActivity] = useState<TicketActivityEntry[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`);
      const { data } = await res.json();
      if (data) setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }, [ticket.id]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/activity`);
      const { data } = await res.json();
      if (data) setActivity(data);
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  }, [ticket.id]);

  useEffect(() => {
    fetchComments();
    fetchActivity();
  }, [fetchComments, fetchActivity]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Parse @mentions from comment text
  const parseMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+\s\w+)/g;
    const mentioned: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const emp = employees.find(e => e.name.toLowerCase() === match[1].toLowerCase());
      if (emp) mentioned.push(emp.id);
    }
    return mentioned;
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const mentions = parseMentions(commentText);
      await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText.trim(),
          author_id: currentEmployee?.id || null,
          mentions,
        }),
      });
      setCommentText('');
      fetchComments();
      fetchActivity();
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: string | null) => {
    setUpdating(true);
    try {
      const body: Record<string, unknown> = {
        [field]: value,
        actor_id: currentEmployee?.id,
      };
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.error) {
        alert(result.error.message);
      } else {
        onUpdate();
        fetchActivity();
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
    } finally {
      setUpdating(false);
    }
  };

  const statusCol = STATUS_COLUMNS.find(s => s.key === ticket.status);
  const TypeIcon = TYPE_CONFIG[ticket.type]?.icon || AlertCircle;

  return (
    <div className="tkt__overlay" onClick={onClose}>
      <div className="tkt__detail" onClick={e => e.stopPropagation()}>
        {/* Detail Header */}
        <div className="tkt__detail-header">
          <div className="tkt__detail-header-left">
            <span className="tkt__detail-number">#{ticket.number}</span>
            <span
              className="tkt__status-pill"
              style={{ color: statusCol?.color, background: `${statusCol?.color}15` }}
            >
              {statusCol?.label}
            </span>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {/* Title & Description */}
        <div className="tkt__detail-body">
          <h2 className="tkt__detail-title">{ticket.title}</h2>
          {ticket.description && (
            <p className="tkt__detail-desc">{ticket.description}</p>
          )}

          {/* Meta Fields */}
          <div className="tkt__detail-meta">
            <div className="tkt__meta-row">
              <label>Status</label>
              <select
                value={ticket.status}
                onChange={e => handleFieldUpdate('status', e.target.value)}
                disabled={updating}
              >
                {STATUS_COLUMNS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="tkt__meta-row">
              <label>Priority</label>
              <select
                value={ticket.priority}
                onChange={e => handleFieldUpdate('priority', e.target.value)}
                disabled={updating}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="tkt__meta-row">
              <label>Type</label>
              <span style={{ color: TYPE_CONFIG[ticket.type]?.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TypeIcon size={14} />
                {TYPE_CONFIG[ticket.type]?.label}
              </span>
            </div>
            <div className="tkt__meta-row">
              <label>Assignee</label>
              <select
                value={ticket.assignee_id || ''}
                onChange={e => handleFieldUpdate('assignee_id', e.target.value || null)}
                disabled={updating}
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="tkt__meta-row">
              <label>Reviewer</label>
              <select
                value={ticket.reviewer_id || ''}
                onChange={e => handleFieldUpdate('reviewer_id', e.target.value || null)}
                disabled={updating}
              >
                <option value="">None</option>
                {employees
                  .filter(emp => emp.id !== ticket.assignee_id)
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
              </select>
            </div>
            <div className="tkt__meta-row">
              <label>Creator</label>
              <span>{ticket.creator?.name || 'Unknown'}</span>
            </div>
            <div className="tkt__meta-row">
              <label>Created</label>
              <span>{new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {ticket.resolved_at && (
              <div className="tkt__meta-row">
                <label>Resolved</label>
                <span>{new Date(ticket.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* QA Gate Info */}
          {ticket.status === 'testing' && (
            <div className="tkt__qa-gate">
              <AlertTriangle size={14} />
              <span>
                QA Gate: A reviewer (different from assignee) must verify before marking Done.
                {!ticket.reviewer_id && ' Assign a reviewer above.'}
              </span>
            </div>
          )}

          {/* Tabs: Comments / Activity */}
          <div className="tkt__tabs">
            <button
              className={activeTab === 'comments' ? 'active' : ''}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare size={14} />
              Comments ({comments.length})
            </button>
            <button
              className={activeTab === 'activity' ? 'active' : ''}
              onClick={() => setActiveTab('activity')}
            >
              <Activity size={14} />
              Activity ({activity.length})
            </button>
          </div>

          {/* Comments */}
          {activeTab === 'comments' && (
            <div className="tkt__comments">
              {comments.length === 0 ? (
                <p className="tkt__comments-empty">No comments yet. Start the conversation.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="tkt__comment">
                    <div className="tkt__comment-avatar">
                      {c.author?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                    </div>
                    <div className="tkt__comment-body">
                      <div className="tkt__comment-header">
                        <span className="tkt__comment-author">{c.author?.name || 'Unknown'}</span>
                        <span className="tkt__comment-time">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' '}
                          {new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="tkt__comment-text">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />

              {/* Comment Input */}
              <div className="tkt__comment-input">
                <textarea
                  placeholder="Write a comment... Use @name to mention someone"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment();
                  }}
                  rows={2}
                />
                <button
                  className="tkt__send-btn"
                  onClick={handleComment}
                  disabled={!commentText.trim() || sending}
                >
                  {sending ? <Loader2 size={14} className="tkt__spinner" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Activity */}
          {activeTab === 'activity' && (
            <div className="tkt__activity">
              {activity.length === 0 ? (
                <p className="tkt__activity-empty">No activity recorded yet.</p>
              ) : (
                activity.map(a => (
                  <div key={a.id} className="tkt__activity-item">
                    <div className="tkt__activity-dot" />
                    <div className="tkt__activity-content">
                      <span className="tkt__activity-actor">{a.actor?.name || 'System'}</span>
                      {' '}
                      <span className="tkt__activity-action">
                        {formatActivityAction(a)}
                      </span>
                      <span className="tkt__activity-time">
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatActivityAction(a: TicketActivityEntry): string {
  switch (a.action) {
    case 'created':
      return 'created this ticket';
    case 'status_changed':
      return `changed status from ${a.from_value?.replace('_', ' ')} to ${a.to_value?.replace('_', ' ')}`;
    case 'assigned':
      return a.to_value ? 'assigned this ticket' : 'unassigned this ticket';
    case 'priority_changed':
      return `changed priority from ${a.from_value} to ${a.to_value}`;
    case 'commented':
      return 'added a comment';
    default:
      return a.action.replace('_', ' ');
  }
}

// ═══════════════════════════════════════════
// NOTIFICATION DROPDOWN
// ═══════════════════════════════════════════

function NotificationDropdown({
  notifications,
  onClose,
  onMarkRead,
  onTicketClick,
}: {
  notifications: TicketNotification[];
  onClose: () => void;
  onMarkRead: () => void;
  onTicketClick: (ticketId: string) => void;
}) {
  return (
    <div className="tkt__notif-dropdown">
      <div className="tkt__notif-header">
        <span>Notifications</span>
        {notifications.length > 0 && (
          <button onClick={onMarkRead}>Mark all read</button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="tkt__notif-empty">
          <BellOff size={20} />
          <p>All caught up</p>
        </div>
      ) : (
        <div className="tkt__notif-list">
          {notifications.map(n => (
            <div
              key={n.id}
              className="tkt__notif-item"
              onClick={() => onTicketClick(n.ticket_id)}
            >
              <p className="tkt__notif-message">{n.message}</p>
              <span className="tkt__notif-time">
                {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
