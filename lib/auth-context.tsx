'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  seniority: number;
  created_at: string;
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
          fetchProfile(session.user.id);
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
          await fetchProfile(session.user.id);
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

  async function fetchProfile(userId: string) {
    if (!supabase) {
      setLoading(false);
      loadingRef.current = false;
      return;
    }
    
    // Get current user email for admin fallback
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const userEmail = currentUser?.email || '';
    
    try {
      console.log('Fetching profile for user_id:', userId, 'email:', userEmail);
      
      const { data, error, status } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Profile query result:', { data, error, status });

      if (error) {
        console.error('Error fetching profile:', error.message, error.code, error.details);
        
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
          setProfile(null);
        }
      } else {
        console.log('Profile loaded successfully:', data);
        setProfile(data);
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

  const isAdmin = profile?.role === 'admin' && profile?.seniority === 5;

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
