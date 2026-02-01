'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  CheckSquare, 
  ArrowRight,
  DollarSign,
  GraduationCap,
  HeartHandshake,
  Building2,
  Rocket,
  LogOut,
  Shield
} from 'lucide-react';

export default function Nucleus() {
  const { profile, signOut, isAdmin } = useAuth();
  const stats = [
    { label: 'ARR', value: '$17.9k', icon: DollarSign },
    { label: 'MRR', value: '$1.5k', icon: TrendingUp },
    { label: 'Schools', value: '5', icon: GraduationCap },
    { label: 'Users', value: '5.5k', icon: Users },
  ];

  const modules = [
    {
      title: 'Employees & Onboarding',
      description: 'Manage team members, track onboarding progress, and streamline new hire workflows.',
      icon: Users,
      href: '/nucleus/employees',
      color: '#3b82f6',
    },
    {
      title: 'Fundraising & Network',
      description: 'Build investor relationships, track outreach, and manage your fundraising pipeline.',
      icon: Rocket,
      href: '/nucleus/fundraising',
      color: '#10b981',
    },
    {
      title: 'Sales Pipeline',
      description: 'Monitor deals, track velocity, and manage opportunities through your funnel.',
      icon: TrendingUp,
      href: '/nucleus/pipeline',
      color: '#f59e0b',
    },
    {
      title: 'Operations & Tasks',
      description: 'Coordinate day-to-day activities and keep the business running smoothly.',
      icon: CheckSquare,
      href: '/nucleus/operations',
      color: '#8b5cf6',
    },
    {
      title: 'Customer Success',
      description: 'Track the entire onboarding and customer success process from signup to expansion.',
      icon: HeartHandshake,
      href: '/nucleus/customer-success',
      color: '#ec4899',
    },
    {
      title: 'Enterprise Contracts',
      description: 'Manage enterprise deals with IFCs, national organizations, and large partnerships.',
      icon: Building2,
      href: '/nucleus/enterprise',
      color: '#06b6d4',
    },
  ];

  return (
    <div className="nucleus">
      {/* Header */}
      <header className="nucleus-header">
        <div className="nucleus-header-content">
          <a href="/" className="nucleus-logo">
            <img src="/logo-icon.svg" alt="Trailblaize" className="nucleus-logo-icon" />
          </a>
          <div className="nucleus-title">
            <h1>Nucleus</h1>
            <span className="nucleus-subtitle">Command Center</span>
          </div>
        </div>
        <div className="nucleus-header-user">
          {isAdmin && (
            <span className="nucleus-admin-badge">
              <Shield size={14} />
              Admin
            </span>
          )}
          <span className="nucleus-user-name">{profile?.name}</span>
          <button onClick={signOut} className="nucleus-logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="nucleus-main">
        {/* Stats Grid */}
        <section className="nucleus-stats">
          {stats.map((stat, index) => (
            <div key={index} className="nucleus-stat-card">
              <div className="nucleus-stat-icon">
                <stat.icon size={20} />
              </div>
              <div className="nucleus-stat-content">
                <span className="nucleus-stat-value">{stat.value}</span>
                <span className="nucleus-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Modules Grid */}
        <section className="nucleus-modules">
          <h2 className="nucleus-section-title">Modules</h2>
          <div className="nucleus-modules-grid">
            {modules.map((module, index) => (
              <div key={index} className="nucleus-module-card">
                <div className="nucleus-module-header">
                  <div 
                    className="nucleus-module-icon" 
                    style={{ backgroundColor: `${module.color}15`, color: module.color }}
                  >
                    <module.icon size={24} />
                  </div>
                  <span className="nucleus-module-status active">Active</span>
                </div>
                <h3 className="nucleus-module-title">{module.title}</h3>
                <p className="nucleus-module-description">{module.description}</p>
                <Link href={module.href} className="nucleus-module-button">
                  Open Module
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="nucleus-quick-actions">
          <h2 className="nucleus-section-title">Quick Actions</h2>
          <div className="nucleus-actions-grid">
            <Link href="/nucleus/employees" className="nucleus-action-button">
              <UserPlus size={18} />
              Add Employee
            </Link>
            <Link href="/nucleus/fundraising" className="nucleus-action-button">
              <Rocket size={18} />
              Log Investor Contact
            </Link>
            <Link href="/nucleus/pipeline" className="nucleus-action-button">
              <TrendingUp size={18} />
              Create Deal
            </Link>
            <Link href="/nucleus/enterprise" className="nucleus-action-button">
              <Building2 size={18} />
              New Enterprise Lead
            </Link>
            <Link href="/nucleus/customer-success" className="nucleus-action-button">
              <HeartHandshake size={18} />
              Track Customer
            </Link>
            <Link href="/nucleus/operations" className="nucleus-action-button">
              <CheckSquare size={18} />
              Add Task
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="nucleus-footer">
        <p>Trailblaize Nucleus · Internal Use Only</p>
      </footer>
    </div>
  );
}
