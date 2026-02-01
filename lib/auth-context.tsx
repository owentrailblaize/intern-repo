'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string; // 'admin' or employee roles like 'engineer', 'growth_intern', etc.
  seniority: number;
  created_at: string;
  isEmployee?: boolean; // true if from employees table
}

// Admin emails that always have access (fallback when admin_profiles table has issues)
const ADMIN_EMAILS = [
  'owen@trailblaize.net',
];

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
      console.log('Fetching profile for user_id:', userId, 'email:', userEmail);
      
      // First, check admin_profiles table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!adminError && adminData) {
        console.log('Admin profile loaded:', adminData);
        setProfile(adminData);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // If not in admin_profiles, check employees table by auth_user_id first
      console.log('Not in admin_profiles, checking employees table...');
      let employeeData = null;
      
      // Try by auth_user_id first
      const { data: byAuthId, error: authIdError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (!authIdError && byAuthId) {
        employeeData = byAuthId;
        console.log('Found employee by auth_user_id:', byAuthId);
      } else {
        // Fallback: try by email
        console.log('Not found by auth_user_id, trying email:', userEmail);
        const { data: byEmail, error: emailError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (!emailError && byEmail) {
          employeeData = byEmail;
          console.log('Found employee by email:', byEmail);
          
          // Auto-link auth_user_id if not set (helpful for migration)
          if (!byEmail.auth_user_id) {
            console.log('Linking auth_user_id to employee record...');
            await supabase
              .from('employees')
              .update({ auth_user_id: userId })
              .eq('id', byEmail.id);
          }
        }
      }

      if (employeeData) {
        console.log('Employee profile loaded:', employeeData);
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
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      console.log('Not found in employees either, checking fallbacks...');
      
      // Fallback: If user email is in admin list, create a virtual profile
      if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        console.log('Admin email detected, creating fallback profile');
        const fallbackProfile: UserProfile = {
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1),
          role: 'admin',
          seniority: 5,
          created_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      } else {
        console.log('No profile found for user');
        setProfile(null);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      
      // Fallback for admin emails on catch
      if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        console.log('Admin email detected (catch), creating fallback profile');
        const fallbackProfile: UserProfile = {
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1),
          role: 'admin',
          seniority: 5,
          created_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      } else {
        setProfile(null);
      }
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

  const isAdmin = profile?.role === 'admin' || 
    profile?.role === 'founder' || 
    profile?.role === 'cofounder' ||
    ADMIN_EMAILS.includes(user?.email?.toLowerCase() || '');

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
