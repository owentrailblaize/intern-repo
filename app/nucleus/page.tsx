'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  TrendingUp, 
  CheckSquare, 
  ArrowRight,
  ArrowUp,
  ArrowDown,
  DollarSign,
  GraduationCap,
  HeartHandshake,
  Building2,
  Rocket,
  LogOut,
  Shield,
  Clock,
  Flame,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModuleStats {
  employees: {
    total: number;
    active: number;
    onboarding: number;
    newThisWeek: number;
  };
  fundraising: {
    total: number;
    hot: number;
    needsFollowup: number;
    investors: number;
  };
  pipeline: {
    value: number;
    active: number;
    wonThisMonth: number;
    avgDealSize: number;
  };
  operations: {
    open: number;
    inProgress: number;
    dueToday: number;
    completed: number;
  };
  customerSuccess: {
    total: number;
    active: number;
    onboarding: number;
    mrr: number;
  };
  enterprise: {
    active: number;
    inNegotiation: number;
    value: number;
    pending: number;
  };
}

export default function Nucleus() {
  const { profile, signOut, isAdmin } = useAuth();
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all stats on mount
  useEffect(() => {
    fetchAllStats();
  }, []);

  async function fetchAllStats() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [
        employeesRes,
        contactsRes,
        dealsRes,
        tasksRes,
        chaptersRes,
        contractsRes
      ] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('network_contacts').select('*'),
        supabase.from('deals').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('chapters').select('*'),
        supabase.from('enterprise_contracts').select('*')
      ]);

      const employees = employeesRes.data || [];
      const contacts = contactsRes.data || [];
      const deals = dealsRes.data || [];
      const tasks = tasksRes.data || [];
      const chapters = chaptersRes.data || [];
      const contracts = contractsRes.data || [];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const today = now.toDateString();

      setStats({
        employees: {
          total: employees.length,
          active: employees.filter(e => e.status === 'active').length,
          onboarding: employees.filter(e => e.status === 'onboarding').length,
          newThisWeek: employees.filter(e => new Date(e.start_date) >= weekAgo).length,
        },
        fundraising: {
          total: contacts.length,
          hot: contacts.filter(c => c.priority === 'hot').length,
          needsFollowup: contacts.filter(c => c.next_followup_date && new Date(c.next_followup_date) <= now).length,
          investors: contacts.filter(c => ['investor', 'angel', 'vc'].includes(c.contact_type)).length,
        },
        pipeline: {
          value: deals.reduce((sum, d) => sum + (d.value || 0), 0),
          active: deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length,
          wonThisMonth: deals.filter(d => {
            if (d.stage !== 'closed_won') return false;
            const created = new Date(d.created_at);
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          }).length,
          avgDealSize: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0,
        },
        operations: {
          open: tasks.filter(t => t.status === 'todo').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          dueToday: tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === today).length,
          completed: tasks.filter(t => t.status === 'done').length,
        },
        customerSuccess: {
          total: chapters.length,
          active: chapters.filter(c => c.status === 'active').length,
          onboarding: chapters.filter(c => c.status === 'onboarding').length,
          mrr: chapters.reduce((sum, c) => sum + (c.mrr || 0), 0),
        },
        enterprise: {
          active: contracts.filter(c => c.stage === 'signed').length,
          inNegotiation: contracts.filter(c => ['negotiation', 'contract_sent'].includes(c.stage)).length,
          value: contracts.filter(c => c.stage === 'signed').reduce((sum, c) => sum + (c.value || 0), 0),
          pending: contracts.filter(c => c.stage === 'contract_sent').length,
        },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  }

  // Calculate company-wide stats
  const companyStats = [
    { 
      label: 'Total MRR', 
      value: stats ? formatCurrency(stats.customerSuccess.mrr) : '—',
      icon: DollarSign,
      color: '#10b981',
      trend: '+12%'
    },
    { 
      label: 'Pipeline', 
      value: stats ? formatCurrency(stats.pipeline.value) : '—',
      icon: TrendingUp,
      color: '#f59e0b',
      trend: '+8%'
    },
    { 
      label: 'Active Chapters', 
      value: stats?.customerSuccess.active ?? '—',
      icon: GraduationCap,
      color: '#8b5cf6',
      trend: '+2'
    },
    { 
      label: 'Team Size', 
      value: stats?.employees.active ?? '—',
      icon: Users,
      color: '#3b82f6',
      trend: null
    },
  ];

  const modules = [
    {
      title: 'Sales Pipeline',
      description: 'Track deals and manage opportunities.',
      icon: TrendingUp,
      href: '/nucleus/pipeline',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      stats: stats?.pipeline ? [
        { label: 'Pipeline', value: formatCurrency(stats.pipeline.value), icon: DollarSign },
        { label: 'Active', value: stats.pipeline.active, icon: Activity, color: '#3b82f6' },
        { label: 'Won', value: stats.pipeline.wonThisMonth, icon: CheckCircle, color: '#10b981' },
      ] : [],
      highlight: stats?.pipeline.avgDealSize ? { 
        text: `${formatCurrency(stats.pipeline.avgDealSize)} avg deal`, 
        type: 'info' 
      } : null,
    },
    {
      title: 'Customer Success',
      description: 'Track chapter onboarding and health.',
      icon: HeartHandshake,
      href: '/nucleus/customer-success',
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      stats: stats?.customerSuccess ? [
        { label: 'Chapters', value: stats.customerSuccess.total, icon: GraduationCap },
        { label: 'Active', value: stats.customerSuccess.active, icon: CheckCircle, color: '#10b981' },
        { label: 'MRR', value: formatCurrency(stats.customerSuccess.mrr), icon: DollarSign, color: '#10b981' },
      ] : [],
      highlight: stats?.customerSuccess.onboarding ? { 
        text: `${stats.customerSuccess.onboarding} onboarding`, 
        type: 'info' 
      } : null,
    },
    {
      title: 'Operations & Tasks',
      description: 'Coordinate activities and track progress.',
      icon: CheckSquare,
      href: '/nucleus/operations',
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      stats: stats?.operations ? [
        { label: 'Open', value: stats.operations.open, icon: CheckSquare },
        { label: 'In Progress', value: stats.operations.inProgress, icon: Activity, color: '#3b82f6' },
        { label: 'Done', value: stats.operations.completed, icon: CheckCircle, color: '#10b981' },
      ] : [],
      highlight: stats?.operations.dueToday ? { 
        text: `${stats.operations.dueToday} due today`, 
        type: stats.operations.dueToday > 0 ? 'warning' : 'success' 
      } : null,
    },
    {
      title: 'Enterprise Contracts',
      description: 'Manage IFCs and large partnerships.',
      icon: Building2,
      href: '/nucleus/enterprise',
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      stats: stats?.enterprise ? [
        { label: 'Signed', value: stats.enterprise.active, icon: CheckCircle, color: '#10b981' },
        { label: 'Negotiating', value: stats.enterprise.inNegotiation, icon: Activity, color: '#f59e0b' },
        { label: 'Value', value: formatCurrency(stats.enterprise.value), icon: DollarSign },
      ] : [],
      highlight: stats?.enterprise.pending ? { 
        text: `${stats.enterprise.pending} pending signature`, 
        type: 'warning' 
      } : null,
    },
    {
      title: 'Fundraising & Network',
      description: 'Build relationships and manage your network.',
      icon: Rocket,
      href: '/nucleus/fundraising',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      stats: stats?.fundraising ? [
        { label: 'Contacts', value: stats.fundraising.total, icon: Users },
        { label: 'Hot Leads', value: stats.fundraising.hot, icon: Flame, color: '#ef4444' },
        { label: 'Investors', value: stats.fundraising.investors, icon: Target, color: '#8b5cf6' },
      ] : [],
      highlight: stats?.fundraising.needsFollowup ? { 
        text: `${stats.fundraising.needsFollowup} need follow-up`, 
        type: stats.fundraising.needsFollowup > 0 ? 'warning' : 'success' 
      } : null,
    },
    {
      title: 'Employees & Onboarding',
      description: 'Manage team members and track onboarding progress.',
      icon: Users,
      href: '/nucleus/employees',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      stats: stats?.employees ? [
        { label: 'Total', value: stats.employees.total, icon: Users },
        { label: 'Active', value: stats.employees.active, icon: CheckCircle, color: '#10b981' },
        { label: 'Onboarding', value: stats.employees.onboarding, icon: Clock, color: '#f59e0b' },
      ] : [],
      highlight: stats?.employees.newThisWeek ? { 
        text: `${stats.employees.newThisWeek} new this week`, 
        type: 'success' 
      } : null,
    },
  ];

  // Calculate urgent items for attention banner
  const urgentItems = [];
  if (stats?.fundraising.needsFollowup && stats.fundraising.needsFollowup > 0) {
    urgentItems.push({ text: `${stats.fundraising.needsFollowup} contacts need follow-up`, href: '/nucleus/fundraising' });
  }
  if (stats?.operations.dueToday && stats.operations.dueToday > 0) {
    urgentItems.push({ text: `${stats.operations.dueToday} tasks due today`, href: '/nucleus/operations' });
  }

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
        {/* Attention Banner */}
        {urgentItems.length > 0 && (
          <div className="nucleus-attention-banner">
            <div className="nucleus-attention-icon">
              <Zap size={18} />
            </div>
            <div className="nucleus-attention-content">
              <span className="nucleus-attention-title">Needs Attention</span>
              <div className="nucleus-attention-items">
                {urgentItems.map((item, idx) => (
                  <Link key={idx} href={item.href} className="nucleus-attention-item">
                    {item.text}
                    <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Company Stats */}
        <section className="nucleus-company-stats">
          {companyStats.map((stat, index) => (
            <div key={index} className="nucleus-company-stat">
              <div className="nucleus-company-stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={22} />
              </div>
              <div className="nucleus-company-stat-content">
                <span className="nucleus-company-stat-value">
                  {loading ? '...' : stat.value}
                </span>
                <span className="nucleus-company-stat-label">{stat.label}</span>
              </div>
              {stat.trend && (
                <div className="nucleus-company-stat-trend positive">
                  <ArrowUp size={14} />
                  {stat.trend}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Modules Grid */}
        <section className="nucleus-modules">
          <h2 className="nucleus-section-title">Modules</h2>
          <div className="nucleus-modules-grid">
            {modules.map((module, index) => (
              <Link key={index} href={module.href} className="nucleus-module-card-enhanced">
                <div className="nucleus-module-card-header">
                  <div 
                    className="nucleus-module-icon-enhanced" 
                    style={{ background: module.gradient }}
                  >
                    <module.icon size={24} color="white" />
                  </div>
                  <div className="nucleus-module-info">
                    <h3 className="nucleus-module-title-enhanced">{module.title}</h3>
                    <p className="nucleus-module-description-enhanced">{module.description}</p>
                  </div>
                </div>
                
                {/* Stats Row */}
                <div className="nucleus-module-stats-row">
                  {loading ? (
                    <div className="nucleus-module-stats-loading">Loading stats...</div>
                  ) : module.stats.length > 0 ? (
                    module.stats.map((stat, idx) => (
                      <div key={idx} className="nucleus-module-stat-item">
                        <stat.icon size={14} style={{ color: stat.color || '#6b7280' }} />
                        <span className="nucleus-module-stat-value" style={{ color: stat.color }}>
                          {stat.value}
                        </span>
                        <span className="nucleus-module-stat-label">{stat.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="nucleus-module-stats-empty">No data yet</div>
                  )}
                </div>

                {/* Highlight / Alert */}
                {module.highlight && (
                  <div className={`nucleus-module-highlight ${module.highlight.type}`}>
                    {module.highlight.type === 'warning' && <AlertTriangle size={14} />}
                    {module.highlight.type === 'success' && <CheckCircle size={14} />}
                    {module.highlight.type === 'info' && <Activity size={14} />}
                    {module.highlight.text}
                  </div>
                )}

                <div className="nucleus-module-footer">
                  <span className="nucleus-module-link">
                    Open Module
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
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
