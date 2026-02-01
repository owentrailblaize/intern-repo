'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useUserRole } from './hooks/useUserRole';
import { useWorkspaceData } from './hooks/useWorkspaceData';
import { Dashboard } from './components/Dashboard';
import { Sun, CloudSun, Moon, Calendar } from 'lucide-react';

/**
 * Main Workspace Page
 * Unified workspace that adapts to user role:
 * - Founder: Personal productivity + team oversight
 * - Engineer: Development tasks + collaboration
 * - Growth Intern: Speed-focused + leads management
 */
export default function WorkspacePage() {
  const { profile } = useAuth();
  const { roleLabel, loading: roleLoading } = useUserRole();
  const workspaceData = useWorkspaceData();

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: Sun };
    if (hour < 17) return { text: 'Good afternoon', icon: CloudSun };
    return { text: 'Good evening', icon: Moon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const firstName = profile?.name?.split(' ')[0] || 'there';

  // Loading state
  if (workspaceData.loading || roleLoading) {
    return (
      <div className="ws-loading">
        <div className="ws-loading-spinner" />
        <p>Loading your workspace...</p>
      </div>
    );
  }

  // Error state
  if (workspaceData.error) {
    return (
      <div className="ws-error">
        <h2>Something went wrong</h2>
        <p>{workspaceData.error}</p>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="ws-page">
      {/* Welcome Header */}
      <header className="ws-welcome">
        <div className="ws-welcome-content">
          <div className="ws-welcome-icon">
            <GreetingIcon size={24} />
          </div>
          <div className="ws-welcome-text">
            <h1>{greeting.text}, {firstName}</h1>
            <p>
              You&apos;re logged in as <strong>{roleLabel}</strong>
            </p>
          </div>
        </div>
        <div className="ws-welcome-date">
          <Calendar size={16} />
          <span>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </header>

      {/* Role-Based Dashboard */}
      <Dashboard 
        data={workspaceData}
        teamMembers={workspaceData.teamMembers}
      />
    </div>
  );
}
