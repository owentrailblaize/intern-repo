'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  X,
  Check,
  AlertCircle,
  Flag,
  ListTodo,
  Inbox,
  CheckSquare
} from 'lucide-react';
import ModalOverlay from '@/components/ModalOverlay';

interface Task {
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

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
type SortType = 'due_date' | 'priority' | 'created_at';

export default function TasksPage() {
  const { user } = useAuth();
  const { roleLabel } = useUserRole();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('due_date');
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    category: 'general'
  });
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
      fetchTasks();
    }
  }, [currentEmployee, showCompleted]);

  async function fetchTasks() {
    if (!supabase || !currentEmployee) return;
    
    let query = supabase
      .from('employee_tasks')
      .select('*')
      .eq('employee_id', currentEmployee.id);

    if (!showCompleted) {
      query = query.neq('status', 'done');
    }

    const { data } = await query.order('created_at', { ascending: false });
    setTasks(data || []);
  }

  async function createTask() {
    if (!supabase || !currentEmployee || !newTask.title.trim()) return;
    
    await supabase.from('employee_tasks').insert([{
      employee_id: currentEmployee.id,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      category: newTask.category,
      status: 'todo'
    }]);

    setNewTask({ title: '', description: '', priority: 'medium', due_date: '', category: 'general' });
    setShowNewTask(false);
    fetchTasks();
  }

  async function updateTask() {
    if (!supabase || !editingTask) return;
    
    await supabase.from('employee_tasks').update({
      title: editingTask.title,
      description: editingTask.description,
      priority: editingTask.priority,
      due_date: editingTask.due_date || null,
      category: editingTask.category
    }).eq('id', editingTask.id);

    setEditingTask(null);
    fetchTasks();
  }

  async function toggleTask(task: Task) {
    if (!supabase) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('employee_tasks').update({ status: newStatus }).eq('id', task.id);
    fetchTasks();
  }

  async function deleteTask(task: Task) {
    if (!supabase) return;
    await supabase.from('employee_tasks').delete().eq('id', task.id);
    fetchTasks();
  }

  async function updateTaskStatus(task: Task, status: Task['status']) {
    if (!supabase) return;
    await supabase.from('employee_tasks').update({ status }).eq('id', task.id);
    fetchTasks();
  }

  const getFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let filtered = [...tasks];

    switch (filter) {
      case 'today':
        filtered = filtered.filter(t => {
          if (!t.due_date) return false;
          const due = new Date(t.due_date);
          due.setHours(0, 0, 0, 0);
          return due.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        filtered = filtered.filter(t => {
          if (!t.due_date) return false;
          const due = new Date(t.due_date);
          return due >= today && due <= nextWeek;
        });
        break;
      case 'overdue':
        filtered = filtered.filter(t => {
          if (!t.due_date || t.status === 'done') return false;
          return new Date(t.due_date) < today;
        });
        break;
      case 'completed':
        filtered = filtered.filter(t => t.status === 'done');
        break;
    }

    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  };

  const filteredTasks = getFilteredTasks();
  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  
  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
  const todayCount = tasks.filter(t => {
    if (!t.due_date) return false;
    const today = new Date();
    const due = new Date(t.due_date);
    return due.toDateString() === today.toDateString() && t.status !== 'done';
  }).length;

  const priorityColors = {
    low: { bg: '#f3f4f6', text: '#6b7280' },
    medium: { bg: '#dbeafe', text: '#2563eb' },
    high: { bg: '#fef3c7', text: '#d97706' },
    urgent: { bg: '#fee2e2', text: '#dc2626' }
  };

  if (loading) {
    return (
      <div className="ws-loading">
        <div className="ws-loading-spinner" />
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="ws-subpage">
      {/* Header */}
      <header className="ws-subpage-header">
        <div className="ws-subpage-header-left">
          <h1>
            <ListTodo size={24} />
            My Tasks
          </h1>
          <span className="ws-subpage-count">{tasks.filter(t => t.status !== 'done').length} active</span>
        </div>
        <button 
          className="ws-add-btn"
          onClick={() => setShowNewTask(true)}
        >
          <Plus size={18} />
          New Task
        </button>
      </header>

      {/* Stats Row */}
      <div className="ws-subpage-stats">
        <div className="ws-subpage-stat">
          <Inbox size={18} />
          <span className="ws-subpage-stat-value">{todoTasks.length}</span>
          <span className="ws-subpage-stat-label">To Do</span>
        </div>
        <div className="ws-subpage-stat">
          <Clock size={18} />
          <span className="ws-subpage-stat-value">{inProgressTasks.length}</span>
          <span className="ws-subpage-stat-label">In Progress</span>
        </div>
        <div className={`ws-subpage-stat ${overdueCount > 0 ? 'warning' : ''}`}>
          <AlertCircle size={18} />
          <span className="ws-subpage-stat-value">{overdueCount}</span>
          <span className="ws-subpage-stat-label">Overdue</span>
        </div>
        <div className="ws-subpage-stat">
          <Calendar size={18} />
          <span className="ws-subpage-stat-value">{todayCount}</span>
          <span className="ws-subpage-stat-label">Due Today</span>
        </div>
      </div>

      {/* Filters */}
      <div className="ws-subpage-filters">
        <div className="ws-filter-tabs">
          {[
            { id: 'all', label: 'All Tasks', icon: ListTodo },
            { id: 'today', label: 'Today', icon: Calendar },
            { id: 'upcoming', label: 'Upcoming', icon: Clock },
            { id: 'overdue', label: 'Overdue', icon: AlertCircle },
            { id: 'completed', label: 'Completed', icon: CheckCircle2 },
          ].map(tab => (
            <button
              key={tab.id}
              className={`ws-filter-tab ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id as FilterType)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ws-filter-actions">
          <select 
            className="ws-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="created_at">Sort by Created</option>
          </select>
          
          <label className="ws-show-completed">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show completed
          </label>
        </div>
      </div>

      {/* Task List */}
      <div className="ws-subpage-list">
        {filteredTasks.length === 0 ? (
          <div className="ws-subpage-empty">
            <CheckSquare size={48} />
            <h3>No tasks found</h3>
            <p>{filter === 'all' ? 'Add your first task to get started' : `No ${filter} tasks`}</p>
            <button onClick={() => setShowNewTask(true)}>
              <Plus size={16} />
              Add Task
            </button>
          </div>
        ) : (
          <div className="ws-tasks-full-list">
            {filteredTasks.map(task => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              
              return (
                <div 
                  key={task.id}
                  className={`ws-task-full-item ${task.status === 'done' ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}
                >
                  <button 
                    className={`ws-task-check ${task.status === 'done' ? 'checked' : ''}`}
                    onClick={() => toggleTask(task)}
                  >
                    {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  <div className="ws-task-full-content">
                    <span className="ws-task-full-title">{task.title}</span>
                    {task.description && (
                      <span className="ws-task-full-desc">{task.description}</span>
                    )}
                    <div className="ws-task-full-meta">
                      {task.due_date && (
                        <span className={`ws-task-full-due ${isOverdue ? 'overdue' : ''}`}>
                          <Calendar size={12} />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className="ws-task-full-category">{task.category}</span>
                    </div>
                  </div>

                  <div className="ws-task-full-right">
                    <span 
                      className="ws-task-full-priority"
                      style={{ 
                        background: priorityColors[task.priority].bg,
                        color: priorityColors[task.priority].text
                      }}
                    >
                      <Flag size={12} />
                      {task.priority}
                    </span>

                    <select
                      className="ws-task-full-status"
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task, e.target.value as Task['status'])}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>

                    <div className="ws-task-full-actions">
                      <button 
                        className="ws-task-full-action"
                        onClick={() => setEditingTask(task)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="ws-task-full-action delete"
                        onClick={() => deleteTask(task)}
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

      {/* New Task Modal */}
      {showNewTask && (
        <ModalOverlay className="ws-modal-overlay" onClose={() => setShowNewTask(false)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>New Task</h3>
              <button onClick={() => setShowNewTask(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="ws-modal-body">
              <div className="ws-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <div className="ws-form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add more details..."
                  rows={3}
                />
              </div>

              <div className="ws-form-row">
                <div className="ws-form-group">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="ws-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="ws-form-group">
                <label>Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="outreach">Outreach</option>
                  <option value="engineering">Engineering</option>
                  <option value="content">Content</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="ws-modal-footer">
              <button 
                className="ws-modal-cancel"
                onClick={() => setShowNewTask(false)}
              >
                Cancel
              </button>
              <button 
                className="ws-modal-submit"
                onClick={createTask}
                disabled={!newTask.title.trim()}
              >
                <Check size={16} />
                Create Task
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <ModalOverlay className="ws-modal-overlay" onClose={() => setEditingTask(null)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Edit Task</h3>
              <button onClick={() => setEditingTask(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="ws-modal-body">
              <div className="ws-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>

              <div className="ws-form-group">
                <label>Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="ws-form-row">
                <div className="ws-form-group">
                  <label>Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as Task['priority'] })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="ws-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="ws-form-group">
                <label>Category</label>
                <select
                  value={editingTask.category}
                  onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="outreach">Outreach</option>
                  <option value="engineering">Engineering</option>
                  <option value="content">Content</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="ws-modal-footer">
              <button 
                className="ws-modal-cancel"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </button>
              <button 
                className="ws-modal-submit"
                onClick={updateTask}
              >
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
