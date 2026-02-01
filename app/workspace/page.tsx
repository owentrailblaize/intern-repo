'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Calendar, Clock, 
  ChevronRight, Bell, Users, Target, Zap,
  MoreHorizontal, X, Check
} from 'lucide-react';
import Link from 'next/link';
import { supabase, Employee, ROLE_HIERARCHY, ROLE_PERMISSIONS } from '@/lib/supabase';

interface EmployeeTask {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  min_role: string;
  pinned: boolean;
  created_at: string;
}

export default function WorkspacePage() {
  // For demo, we'll use a selected employee (later this will come from auth)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' });
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
      setCurrentEmployee(data[0]); // Default to first employee for demo
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

  async function fetchAnnouncements() {
    if (!supabase || !currentEmployee) return;
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Filter by role access
    const roleLevel = ROLE_HIERARCHY[currentEmployee.role] || 1;
    const filtered = (data || []).filter(a => {
      const minLevel = ROLE_HIERARCHY[a.min_role as keyof typeof ROLE_HIERARCHY] || 1;
      return roleLevel >= minLevel;
    });
    
    setAnnouncements(filtered);
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

  async function toggleTask(task: EmployeeTask) {
    if (!supabase) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase
      .from('employee_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
    fetchTasks();
  }

  async function deleteTask(id: string) {
    if (!supabase) return;
    await supabase.from('employee_tasks').delete().eq('id', id);
    fetchTasks();
  }

  const canAccessNucleus = currentEmployee && 
    ROLE_PERMISSIONS[currentEmployee.role]?.includes('nucleus');

  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date).toDateString() === new Date().toDateString();
  });

  const completedToday = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  if (!currentEmployee) {
    return (
      <div className="workspace-page">
        <div className="workspace-empty">
          <h2>No employees found</h2>
          <p>Add employees in Nucleus first, then return here.</p>
          <Link href="/nucleus/employees" className="workspace-link-btn">
            Go to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      {/* Minimal Header */}
      <header className="workspace-header">
        <div className="workspace-greeting">
          <h1>{greeting}, {currentEmployee.name.split(' ')[0]}</h1>
          <p className="workspace-date">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="workspace-header-actions">
          {/* Employee Switcher (for demo) */}
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
                {emp.name} ({emp.role})
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

      {/* Quick Stats */}
      <div className="workspace-stats">
        <div className="workspace-stat">
          <Target size={20} />
          <div>
            <span className="stat-value">{pendingTasks}</span>
            <span className="stat-label">To Do</span>
          </div>
        </div>
        <div className="workspace-stat">
          <CheckCircle2 size={20} />
          <div>
            <span className="stat-value">{completedToday}</span>
            <span className="stat-label">Done</span>
          </div>
        </div>
        <div className="workspace-stat">
          <Calendar size={20} />
          <div>
            <span className="stat-value">{todayTasks.length}</span>
            <span className="stat-label">Due Today</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="workspace-grid">
        {/* Tasks Section */}
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
                <p>No tasks yet. Add one to get started!</p>
              </div>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`task-item ${task.status === 'done' ? 'completed' : ''}`}
                >
                  <button 
                    className="task-checkbox"
                    onClick={() => toggleTask(task)}
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <div className="task-content">
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      <span 
                        className="task-priority"
                        style={{ color: priorityColors[task.priority] }}
                      >
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
                  <button 
                    className="task-delete"
                    onClick={() => deleteTask(task.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="workspace-sidebar">
          {/* Announcements */}
          <section className="workspace-section workspace-announcements">
            <div className="section-header">
              <h2><Bell size={16} /> Announcements</h2>
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

          {/* Quick Links based on role */}
          <section className="workspace-section workspace-links">
            <div className="section-header">
              <h2>Quick Access</h2>
            </div>
            <div className="quick-links">
              {ROLE_PERMISSIONS[currentEmployee.role]?.includes('team') && (
                <Link href="/nucleus/employees" className="quick-link">
                  <Users size={16} />
                  Team Directory
                  <ChevronRight size={14} />
                </Link>
              )}
              {ROLE_PERMISSIONS[currentEmployee.role]?.includes('projects') && (
                <Link href="/nucleus/operations" className="quick-link">
                  <Target size={16} />
                  Projects
                  <ChevronRight size={14} />
                </Link>
              )}
              {ROLE_PERMISSIONS[currentEmployee.role]?.includes('pipeline') && (
                <Link href="/nucleus/pipeline" className="quick-link">
                  <Zap size={16} />
                  Sales Pipeline
                  <ChevronRight size={14} />
                </Link>
              )}
              {ROLE_PERMISSIONS[currentEmployee.role]?.includes('customers') && (
                <Link href="/nucleus/customer-success" className="quick-link">
                  <CheckCircle2 size={16} />
                  Customers
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Add Task Modal */}
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
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="date"
                value={newTask.due_date}
                onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowTaskModal(false)}>
                Cancel
              </button>
              <button className="create-btn" onClick={createTask}>
                <Check size={16} />
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
