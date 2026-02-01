'use client';

import React from 'react';
import { CheckSquare, Clock, Mail, Target } from 'lucide-react';
import { WorkspaceStats } from '../hooks/useWorkspaceData';
import { useUserRole } from '../hooks/useUserRole';

interface MetricsCardsProps {
  stats: WorkspaceStats;
}

export function MetricsCards({ stats }: MetricsCardsProps) {
  const { features, isIntern, isEngineer, isFounder } = useUserRole();

  // Role-specific metrics
  const getMetrics = () => {
    const baseMetrics = [
      {
        label: 'Open Tasks',
        value: stats.openTasks,
        icon: CheckSquare,
        color: { bg: '#dbeafe', text: '#2563eb' },
      },
      {
        label: 'Overdue',
        value: stats.overdueTasks,
        icon: Clock,
        color: { bg: '#fee2e2', text: '#dc2626' },
        highlight: stats.overdueTasks > 0,
      },
      {
        label: 'Unread',
        value: stats.unreadMessages,
        icon: Mail,
        color: { bg: '#dcfce7', text: '#16a34a' },
      },
    ];

    if (features.showLeads) {
      baseMetrics.push({
        label: 'Active Leads',
        value: stats.activeLeads,
        icon: Target,
        color: { bg: '#fef3c7', text: '#d97706' },
        highlight: false,
      });
    }

    return baseMetrics;
  };

  const metrics = getMetrics();

  return (
    <div className="ws-metrics-grid">
      {metrics.map((metric) => (
        <div 
          key={metric.label} 
          className={`ws-metric-card ${metric.highlight ? 'highlight' : ''}`}
        >
          <div 
            className="ws-metric-icon"
            style={{ background: metric.color.bg, color: metric.color.text }}
          >
            <metric.icon size={20} />
          </div>
          <div className="ws-metric-info">
            <span className="ws-metric-value">{metric.value}</span>
            <span className="ws-metric-label">{metric.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
