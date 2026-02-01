'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function NucleusLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // If successful, the auth context will update and redirect
  }

  return (
    <div className="nucleus-login-page">
      <div className="nucleus-login-container">
        {/* Logo and Header */}
        <div className="nucleus-login-header">
          <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-login-logo" />
          <h1>Nucleus</h1>
          <p>Command Center Access</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="nucleus-login-form">
          {error && (
            <div className="nucleus-login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="nucleus-login-field">
            <label htmlFor="email">Email</label>
            <div className="nucleus-login-input-wrapper">
              <Mail size={18} className="nucleus-login-input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@trailblaize.net"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="nucleus-login-field">
            <label htmlFor="password">Password</label>
            <div className="nucleus-login-input-wrapper">
              <Lock size={18} className="nucleus-login-input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="nucleus-login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="nucleus-login-submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Access Nucleus'}
          </button>
        </form>

        {/* Footer */}
        <div className="nucleus-login-footer">
          <p>Authorized personnel only</p>
          <p className="nucleus-login-security">
            <Lock size={12} />
            Secured with Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
