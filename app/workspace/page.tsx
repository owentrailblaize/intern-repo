'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Calendar, Clock, 
  ChevronRight, Bell, Users, Target, Zap,
  X, Check, UserPlus, Mail, Phone, Building,
  Code, Bug, Sparkles, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase, Employee, ROLE_HIERARCHY, ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/supabase';

interface EmployeeTask {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string;
  created_at: string;
}

interface PersonalLead {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  lead_type: 'alumni' | 'chapter' | 'sponsor' | 'other';
  status: 'new' | 'contacted' | 'responding' | 'meeting_set' | 'converted' | 'lost';
  first_contact: string;
  last_contact: string;
  next_followup: string;
  notes: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
}

export default function WorkspacePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [leads, setLeads] = useState<PersonalLead[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' });
  const [newLead, setNewLead] = useState({ 
    name: '', email: '', phone: '', organization: '', 
    lead_type: 'alumni', notes: '' 
  });
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (currentEmployee) {
      fetchTasks();
      fetchLeads();
      fetchAnnouncements();
    }
  }, [currentEmployee]);

  async function fetchEmployees() {
    if (!supabase) return;
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (data && data.length > 0) {
      setEmployees(data);
      setCurrentEmployee(data[0]);
    }
  }

  async function fetchTasks() {
    if (!supabase || !currentEmployee) return;
    const { data } = await supabase
      .from('employee_tasks')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .order('due_date', { ascending: true });
    setTasks(data || []);
  }

  async function fetchLeads() {
    if (!supabase || !currentEmployee) return;
    if (!hasPermission('personal_leads')) return;
    
    const { data } = await supabase
      .from('personal_leads')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .order('created_at', { ascending: false });
    setLeads(data || []);
  }

  async function fetchAnnouncements() {
    if (!supabase || !currentEmployee) return;
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .contains('target_roles', [currentEmployee.role])
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);
    setAnnouncements(data || []);
  }

  async function createTask() {
    if (!supabase || !currentEmployee || !newTask.title.trim()) return;
    await supabase.from('employee_tasks').insert([{
      employee_id: currentEmployee.id,
      title: newTask.title,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
    }]);
    setNewTask({ title: '', priority: 'medium', due_date: '' });
    setShowTaskModal(false);
    fetchTasks();
  }

  async function createLead() {
    if (!supabase || !currentEmployee || !newLead.name.trim()) return;
    await supabase.from('personal_leads').insert([{
      employee_id: currentEmployee.id,
      ...newLead,
      status: 'new',
    }]);
    setNewLead({ name: '', email: '', phone: '', organization: '', lead_type: 'alumni', notes: '' });
    setShowLeadModal(false);
    fetchLeads();
  }

  async function toggleTask(task: EmployeeTask) {
    if (!supabase) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('employee_tasks').update({ status: newStatus }).eq('id', task.id);
    fetchTasks();
  }

  async function updateLeadStatus(lead: PersonalLead, newStatus: string) {
    if (!supabase) return;
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'contacted' && !lead.first_contact) {
      updateData.first_contact = new Date().toISOString().split('T')[0];
    }
    updateData.last_contact = new Date().toISOString().split('T')[0];
    
    await supabase.from('personal_leads').update(updateData).eq('id', lead.id);
    fetchLeads();
  }

  async function deleteTask(id: string) {
    if (!supabase) return;
    await supabase.from('employee_tasks').delete().eq('id', id);
    fetchTasks();
  }

  function hasPermission(permission: string): boolean {
    if (!currentEmployee) return false;
    const perms = ROLE_PERMISSIONS[currentEmployee.role] || [];
    return perms.includes(permission) || perms.includes('all');
  }

  const canAccessNucleus = hasPermission('nucleus');
  const canManageLeads = hasPermission('personal_leads');
  const isEngineer = currentEmployee?.role === 'engineer';
  const isGrowthIntern = currentEmployee?.role === 'growth_intern';

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const activeLeads = leads.filter(l => !['converted', 'lost'].includes(l.status)).length;
  const needsFollowup = leads.filter(l => {
    if (!l.next_followup) return false;
    return new Date(l.next_followup) <= new Date();
  }).length;

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  const leadStatusColors: Record<string, string> = {
    new: '#6b7280',
    contacted: '#3b82f6',
    responding: '#8b5cf6',
    meeting_set: '#f59e0b',
    converted: '#10b981',
    lost: '#ef4444',
  };

  if (!currentEmployee) {
    return (
      <div className="workspace-page">
        <div className="workspace-empty">
          <h2>No employees found</h2>
          <p>Add employees in Nucleus first.</p>
          <Link href="/nucleus/employees" className="workspace-link-btn">
            Go to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div className="workspace-greeting">
          <h1>{greeting}, {currentEmployee.name.split(' ')[0]}</h1>
          <p className="workspace-role-badge" data-role={currentEmployee.role}>
            {ROLE_LABELS[currentEmployee.role]}
          </p>
        </div>
        <div className="workspace-header-actions">
          <select 
            className="workspace-user-select"
            value={currentEmployee.id}
            onChange={(e) => {
              const emp = employees.find(em => em.id === e.target.value);
              if (emp) setCurrentEmployee(emp);
            }}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({ROLE_LABELS[emp.role]})
              </option>
            ))}
          </select>
          {canAccessNucleus && (
            <Link href="/nucleus" className="workspace-nucleus-btn">
              <Zap size={16} />
              Nucleus
            </Link>
          )}
        </div>
      </header>

      {/* Role-Specific Stats */}
      <div className="workspace-stats">
        <div className="workspace-stat">
          <Target size={20} />
          <div>
            <span className="stat-value">{pendingTasks}</span>
            <span className="stat-label">Tasks</span>
          </div>
        </div>
        <div className="workspace-stat">
          <CheckCircle2 size={20} />
          <div>
            <span className="stat-value">{completedTasks}</span>
            <span className="stat-label">Done</span>
          </div>
        </div>
        {canManageLeads && (
          <>
            <div className="workspace-stat">
              <UserPlus size={20} />
              <div>
                <span className="stat-value">{activeLeads}</span>
                <span className="stat-label">Active Leads</span>
              </div>
            </div>
            <div className="workspace-stat" style={{ color: needsFollowup > 0 ? '#f59e0b' : undefined }}>
              <Clock size={20} />
              <div>
                <span className="stat-value">{needsFollowup}</span>
                <span className="stat-label">Need Follow-up</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content - Role Specific */}
      <div className="workspace-grid">
        {/* Tasks - Everyone has this */}
        <section className="workspace-section workspace-tasks">
          <div className="section-header">
            <h2>My Tasks</h2>
            <button className="add-task-btn" onClick={() => setShowTaskModal(true)}>
              <Plus size={18} />
            </button>
          </div>
          
          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="tasks-empty">
                <Circle size={32} strokeWidth={1} />
                <p>No tasks yet</p>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task-item ${task.status === 'done' ? 'completed' : ''}`}>
                  <button className="task-checkbox" onClick={() => toggleTask(task)}>
                    {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="task-content">
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      <span className="task-priority" style={{ color: priorityColors[task.priority] }}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="task-due">
                          <Clock size={12} />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="task-delete" onClick={() => deleteTask(task.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Growth Intern: Personal Leads / Alumni Outreach */}
        {canManageLeads && (
          <section className="workspace-section workspace-leads">
            <div className="section-header">
              <h2>
                {isGrowthIntern ? '🎯 Alumni Outreach' : '📋 My Leads'}
              </h2>
              <button className="add-task-btn" onClick={() => setShowLeadModal(true)}>
                <Plus size={18} />
              </button>
            </div>
            
            <div className="leads-list">
              {leads.length === 0 ? (
                <div className="tasks-empty">
                  <UserPlus size={32} strokeWidth={1} />
                  <p>No leads yet. Add your first one!</p>
                </div>
              ) : (
                leads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="lead-item">
                    <div className="lead-info">
                      <span className="lead-name">{lead.name}</span>
                      <span className="lead-org">{lead.organization}</span>
                      <div className="lead-contact">
                        {lead.email && <Mail size={12} />}
                        {lead.phone && <Phone size={12} />}
                      </div>
                    </div>
                    <select 
                      className="lead-status-select"
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead, e.target.value)}
                      style={{ borderColor: leadStatusColors[lead.status] }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="responding">Responding</option>
                      <option value="meeting_set">Meeting Set</option>
                      <option value="converted">Converted ✓</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                ))
              )}
              {leads.length > 5 && (
                <button className="view-all-btn">
                  View all {leads.length} leads <ArrowRight size={14} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* Engineer: Quick Links */}
        {isEngineer && (
          <section className="workspace-section">
            <div className="section-header">
              <h2><Code size={16} /> Engineering</h2>
            </div>
            <div className="quick-links">
              <a href="https://github.com/owentrailblaize" target="_blank" rel="noopener noreferrer" className="quick-link">
                <Code size={16} />
                GitHub
                <ChevronRight size={14} />
              </a>
              <Link href="/nucleus/operations" className="quick-link">
                <Bug size={16} />
                Bug Tracker
                <ChevronRight size={14} />
              </Link>
              <Link href="/nucleus/operations" className="quick-link">
                <Sparkles size={16} />
                Feature Requests
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* Sidebar - Announcements */}
        <aside className="workspace-sidebar">
          <section className="workspace-section workspace-announcements">
            <div className="section-header">
              <h2><Bell size={16} /> Team Updates</h2>
            </div>
            {announcements.length === 0 ? (
              <p className="empty-text">No announcements</p>
            ) : (
              <div className="announcements-list">
                {announcements.map(ann => (
                  <div key={ann.id} className={`announcement-item ${ann.pinned ? 'pinned' : ''}`}>
                    <h4>{ann.title}</h4>
                    <p>{ann.content}</p>
                    <span className="announcement-date">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Team */}
          <section className="workspace-section">
            <div className="section-header">
              <h2><Users size={16} /> Team</h2>
            </div>
            <div className="team-list">
              {employees.slice(0, 4).map(emp => (
                <div key={emp.id} className="team-member">
                  <div className="team-avatar">{emp.name.charAt(0)}</div>
                  <div>
                    <span className="team-name">{emp.name}</span>
                    <span className="team-role">{ROLE_LABELS[emp.role]}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="workspace-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="workspace-modal" onClick={e => e.stopPropagation()}>
            <h3>New Task</h3>
            <input
              type="text"
              placeholder="What do you need to do?"
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              autoFocus
            />
            <div className="modal-row">
              <select
                value={newTask.priority}
                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="date"
                value={newTask.due_date}
                onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button className="create-btn" onClick={createTask}>
                <Check size={16} /> Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Modal */}
      {showLeadModal && (
        <div className="workspace-modal-overlay" onClick={() => setShowLeadModal(false)}>
          <div className="workspace-modal" onClick={e => e.stopPropagation()}>
            <h3>{isGrowthIntern ? 'Add Alumni Contact' : 'Add Lead'}</h3>
            <input
              type="text"
              placeholder="Name"
              value={newLead.name}
              onChange={e => setNewLead({ ...newLead, name: e.target.value })}
              autoFocus
            />
            <input
              type="email"
              placeholder="Email"
              value={newLead.email}
              onChange={e => setNewLead({ ...newLead, email: e.target.value })}
            />
            <div className="modal-row">
              <input
                type="tel"
                placeholder="Phone"
                value={newLead.phone}
                onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
              />
              <input
                type="text"
                placeholder="Organization"
                value={newLead.organization}
                onChange={e => setNewLead({ ...newLead, organization: e.target.value })}
              />
            </div>
            <select
              value={newLead.lead_type}
              onChange={e => setNewLead({ ...newLead, lead_type: e.target.value as 'alumni' | 'chapter' | 'sponsor' | 'other' })}
            >
              <option value="alumni">Alumni</option>
              <option value="chapter">Chapter Contact</option>
              <option value="sponsor">Sponsor</option>
              <option value="other">Other</option>
            </select>
            <textarea
              placeholder="Notes..."
              value={newLead.notes}
              onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
              rows={2}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowLeadModal(false)}>Cancel</button>
              <button className="create-btn" onClick={createLead}>
                <Check size={16} /> Add {isGrowthIntern ? 'Contact' : 'Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
