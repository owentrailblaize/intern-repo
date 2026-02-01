'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';

export interface EmployeeTask {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string;
  created_at: string;
}

export interface PersonalLead {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  lead_type: 'alumni' | 'chapter' | 'sponsor' | 'other';
  status: 'new' | 'contacted' | 'responding' | 'meeting_set' | 'converted' | 'lost';
  first_contact: string;
  last_contact: string;
  next_followup: string;
  notes: string;
  created_at: string;
}

export interface PortalMessage {
  id: string;
  subject: string;
  sender_name?: string;
  sent_at: string;
  is_read: boolean;
}

export interface WorkspaceStats {
  openTasks: number;
  overdueTasks: number;
  completedTasks: number;
  activeLeads: number;
  unreadMessages: number;
  needsFollowUp: number;
}

export interface UseWorkspaceDataReturn {
  currentEmployee: Employee | null;
  tasks: EmployeeTask[];
  leads: PersonalLead[];
  messages: PortalMessage[];
  teamMembers: Employee[];
  stats: WorkspaceStats;
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  createTask: (task: Partial<EmployeeTask>) => Promise<void>;
  toggleTask: (task: EmployeeTask) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createLead: (lead: Partial<PersonalLead>) => Promise<void>;
  updateLeadStatus: (lead: PersonalLead, status: PersonalLead['status']) => Promise<void>;
  setViewAsEmployee: (employee: Employee | null) => void;
  viewAsEmployee: Employee | null;
}

/**
 * Hook to manage all workspace data fetching and mutations
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const { user, profile } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [viewAsEmployee, setViewAsEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [leads, setLeads] = useState<PersonalLead[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The active employee (either current user or "view as" employee for founders)
  const activeEmployee = viewAsEmployee || currentEmployee;

  // Fetch employee data
  const fetchEmployeeData = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      // Find employee by auth user email
      let { data } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!data) {
        // Fallback: get first active employee (demo mode)
        const { data: fallback } = await supabase
          .from('employees')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .single();
        data = fallback;
      }

      if (data) {
        setCurrentEmployee(data);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Failed to load employee data');
    }
    setLoading(false);
  }, [user]);

  // Fetch team members (for founders to switch views)
  const fetchTeamMembers = useCallback(async () => {
    if (!supabase || profile?.role !== 'founder' && profile?.role !== 'cofounder') return;

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    setTeamMembers(data || []);
  }, [profile?.role]);

  // Fetch tasks for active employee
  const fetchTasks = useCallback(async () => {
    if (!supabase || !activeEmployee) return;

    const { data } = await supabase
      .from('employee_tasks')
      .select('*')
      .eq('employee_id', activeEmployee.id)
      .order('due_date', { ascending: true });
    
    setTasks(data || []);
  }, [activeEmployee]);

  // Fetch leads for active employee
  const fetchLeads = useCallback(async () => {
    if (!supabase || !activeEmployee) return;

    const { data } = await supabase
      .from('personal_leads')
      .select('*')
      .eq('employee_id', activeEmployee.id)
      .order('created_at', { ascending: false });
    
    setLeads(data || []);
  }, [activeEmployee]);

  // Fetch messages for active employee
  const fetchMessages = useCallback(async () => {
    if (!supabase || !activeEmployee) return;

    const { data } = await supabase
      .from('portal_messages')
      .select('*, sender:sender_id(name)')
      .eq('recipient_id', activeEmployee.id)
      .eq('is_read', false)
      .eq('is_draft', false)
      .order('sent_at', { ascending: false })
      .limit(10);
    
    setMessages(data?.map(m => ({
      ...m,
      sender_name: (m.sender as { name: string } | null)?.name || 'Unknown'
    })) || []);
  }, [activeEmployee]);

  // Create a new task
  const createTask = async (task: Partial<EmployeeTask>) => {
    if (!supabase || !activeEmployee) return;

    await supabase.from('employee_tasks').insert([{
      employee_id: activeEmployee.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date || null,
      category: task.category || 'general',
      status: 'todo'
    }]);

    await fetchTasks();
  };

  // Toggle task status
  const toggleTask = async (task: EmployeeTask) => {
    if (!supabase) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('employee_tasks').update({ status: newStatus }).eq('id', task.id);
    await fetchTasks();
  };

  // Delete a task
  const deleteTask = async (taskId: string) => {
    if (!supabase) return;
    await supabase.from('employee_tasks').delete().eq('id', taskId);
    await fetchTasks();
  };

  // Create a new lead
  const createLead = async (lead: Partial<PersonalLead>) => {
    if (!supabase || !activeEmployee) return;

    await supabase.from('personal_leads').insert([{
      employee_id: activeEmployee.id,
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      organization: lead.organization || '',
      lead_type: lead.lead_type || 'alumni',
      notes: lead.notes || '',
      status: 'new'
    }]);

    await fetchLeads();
  };

  // Update lead status
  const updateLeadStatus = async (lead: PersonalLead, status: PersonalLead['status']) => {
    if (!supabase) return;

    const updateData: Record<string, unknown> = { status };
    if (status === 'contacted' && !lead.first_contact) {
      updateData.first_contact = new Date().toISOString().split('T')[0];
    }
    updateData.last_contact = new Date().toISOString().split('T')[0];

    await supabase.from('personal_leads').update(updateData).eq('id', lead.id);
    await fetchLeads();
  };

  // Initial data fetch
  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Fetch team members when employee is loaded
  useEffect(() => {
    if (currentEmployee) {
      fetchTeamMembers();
    }
  }, [currentEmployee, fetchTeamMembers]);

  // Fetch all data when active employee changes
  useEffect(() => {
    if (activeEmployee) {
      fetchTasks();
      fetchLeads();
      fetchMessages();
    }
  }, [activeEmployee, fetchTasks, fetchLeads, fetchMessages]);

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats: WorkspaceStats = {
    openTasks: tasks.filter(t => t.status !== 'done').length,
    overdueTasks: tasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done').length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    activeLeads: leads.filter(l => !['converted', 'lost'].includes(l.status)).length,
    unreadMessages: messages.length,
    needsFollowUp: leads.filter(l => {
      if (!l.next_followup) return false;
      return new Date(l.next_followup) <= today && !['converted', 'lost'].includes(l.status);
    }).length,
  };

  return {
    currentEmployee,
    tasks,
    leads,
    messages,
    teamMembers,
    stats,
    loading,
    error,
    refreshTasks: fetchTasks,
    refreshLeads: fetchLeads,
    refreshMessages: fetchMessages,
    createTask,
    toggleTask,
    deleteTask,
    createLead,
    updateLeadStatus,
    setViewAsEmployee,
    viewAsEmployee,
  };
}
