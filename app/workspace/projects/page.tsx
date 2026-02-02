'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import { LinearIssueTracker } from '../components/LinearIssueTracker';
import {
  FolderKanban,
  AlertCircle
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { features, isEngineer, isFounder, loading: roleLoading } = useUserRole();
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

      // Get team members (engineers for assignment)
      const { data: team } = await supabase
        .from('employees')
        .select('*')
        .in('role', ['founder', 'software_engineer'])
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

  // Access control - only engineers and founders can access this
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

  // Engineers and Founders get the Linear-style issue tracker
  if (isEngineer || isFounder) {
    return (
      <div className="linear-page-wrapper">
        <LinearIssueTracker 
          currentEmployee={currentEmployee}
          teamMembers={teamMembers}
        />
      </div>
    );
  }

  // Fallback for other roles (shouldn't normally reach here)
  return (
    <div className="ws-no-access">
      <AlertCircle size={48} />
      <h2>No Access</h2>
      <p>This feature is only available to engineers.</p>
      <Link href="/workspace" className="ws-back-link">
        Back to Dashboard
      </Link>
    </div>
  );
}
