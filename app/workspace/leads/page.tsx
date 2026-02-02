'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee, NetworkContact, Deal } from '@/lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import {
  Target,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  Linkedin,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users,
  Crown,
  GraduationCap,
  Handshake,
  Swords,
  HelpCircle,
  DollarSign,
  Clock,
  ExternalLink,
  Filter
} from 'lucide-react';

// Lead category configuration
const LEAD_CATEGORIES = {
  chapter_presidents: {
    label: 'Chapter Presidents',
    icon: Crown,
    color: '#8b5cf6',
    bgColor: '#8b5cf615',
    contactTypes: ['chapter_president'] as NetworkContact['contact_type'][],
    description: 'Presidents of fraternity chapters'
  },
  chapter_advisors: {
    label: 'Chapter Advisors',
    icon: GraduationCap,
    color: '#06b6d4',
    bgColor: '#06b6d415',
    contactTypes: ['chapter_advisor'] as NetworkContact['contact_type'][],
    description: 'Advisors to fraternity chapters'
  },
  ifc: {
    label: 'IFC',
    icon: Users,
    color: '#f59e0b',
    bgColor: '#f59e0b15',
    contactTypes: ['ifc_president', 'ifc_advisor'] as NetworkContact['contact_type'][],
    description: 'Interfraternity Council contacts'
  },
  investors: {
    label: 'Investors',
    icon: DollarSign,
    color: '#10b981',
    bgColor: '#10b98115',
    contactTypes: ['investor', 'angel', 'vc'] as NetworkContact['contact_type'][],
    description: 'Angels, VCs, and other investors'
  },
  partnership: {
    label: 'Partnerships',
    icon: Handshake,
    color: '#3b82f6',
    bgColor: '#3b82f615',
    contactTypes: ['partnership'] as NetworkContact['contact_type'][],
    description: 'Potential business partners'
  },
  competitors: {
    label: 'Competitors',
    icon: Swords,
    color: '#ef4444',
    bgColor: '#ef444415',
    contactTypes: ['competitor'] as NetworkContact['contact_type'][],
    description: 'Competitive landscape contacts'
  },
  helpers: {
    label: 'People Who Can Help',
    icon: HelpCircle,
    color: '#64748b',
    bgColor: '#64748b15',
    contactTypes: ['connector', 'consultant', 'greek_life', 'other'] as NetworkContact['contact_type'][],
    description: 'Connectors, consultants, and others'
  },
  deals: {
    label: 'Sales Pipeline',
    icon: TrendingUp,
    color: '#f97316',
    bgColor: '#f9731615',
    contactTypes: [] as NetworkContact['contact_type'][],
    description: 'Active deals from sales pipeline'
  }
} as const;

type CategoryKey = keyof typeof LEAD_CATEGORIES;

// Unified lead type for display
interface UnifiedLead {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  priority?: 'hot' | 'warm' | 'cold';
  stage?: string;
  nextFollowup?: string;
  value?: number;
  source: 'network' | 'deal';
  contactType?: NetworkContact['contact_type'];
  originalData: NetworkContact | Deal;
}

const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
  hot: { bg: '#fee2e2', text: '#dc2626', label: '🔥 Hot' },
  warm: { bg: '#fef3c7', text: '#d97706', label: '☀️ Warm' },
  cold: { bg: '#e0f2fe', text: '#0284c7', label: '❄️ Cold' }
};

const stageColors: Record<string, { bg: string; text: string }> = {
  identified: { bg: '#f3f4f6', text: '#6b7280' },
  researching: { bg: '#e0e7ff', text: '#4f46e5' },
  outreach_pending: { bg: '#fef3c7', text: '#d97706' },
  first_contact: { bg: '#dbeafe', text: '#2563eb' },
  follow_up: { bg: '#fef3c7', text: '#d97706' },
  in_conversation: { bg: '#dcfce7', text: '#16a34a' },
  meeting_scheduled: { bg: '#e0e7ff', text: '#4f46e5' },
  met: { bg: '#dcfce7', text: '#16a34a' },
  nurturing: { bg: '#fce7f3', text: '#db2777' },
  committed: { bg: '#dcfce7', text: '#16a34a' },
  passed: { bg: '#fee2e2', text: '#dc2626' },
  dormant: { bg: '#f3f4f6', text: '#6b7280' },
  // Deal stages
  discovery: { bg: '#e0e7ff', text: '#4f46e5' },
  proposal: { bg: '#fef3c7', text: '#d97706' },
  negotiation: { bg: '#fce7f3', text: '#db2777' },
  closed_won: { bg: '#dcfce7', text: '#16a34a' },
  closed_lost: { bg: '#fee2e2', text: '#dc2626' }
};

