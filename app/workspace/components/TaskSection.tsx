'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Plus,
  Clock,
  ArrowRight,
  Sparkles,
  X,
  Check,
  Trash2,
  Edit3,
  Loader2,
  Calendar
} from 'lucide-react';
import { EmployeeTask } from '../hooks/useWorkspaceData';

interface TaskSectionProps {
  tasks: EmployeeTask[];
  onToggleTask: (task: EmployeeTask) => Promise<void>;
  onCreateTask: (task: Partial<EmployeeTask>) => Promise<EmployeeTask | null>;
  onUpdateTask?: (taskId: string, updates: Partial<EmployeeTask>) => Promise<EmployeeTask | null>;
  onDeleteTask?: (taskId: string) => Promise<boolean>;
  title?: string;
  showAddButton?: boolean;
  limit?: number;
  compact?: boolean;
  loading?: boolean;
}

export function TaskSection({
  tasks,
  onToggleTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  title = "Today's Tasks",
  showAddButton = true,
  limit = 5,
  compact = false,
  loading = false
}: TaskSectionProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<EmployeeTask['priority']>('medium');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const displayTasks = tasks
    .filter(t => t.status !== 'done')
    .slice(0, limit);

  const handleCreateTask = async () => {
    if (!quickTaskTitle.trim()) return;
    setIsCreating(true);
    
    await onCreateTask({ 
      title: quickTaskTitle, 
      priority: quickTaskPriority,
      due_date: quickTaskDueDate || undefined
    });
    
    setQuickTaskTitle('');
    setQuickTaskPriority('medium');
    setQuickTaskDueDate('');
    setShowQuickAdd(false);
    setIsCreating(false);
  };

  const handleEditTask = async (taskId: string) => {
    if (!editTitle.trim() || !onUpdateTask) return;
    
    await onUpdateTask(taskId, { title: editTitle });
    setEditingTaskId(null);
    setEditTitle('');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!onDeleteTask) return;
    
    setDeletingTaskId(taskId);
    await onDeleteTask(taskId);
    setDeletingTaskId(null);
    setShowDeleteConfirm(null);
  };

  const startEditing = (task: EmployeeTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const priorityColors: Record<string, string> = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  return (
    <section className="ws-card">
      <div className="ws-card-header">
        <h2>
          <CheckSquare size={18} />
          {title}
          {loading && <Loader2 size={14} className="ws-spinner" />}
        </h2>
        {showAddButton && (
          <button 
            className="ws-add-btn"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus size={16} />
            {!compact && 'Add Task'}
          </button>
        )}
      </div>

      {showQuickAdd && (
        <div className="ws-quick-add-form">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateTask()}
            autoFocus
            disabled={isCreating}
          />
          <div className="ws-quick-add-row">
            <select
              value={quickTaskPriority}
              onChange={(e) => setQuickTaskPriority(e.target.value as EmployeeTask['priority'])}
              disabled={isCreating}
              className="ws-priority-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="date"
              value={quickTaskDueDate}
              onChange={(e) => setQuickTaskDueDate(e.target.value)}
              disabled={isCreating}
              className="ws-date-input"
              placeholder="Due date"
            />
          </div>
          <div className="ws-quick-add-actions">
            <button 
              className="ws-quick-add-confirm" 
              onClick={handleCreateTask}
              disabled={!quickTaskTitle.trim() || isCreating}
            >
              {isCreating ? <Loader2 size={16} className="ws-spinner" /> : <Check size={16} />}
              {isCreating ? 'Creating...' : 'Add Task'}
            </button>
            <button 
              className="ws-quick-add-cancel" 
              onClick={() => {
                setShowQuickAdd(false);
                setQuickTaskTitle('');
                setQuickTaskPriority('medium');
                setQuickTaskDueDate('');
              }}
              disabled={isCreating}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="ws-task-list">
        {loading && tasks.length === 0 ? (
          <div className="ws-loading">
            <Loader2 size={24} className="ws-spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="ws-empty">
            <Sparkles size={32} />
            <p>No tasks for today. Nice work!</p>
          </div>
        ) : (
          displayTasks.map(task => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date();
            const isEditing = editingTaskId === task.id;
            const isDeleting = deletingTaskId === task.id;
            const showConfirm = showDeleteConfirm === task.id;
            
            return (
              <div 
                key={task.id} 
                className={`ws-task-item priority-${task.priority} ${isDeleting ? 'deleting' : ''}`}
              >
                <button 
                  className="ws-task-check"
                  onClick={() => onToggleTask(task)}
                  aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
                  disabled={isDeleting}
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
                
                <div className="ws-task-content">
                  {isEditing ? (
                    <div className="ws-task-edit">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditTask(task.id);
                          if (e.key === 'Escape') {
                            setEditingTaskId(null);
                            setEditTitle('');
                          }
                        }}
                        autoFocus
                      />
                      <button onClick={() => handleEditTask(task.id)} className="ws-edit-confirm">
                        <Check size={14} />
                      </button>
                      <button onClick={() => { setEditingTaskId(null); setEditTitle(''); }} className="ws-edit-cancel">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="ws-task-title">{task.title}</span>
                      {task.due_date && (
                        <span className={`ws-task-due ${isOverdue ? 'overdue' : ''}`}>
                          <Clock size={12} />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="ws-task-actions">
                    <span 
                      className="ws-task-priority"
                      style={{ color: priorityColors[task.priority] }}
                    >
                      {task.priority}
                    </span>
                    
                    {onUpdateTask && (
                      <button
                        className="ws-task-action-btn edit"
                        onClick={() => startEditing(task)}
                        aria-label="Edit task"
                        disabled={isDeleting}
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    
                    {onDeleteTask && (
                      showConfirm ? (
                        <div className="ws-delete-confirm">
                          <button 
                            className="ws-delete-yes"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 size={12} className="ws-spinner" /> : 'Delete'}
                          </button>
                          <button 
                            className="ws-delete-no"
                            onClick={() => setShowDeleteConfirm(null)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="ws-task-action-btn delete"
                          onClick={() => setShowDeleteConfirm(task.id)}
                          aria-label="Delete task"
                          disabled={isDeleting}
                        >
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Link href="/workspace/tasks" className="ws-card-link">
        View All Tasks
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
