'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string; // Employee roles: 'founder', 'cofounder', 'growth_intern', 'engineer', etc.
  seniority: number;
  created_at: string;
  isEmployee: boolean; // Always true now - all users are employees
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);

  useEffect(() => {
    // Timeout fallback - if auth takes more than 5s, stop loading
    const timeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn('Auth timeout - stopping loading');
        setLoading(false);
        loadingRef.current = false;
      }
    }, 5000);

    if (!supabase) {
      console.log('No Supabase client - showing login');
      setLoading(false);
      loadingRef.current = false;
      return () => clearTimeout(timeout);
    }

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout);
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          loadingRef.current = false;
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email || '');
        } else {
          // No session = not logged in, show login
          setLoading(false);
          loadingRef.current = false;
        }
      })
      .catch((err) => {
        console.error('Auth error:', err);
        setLoading(false);
        loadingRef.current = false;
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          setProfile(null);
          setLoading(false);
          loadingRef.current = false;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function fetchProfile(userId: string, userEmail: string) {
    if (!supabase) {
      setLoading(false);
      loadingRef.current = false;
      return;
    }
    
    try {
      console.log('Fetching employee profile for:', userEmail);
      
      let employeeData = null;
      
      // Try by auth_user_id first (primary method)
      const { data: byAuthId, error: authIdError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (!authIdError && byAuthId) {
        employeeData = byAuthId;
        console.log('Found employee by auth_user_id');
      } else {
        // Log the error for debugging (PGRST116 = no rows returned, not an error)
        if (authIdError && authIdError.code !== 'PGRST116') {
          console.log('auth_user_id lookup issue:', authIdError.message);
        }
        
        // Fallback: try by email (RLS allows this via JWT email)
        console.log('Trying email lookup:', userEmail);
        const { data: byEmail, error: emailError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (!emailError && byEmail) {
          employeeData = byEmail;
          console.log('Found employee by email');
          
          // Auto-link auth_user_id if not set (migration helper)
          if (!byEmail.auth_user_id) {
            console.log('Auto-linking auth_user_id to employee record...');
            await supabase
              .from('employees')
              .update({ auth_user_id: userId })
              .eq('id', byEmail.id);
          }
        } else if (emailError && emailError.code !== 'PGRST116') {
          console.log('Email lookup issue:', emailError.message);
        }
      }

      if (employeeData) {
        console.log('Employee profile loaded:', employeeData.name, 'Role:', employeeData.role);
        const employeeProfile: UserProfile = {
          id: employeeData.id,
          email: employeeData.email,
          name: employeeData.name,
          role: employeeData.role,
          seniority: employeeData.seniority || 1,
          created_at: employeeData.created_at,
          isEmployee: true,
        };
        setProfile(employeeProfile);
      } else {
        // User exists in Auth but not in employees table
        // This means they need to be added as an employee first
        console.log('No employee record found for:', userEmail);
        console.log('User needs to be added to employees table to access the system');
        setProfile(null);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
    }
    
    setLoading(false);
    loadingRef.current = false;
  }

  async function signIn(email: string, password: string) {
    if (!supabase) {
      return { error: new Error('Database not connected') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }

  // Admin access is based on role from employee record
  // Founders and Co-founders have full admin access to Nucleus
  const isAdmin = profile?.role === 'founder' || profile?.role === 'cofounder';

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