export default function LeadsPage() {
  const { user } = useAuth();
  const { isFounder } = useUserRole();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [networkContacts, setNetworkContacts] = useState<NetworkContact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(
    new Set(Object.keys(LEAD_CATEGORIES) as CategoryKey[])
  );
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showDeals, setShowDeals] = useState(true);

  const fetchEmployee = useCallback(async () => {
    if (!supabase || !user) return;

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .single();

    if (data) {
      setCurrentEmployee(data);
    } else {
      const { data: fallback } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      if (fallback) setCurrentEmployee(fallback);
    }
  }, [user]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (currentEmployee) {
      fetchAllLeads();
    }
  }, [currentEmployee]);

  async function fetchAllLeads() {
    if (!supabase) return;
    setLoading(true);

    // Fetch network contacts
    const { data: contactsData } = await supabase
      .from('network_contacts')
      .select('*')
      .order('priority', { ascending: true })
      .order('next_followup_date', { ascending: true });

    // Fetch deals
    const { data: dealsData } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });

    setNetworkContacts(contactsData || []);
    setDeals(dealsData || []);
    setLoading(false);
  }

  // Convert network contacts to unified leads
  const networkLeads: UnifiedLead[] = networkContacts.map(contact => ({
    id: contact.id,
    name: contact.name,
    title: contact.title,
    organization: contact.organization,
    phone: contact.phone,
    email: contact.email,
    linkedin: contact.linkedin,
    priority: contact.priority,
    stage: contact.stage,
    nextFollowup: contact.next_followup_date,
    source: 'network',
    contactType: contact.contact_type,
    originalData: contact
  }));

  // Convert deals to unified leads
  const dealLeads: UnifiedLead[] = deals.map(deal => ({
    id: deal.id,
    name: deal.name,
    title: deal.contact_name,
    organization: deal.organization,
    value: deal.value,
    stage: deal.stage,
    nextFollowup: deal.expected_close,
    source: 'deal',
    originalData: deal
  }));

  // Group leads by category
  const getLeadsByCategory = (categoryKey: CategoryKey): UnifiedLead[] => {
    if (categoryKey === 'deals') {
      return dealLeads;
    }
    
    const category = LEAD_CATEGORIES[categoryKey];
    return networkLeads.filter(lead => 
      lead.contactType && category.contactTypes.includes(lead.contactType)
    );
  };

  // Filter leads based on search and filters
  const filterLeads = (leads: UnifiedLead[]): UnifiedLead[] => {
    return leads.filter(lead => {
      const matchesSearch = !searchQuery || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.title?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = filterPriority === 'all' || lead.priority === filterPriority;
      
      return matchesSearch && matchesPriority;
    });
  };

  const toggleCategory = (category: CategoryKey) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(Object.keys(LEAD_CATEGORIES) as CategoryKey[]));
  const collapseAll = () => setExpandedCategories(new Set());

  // Calculate stats
  const totalNetworkContacts = networkContacts.length;
  const totalDeals = deals.length;
  const hotLeads = networkContacts.filter(c => c.priority === 'hot').length;
  const needsFollowup = networkContacts.filter(c => {
    if (!c.next_followup_date) return false;
    return new Date(c.next_followup_date) <= new Date();
  }).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  const isOverdue = (date: string | null): boolean => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="ws-loading">
        <div className="ws-loading-spinner" />
        <p>Loading all leads...</p>
      </div>
    );
  }

  // Check if user is a founder/cofounder
  if (!isFounder) {
    return (
      <div className="ws-no-access">
        <Target size={48} />
        <h2>Founder Access Only</h2>
        <p>The consolidated leads view is available to founders and co-founders.</p>
      </div>
    );
  }

  return (
    <div className="ws-subpage leads-consolidated">
      {/* Header */}
      <header className="ws-subpage-header">
        <div className="ws-subpage-header-left">
          <h1>
            <Target size={24} />
            All Leads
          </h1>
          <span className="ws-subpage-count">
            {totalNetworkContacts + totalDeals} total
          </span>
        </div>
        <div className="leads-header-actions">
          <button 
            className="ws-text-btn"
            onClick={expandAll}
          >
            Expand All
          </button>
          <button 
            className="ws-text-btn"
            onClick={collapseAll}
          >
            Collapse All
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="ws-subpage-stats">
        <div className="ws-subpage-stat">
          <Users size={18} />
          <span className="ws-subpage-stat-value">{totalNetworkContacts}</span>
          <span className="ws-subpage-stat-label">Network Contacts</span>
        </div>
        <div className="ws-subpage-stat">
          <TrendingUp size={18} />
          <span className="ws-subpage-stat-value">{totalDeals}</span>
          <span className="ws-subpage-stat-label">Active Deals</span>
        </div>
        <div className="ws-subpage-stat hot">
          <span className="ws-subpage-stat-value">{hotLeads}</span>
          <span className="ws-subpage-stat-label">🔥 Hot Leads</span>
        </div>
        <div className={`ws-subpage-stat ${needsFollowup > 0 ? 'warning' : ''}`}>
          <Clock size={18} />
          <span className="ws-subpage-stat-value">{needsFollowup}</span>
          <span className="ws-subpage-stat-label">Need Follow-up</span>
        </div>
      </div>

      {/* Filters */}
      <div className="ws-subpage-filters">
        <div className="ws-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search all leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="leads-filters-right">
          <select 
            className="ws-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">☀️ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
          
          <label className="leads-toggle">
            <input 
              type="checkbox" 
              checked={showDeals}
              onChange={(e) => setShowDeals(e.target.checked)}
            />
            <span>Show Deals</span>
          </label>
        </div>
      </div>

      {/* Lead Categories */}
      <div className="leads-categories">
        {(Object.keys(LEAD_CATEGORIES) as CategoryKey[]).map(categoryKey => {
          // Skip deals section if showDeals is false
          if (categoryKey === 'deals' && !showDeals) return null;
          
          const category = LEAD_CATEGORIES[categoryKey];
          const categoryLeads = filterLeads(getLeadsByCategory(categoryKey));
          const isExpanded = expandedCategories.has(categoryKey);
          const Icon = category.icon;

          return (
            <div key={categoryKey} className="leads-category">
              <button 
                className="leads-category-header"
                onClick={() => toggleCategory(categoryKey)}
              >
                <div className="leads-category-left">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <div 
                    className="leads-category-icon"
                    style={{ backgroundColor: category.bgColor, color: category.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="leads-category-info">
                    <h3>{category.label}</h3>
                    <span className="leads-category-desc">{category.description}</span>
                  </div>
                </div>
                <span 
                  className="leads-category-count"
                  style={{ backgroundColor: category.bgColor, color: category.color }}
                >
                  {categoryLeads.length}
                </span>
              </button>

              {isExpanded && (
                <div className="leads-category-content">
                  {categoryLeads.length === 0 ? (
                    <div className="leads-category-empty">
                      <p>No {category.label.toLowerCase()} found</p>
                    </div>
                  ) : (
                    <div className="leads-list">
                      {categoryLeads.map(lead => (
                        <div 
                          key={lead.id} 
                          className={`lead-card ${lead.source} ${lead.nextFollowup && isOverdue(lead.nextFollowup) ? 'overdue' : ''}`}
                        >
                          <div className="lead-card-main">
                            <div className="lead-card-info">
                              <div className="lead-card-name-row">
                                <h4>{lead.name}</h4>
                                {lead.priority && (
                                  <span 
                                    className="lead-priority-badge"
                                    style={{ 
                                      backgroundColor: priorityColors[lead.priority]?.bg,
                                      color: priorityColors[lead.priority]?.text
                                    }}
                                  >
                                    {priorityColors[lead.priority]?.label}
                                  </span>
                                )}
                                {lead.value !== undefined && lead.value > 0 && (
                                  <span className="lead-value-badge">
                                    {formatCurrency(lead.value)}
                                  </span>
                                )}
                              </div>
                              {(lead.title || lead.organization) && (
                                <p className="lead-card-subtitle">
                                  {lead.title}
                                  {lead.title && lead.organization && ' @ '}
                                  {lead.organization && (
                                    <span className="lead-org">
                                      <Building2 size={12} />
                                      {lead.organization}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>

                            <div className="lead-card-meta">
                              {lead.stage && (
                                <span 
                                  className="lead-stage-badge"
                                  style={{ 
                                    backgroundColor: stageColors[lead.stage]?.bg || '#f3f4f6',
                                    color: stageColors[lead.stage]?.text || '#6b7280'
                                  }}
                                >
                                  {lead.stage.replace(/_/g, ' ')}
                                </span>
                              )}
                              {lead.nextFollowup && (
                                <span className={`lead-followup ${isOverdue(lead.nextFollowup) ? 'overdue' : ''}`}>
                                  <Calendar size={12} />
                                  {isOverdue(lead.nextFollowup) ? 'Overdue: ' : ''}
                                  {new Date(lead.nextFollowup).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="lead-card-actions">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="lead-action-btn" title="Call">
                                <Phone size={14} />
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="lead-action-btn" title="Email">
                                <Mail size={14} />
                              </a>
                            )}
                            {lead.linkedin && (
                              <a 
                                href={lead.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="lead-action-btn"
                                title="LinkedIn"
                              >
                                <Linkedin size={14} />
                              </a>
                            )}
                            <a 
                              href={lead.source === 'deal' ? '/nucleus/pipeline' : '/nucleus/fundraising'} 
                              className="lead-action-btn view"
                              title={`View in ${lead.source === 'deal' ? 'Pipeline' : 'Network'}`}
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .leads-consolidated {
          max-width: 1200px;
        }

        .leads-header-actions {
          display: flex;
          gap: 8px;
        }

        .ws-text-btn {
          background: none;
          border: none;
          color: var(--ws-text-secondary);
          font-size: 13px;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .ws-text-btn:hover {
          background: var(--ws-bg-secondary);
          color: var(--ws-text-primary);
        }

        .leads-filters-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ws-select {
          padding: 8px 12px;
          border: 1px solid var(--ws-border);
          border-radius: 8px;
          background: white;
          font-size: 13px;
          cursor: pointer;
        }

        .leads-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--ws-text-secondary);
          cursor: pointer;
        }

        .leads-toggle input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .leads-categories {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leads-category {
          background: white;
          border: 1px solid var(--ws-border);
          border-radius: 12px;
          overflow: hidden;
        }

        .leads-category-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .leads-category-header:hover {
          background: var(--ws-bg-secondary);
        }

        .leads-category-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .leads-category-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .leads-category-info {
          text-align: left;
        }

        .leads-category-info h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--ws-text-primary);
          margin: 0;
        }

        .leads-category-desc {
          font-size: 12px;
          color: var(--ws-text-secondary);
        }

        .leads-category-count {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .leads-category-content {
          padding: 0 20px 20px;
          border-top: 1px solid var(--ws-border);
        }

        .leads-category-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--ws-text-secondary);
        }

        .leads-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 16px;
        }

        .lead-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--ws-bg-secondary);
          border-radius: 10px;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .lead-card:hover {
          border-color: var(--ws-border);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .lead-card.overdue {
          border-left: 3px solid #ef4444;
        }

        .lead-card-main {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 1;
        }

        .lead-card-info {
          min-width: 0;
          flex: 1;
        }

        .lead-card-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .lead-card-name-row h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--ws-text-primary);
          margin: 0;
        }

        .lead-priority-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .lead-value-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: #dcfce7;
          color: #16a34a;
        }

        .lead-card-subtitle {
          font-size: 12px;
          color: var(--ws-text-secondary);
          margin: 4px 0 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .lead-org {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .lead-card-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .lead-stage-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .lead-followup {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--ws-text-secondary);
        }

        .lead-followup.overdue {
          color: #ef4444;
          font-weight: 600;
        }

        .lead-card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 16px;
        }

        .lead-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ws-text-secondary);
          background: white;
          border: 1px solid var(--ws-border);
          transition: all 0.15s ease;
          cursor: pointer;
          text-decoration: none;
        }

        .lead-action-btn:hover {
          background: var(--ws-primary);
          color: white;
          border-color: var(--ws-primary);
        }

        .lead-action-btn.view {
          background: var(--ws-bg-secondary);
        }

        .lead-action-btn.view:hover {
          background: var(--ws-primary);
          color: white;
        }

        .ws-subpage-stat.hot .ws-subpage-stat-value {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .lead-card-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .lead-card-meta {
            flex-wrap: wrap;
          }

          .leads-filters-right {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
