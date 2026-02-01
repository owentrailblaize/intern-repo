'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import NucleusLogin from './NucleusLogin';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="nucleus-loading-screen">
        <div className="nucleus-loading-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-loading-logo" />
          <div className="nucleus-loading-spinner" />
          <p>Loading Nucleus...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <NucleusLogin />;
  }

  // Authenticated but no admin profile - no nucleus access
  if (!profile) {
    return (
      <div className="nucleus-access-denied">
        <div className="nucleus-access-denied-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-access-denied-logo" />
          <h1>Access Denied</h1>
          <p>You don't have permission to access Nucleus.</p>
          <p className="nucleus-access-denied-email">Signed in as: {user.email}</p>
          <button onClick={() => window.location.href = '/workspace'} className="nucleus-access-denied-btn">
            Go to Workspace
          </button>
        </div>
      </div>
    );
  }

  // If admin is required but user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="nucleus-access-denied">
        <div className="nucleus-access-denied-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-access-denied-logo" />
          <h1>Admin Access Required</h1>
          <p>This area requires administrator privileges.</p>
          <button onClick={() => window.history.back()} className="nucleus-access-denied-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Authorized - show content
  return <>{children}</>;
}
