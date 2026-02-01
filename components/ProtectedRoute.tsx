'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import NucleusLogin from './NucleusLogin';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();

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

  // Authenticated but no profile found - account setup issue
  if (!profile) {
    const handleSignOut = () => {
      // Clear all Supabase auth data from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      // Also try the normal signOut
      signOut().finally(() => {
        window.location.href = '/nucleus';
      });
    };

    return (
      <div className="nucleus-access-denied">
        <div className="nucleus-access-denied-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-access-denied-logo" />
          <h1>Account Setup Required</h1>
          <p className="nucleus-access-denied-message">
            Your account exists but hasn&apos;t been fully set up yet.
          </p>
          <p className="nucleus-access-denied-hint">
            Please contact your administrator to ensure your employee profile is properly configured.
          </p>
          <p className="nucleus-access-denied-email">Signed in as: {user.email}</p>
          <div className="nucleus-access-denied-actions">
            <button 
              onClick={handleSignOut}
              className="nucleus-access-denied-btn secondary"
            >
              Sign Out
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="nucleus-access-denied-btn"
            >
              Try Again
            </button>
          </div>
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
