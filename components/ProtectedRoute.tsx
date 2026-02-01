'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import NucleusLogin from './NucleusLogin';
import { ROLE_LABELS } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Handle role-based routing after profile loads
  useEffect(() => {
    if (loading || !user || !profile) return;
    
    const isNucleusRoute = pathname.startsWith('/nucleus');
    const isPortalRoute = pathname.startsWith('/portal');
    
    // If user is on /nucleus but is NOT an admin (founder/cofounder), redirect to /portal
    if (isNucleusRoute && !isAdmin) {
      console.log('Non-admin on nucleus route, redirecting to portal');
      router.replace('/portal');
      return;
    }
    
    // Optionally: If admin lands on /portal, they can stay (they have access to both)
    // No redirect needed for admins on portal
    
  }, [loading, user, profile, isAdmin, pathname, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="nucleus-loading-screen">
        <div className="nucleus-loading-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-loading-logo" />
          <div className="nucleus-loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <NucleusLogin />;
  }

  // Authenticated but no employee record found
  if (!profile) {
    const handleSignOut = () => {
      // Clear all Supabase auth data from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      signOut().finally(() => {
        window.location.href = '/nucleus';
      });
    };

    return (
      <div className="nucleus-access-denied">
        <div className="nucleus-access-denied-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-access-denied-logo" />
          <h1>Employee Profile Not Found</h1>
          <p className="nucleus-access-denied-message">
            Your account exists but you&apos;re not registered as an employee yet.
          </p>
          <p className="nucleus-access-denied-hint">
            Please ask a founder to add you to the Employees module with your email: <strong>{user.email}</strong>
          </p>
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

  // Non-admin trying to access nucleus routes - show redirect message briefly
  const isNucleusRoute = pathname.startsWith('/nucleus');
  if (isNucleusRoute && !isAdmin) {
    return (
      <div className="nucleus-loading-screen">
        <div className="nucleus-loading-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-loading-logo" />
          <div className="nucleus-loading-spinner" />
          <p>Redirecting to your workspace...</p>
        </div>
      </div>
    );
  }

  // If requireAdmin is set but user is not admin
  if (requireAdmin && !isAdmin) {
    const roleLabel = ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] || profile.role;
    return (
      <div className="nucleus-access-denied">
        <div className="nucleus-access-denied-content">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-access-denied-logo" />
          <h1>Founder Access Required</h1>
          <p className="nucleus-access-denied-message">
            This area is restricted to Founders and Co-Founders.
          </p>
          <p className="nucleus-access-denied-hint">
            Your current role: <strong>{roleLabel}</strong>
          </p>
          <div className="nucleus-access-denied-actions">
            <button 
              onClick={() => router.push('/portal')} 
              className="nucleus-access-denied-btn"
            >
              Go to My Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - show content
  return <>{children}</>;
}
