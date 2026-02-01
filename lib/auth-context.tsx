'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string; // Employee roles: 'founder', 'cofounder', 'growth_intern', 'engineer', etc.
  seniority: number;
  isEmployee: boolean;
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

  useEffect(() => {
    if (!supabase) {
      console.log('No Supabase client');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Build profile from JWT user_metadata - NO DATABASE QUERY NEEDED
        buildProfileFromSession(session);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          buildProfileFromSession(session);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Build profile directly from session/JWT - no database query!
  function buildProfileFromSession(session: Session) {
    const user = session.user;
    const metadata = user.user_metadata || {};
    
    console.log('Building profile from JWT metadata:', metadata);
    
    // Get role from user_metadata (set when user was created)
    const role = metadata.role || 'growth_intern'; // default role
    const name = metadata.name || user.email?.split('@')[0] || 'User';
    
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email || '',
      name: name,
      role: role,
      seniority: metadata.seniority || 1,
      isEmployee: true,
    };
    
    console.log('Profile built:', userProfile.name, 'Role:', userProfile.role);
    setProfile(userProfile);
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
