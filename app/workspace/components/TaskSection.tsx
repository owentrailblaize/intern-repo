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
  Check
} from 'lucide-react';
import { EmployeeTask } from '../hooks/useWorkspaceData';

interface TaskSectionProps {
  tasks: EmployeeTask[];
  onToggleTask: (task: EmployeeTask) => Promise<void>;
  onCreateTask: (task: Partial<EmployeeTask>) => Promise<void>;
  title?: string;
  showAddButton?: boolean;
  limit?: number;
}

export function TaskSection({
  tasks,
  onToggleTask,
  onCreateTask,
  title = "Today's Tasks",
  showAddButton = true,
  limit = 5
}: TaskSectionProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const displayTasks = tasks
    .filter(t => t.status !== 'done')
    .slice(0, limit);

  const handleCreateTask = async () => {
    if (!quickTaskTitle.trim()) return;
    await onCreateTask({ title: quickTaskTitle, priority: 'medium' });
    setQuickTaskTitle('');
    setShowQuickAdd(false);
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
        </h2>
        {showAddButton && (
          <button 
            className="ws-add-btn"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus size={16} />
            Add Task
          </button>
        )}
      </div>

      {showQuickAdd && (
        <div className="ws-quick-add">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            autoFocus
          />
          <button 
            className="ws-quick-add-confirm" 
            onClick={handleCreateTask}
            disabled={!quickTaskTitle.trim()}
          >
            <Check size={16} />
          </button>
          <button 
            className="ws-quick-add-cancel" 
            onClick={() => {
              setShowQuickAdd(false);
              setQuickTaskTitle('');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="ws-task-list">
        {displayTasks.length === 0 ? (
          <div className="ws-empty">
            <Sparkles size={32} />
            <p>No tasks for today. Nice work!</p>
          </div>
        ) : (
          displayTasks.map(task => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date();
            
            return (
              <div 
                key={task.id} 
                className={`ws-task-item priority-${task.priority}`}
              >
                <button 
                  className="ws-task-check"
                  onClick={() => onToggleTask(task)}
                  aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
                <div className="ws-task-content">
                  <span className="ws-task-title">{task.title}</span>
                  {task.due_date && (
                    <span className={`ws-task-due ${isOverdue ? 'overdue' : ''}`}>
                      <Clock size={12} />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <span 
                  className="ws-task-priority"
                  style={{ color: priorityColors[task.priority] }}
                >
                  {task.priority}
                </span>
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
