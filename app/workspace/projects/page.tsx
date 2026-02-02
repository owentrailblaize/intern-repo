'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import { LinearIssueTracker } from '../components/LinearIssueTracker';
import { GrowthProjectTracker } from '../components/GrowthProjectTracker';
import { FounderProjectHub } from '../components/FounderProjectHub';
import {
  FolderKanban,
  AlertCircle
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { features, isEngineer, isFounder, isIntern, loading: roleLoading } = useUserRole();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current employee and team members
  const fetchEmployeeData = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      // Get current employee
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();

      if (employee) {
        setCurrentEmployee(employee);
      }

      // Get all team members for founder view
      const { data: team } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');

      if (team) {
        setTeamMembers(team);
      }
    } catch (err) {
      console.error('Error fetching employee data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Show loading state
  if (loading || roleLoading) {
    return (
      <div className="ws-loading">
        <div className="ws-loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Access control
  if (!features.showProjects) {
    return (
      <div className="ws-no-access">
        <FolderKanban size={48} />
        <h2>Access Restricted</h2>
        <p>Your role doesn&apos;t have access to the projects module.</p>
        <Link href="/workspace" className="ws-back-link">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Founders get the full Project Hub with both views + analytics
  if (isFounder) {
    return (
      <div className="founder-page-wrapper">
        <FounderProjectHub 
          currentEmployee={currentEmployee}
          teamMembers={teamMembers}
        />
      </div>
    );
  }

  // Engineers get the Linear-style Product Development tracker
  if (isEngineer) {
    return (
      <div className="linear-page-wrapper">
        <LinearIssueTracker 
          currentEmployee={currentEmployee}
          teamMembers={teamMembers.filter(m => 
            m.role?.includes('engineer') || m.role?.includes('founder')
          )}
        />
      </div>
    );
  }

  // Growth/Interns get the interactive project tracker
  if (isIntern) {
    return (
      <div className="growth-page-wrapper">
        <GrowthProjectTracker 
          currentEmployee={currentEmployee}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="ws-no-access">
      <AlertCircle size={48} />
      <h2>No Access</h2>
      <p>Unable to determine your role. Please contact support.</p>
      <Link href="/workspace" className="ws-back-link">
        Back to Dashboard
      </Link>
    </div>
  );
}
