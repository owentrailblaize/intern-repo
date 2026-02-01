'use client';

import { useAuth } from '@/lib/auth-context';
import { EmployeeRole } from '@/lib/supabase';
import { 
  getWorkspaceRole, 
  getRoleFeatures, 
  getRoleLabel,
  canAccessNucleus,
  canManageLeads,
  canViewTeamWorkspaces,
  RoleFeatures,
  WorkspaceRole
} from '../utils/rolePermissions';

export interface UseUserRoleReturn {
  role: EmployeeRole;
  workspaceRole: WorkspaceRole;
  roleLabel: string;
  features: RoleFeatures;
  isFounder: boolean;
  isEngineer: boolean;
  isIntern: boolean;
  canAccessNucleus: boolean;
  canManageLeads: boolean;
  canViewTeamWorkspaces: boolean;
  loading: boolean;
}

/**
 * Hook to get user role information and feature flags
 */
export function useUserRole(): UseUserRoleReturn {
  const { profile, loading } = useAuth();
  
  const role = (profile?.role as EmployeeRole) || 'growth_intern';
  const workspaceRole = getWorkspaceRole(role);
  
  return {
    role,
    workspaceRole,
    roleLabel: getRoleLabel(role),
    features: getRoleFeatures(role),
    isFounder: workspaceRole === 'founder',
    isEngineer: workspaceRole === 'engineer',
    isIntern: workspaceRole === 'growth_intern',
    canAccessNucleus: canAccessNucleus(role),
    canManageLeads: canManageLeads(role),
    canViewTeamWorkspaces: canViewTeamWorkspaces(role),
    loading,
  };
}
