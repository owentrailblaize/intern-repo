'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, Plus, Search, Filter, X, Trash2, Edit2, Upload, Image, FileSpreadsheet, Loader2, Check, AlertCircle, Phone, MessageSquare, Calendar, Flame, Trophy, Zap, Star, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { supabase, Deal, DealStage, STAGE_CONFIG, LEVEL_THRESHOLDS, LEVEL_TITLES } from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';

interface ParsedDeal {
  name: string;
  organization: string;
  contact_name: string;
  fraternity: string;
  phone: string;
  email: string;
  value: number;
  stage: DealStage;
  notes: string;
  temperature: 'hot' | 'warm' | 'cold';
  expected_close: string;
  selected?: boolean;
}

interface SalesStats {
  total_points: number;
  current_streak: number;
  best_streak: number;
  deals_closed: number;
  demos_booked: number;
}

export default function PipelineModule() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [filterStage, setFilterStage] = useState<DealStage | 'all'>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    contact_name: '',
    fraternity: '',
    phone: '',
    email: '',
    value: 299,
    stage: 'lead' as DealStage,
    temperature: 'cold' as Deal['temperature'],
    expected_close: '',
    next_followup: '',
    notes: '',
  });

  // Stats
  const [stats, setStats] = useState<SalesStats>({
    total_points: 0,
    current_streak: 0,
    best_streak: 0,
    deals_closed: 0,
    demos_booked: 0,
  });

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'choose' | 'image' | 'text' | 'preview'>('choose');
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [parsedDeals, setParsedDeals] = useState<ParsedDeal[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch deals and calculate stats
  useEffect(() => {
    fetchDeals();
  }, []);

  async function fetchDeals() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
    } else {
      setDeals(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  }

  function calculateStats(dealsList: Deal[]) {
    const closedWon = dealsList.filter(d => d.stage === 'closed_won');
    const demosBooked = dealsList.filter(d => ['demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won'].includes(d.stage));
    
    // Calculate points based on deal stages
    let points = 0;
    dealsList.forEach(d => {
      points += STAGE_CONFIG[d.stage]?.points || 0;
    });

    // Calculate streak (simplified - based on deals with recent follow-ups)
    const today = new Date().toISOString().split('T')[0];
    const recentFollowups = dealsList.filter(d => d.last_contact === today).length;
    
    setStats({
      total_points: points,
      current_streak: recentFollowups > 0 ? Math.max(1, stats.current_streak) : 0,
      best_streak: Math.max(stats.best_streak, recentFollowups > 0 ? stats.current_streak + 1 : stats.current_streak),
      deals_closed: closedWon.length,
      demos_booked: demosBooked.length,
    });
  }

  function getLevel(points: number): { level: number; title: string; progress: number; nextThreshold: number } {
    let level = 0;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (points >= LEVEL_THRESHOLDS[i]) level = i;
    }
    const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level];
    const progress = nextThreshold > currentThreshold 
      ? ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100 
      : 100;
    return { level, title: LEVEL_TITLES[level] || 'GOAT', progress, nextThreshold };
  }

  // Stage advancement with celebration
  async function advanceStage(deal: Deal) {
    if (!supabase) return;
    
    const stageOrder: DealStage[] = ['lead', 'demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won'];
    const currentIndex = stageOrder.indexOf(deal.stage);
    if (currentIndex === -1 || currentIndex >= stageOrder.length - 1) return;
    
    const nextStage = stageOrder[currentIndex + 1];
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('deals')
      .update({ 
        stage: nextStage, 
        last_contact: today,
        followup_count: (deal.followup_count || 0) + 1 
      })
      .eq('id', deal.id);

    if (!error) {
      // Celebration for closing
      if (nextStage === 'closed_won') {
        setCelebrationMessage(`🏆 DEAL CLOSED! +${STAGE_CONFIG.closed_won.points} points!`);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        setCelebrationMessage(`${STAGE_CONFIG[nextStage].emoji} ${STAGE_CONFIG[nextStage].label}! +${STAGE_CONFIG[nextStage].points} pts`);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }
      fetchDeals();
    }
  }

  // Log follow-up
  async function logFollowup(deal: Deal) {
    if (!supabase) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Set next follow-up to 2 days from now
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);
    const nextFollowup = nextDate.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('deals')
      .update({ 
        last_contact: today,
        next_followup: nextFollowup,
        followup_count: (deal.followup_count || 0) + 1,
        temperature: deal.temperature === 'cold' ? 'warm' : deal.temperature
      })
      .eq('id', deal.id);

    if (!error) {
      setCelebrationMessage(`📱 Follow-up logged! +10 pts`);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1500);
      fetchDeals();
    }
  }

  // Create deal
  async function createDeal() {
    if (!supabase) return;
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('deals')
      .insert([{ ...formData, last_contact: today, followup_count: 0 }]);

    if (error) {
      console.error('Error creating deal:', error);
      alert('Failed to create deal');
    } else {
      setCelebrationMessage(`🎯 New lead added! +${STAGE_CONFIG.lead.points} pts`);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      resetForm();
      fetchDeals();
    }
  }

  // Update deal
  async function updateDeal() {
    if (!supabase || !editingDeal) return;

    const { error } = await supabase
      .from('deals')
      .update(formData)
      .eq('id', editingDeal.id);

    if (error) {
      console.error('Error updating deal:', error);
      alert('Failed to update deal');
    } else {
      resetForm();
      fetchDeals();
    }
  }

  // Delete deal
  async function deleteDeal(id: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting deal:', error);
      alert('Failed to delete deal');
    } else {
      fetchDeals();
    }
    setDeleteConfirm({ show: false, id: null });
  }

  function resetForm() {
    setFormData({
      name: '',
      organization: '',
      contact_name: '',
      fraternity: '',
      phone: '',
      email: '',
      value: 299,
      stage: 'lead',
      temperature: 'cold',
      expected_close: '',
      next_followup: '',
      notes: '',
    });
    setEditingDeal(null);
    setShowModal(false);
  }

  function resetImportModal() {
    setShowImportModal(false);
    setImportMode('choose');
    setImportText('');
    setImportLoading(false);
    setImportError('');
    setParsedDeals([]);
    setImportSuccess(false);
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImportError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await parseContent({ image: base64 });
    };
    reader.onerror = () => {
      setImportError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }

  async function handleTextParse() {
    if (!importText.trim()) {
      setImportError('Please paste some text content');
      return;
    }
    await parseContent({ text: importText });
  }

  async function parseContent(payload: { image?: string; text?: string }) {
    setImportLoading(true);
    setImportError('');

    try {
      const response = await fetch('/api/parse-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse content');
      }

      if (!data.deals || data.deals.length === 0) {
        setImportError('No deals found in the content. Try a different image or text.');
        setImportLoading(false);
        return;
      }

      setParsedDeals(data.deals.map((d: ParsedDeal) => ({ 
        ...d, 
        fraternity: d.fraternity || '',
        stage: d.stage || 'lead',
        temperature: d.temperature || 'cold',
        expected_close: d.expected_close || '',
        selected: true 
      })));
      setImportMode('preview');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to parse content');
    } finally {
      setImportLoading(false);
    }
  }

  function toggleDealSelection(index: number) {
    setParsedDeals(prev =>
      prev.map((deal, i) =>
        i === index ? { ...deal, selected: !deal.selected } : deal
      )
    );
  }

  function toggleAllDeals(selected: boolean) {
    setParsedDeals(prev => prev.map(deal => ({ ...deal, selected })));
  }

  async function importSelectedDeals() {
    if (!supabase) return;

    const selectedDeals = parsedDeals.filter(d => d.selected);
    if (selectedDeals.length === 0) {
      setImportError('Please select at least one deal to import');
      return;
    }

    setImportLoading(true);
    setImportError('');
    const today = new Date().toISOString().split('T')[0];

    try {
      const dealsToInsert = selectedDeals.map(d => ({
        name: d.name,
        organization: d.organization || null,
        contact_name: d.contact_name || null,
        fraternity: d.fraternity || null,
        phone: d.phone || null,
        email: d.email || null,
        value: d.value || 299,
        stage: d.stage || 'lead',
        temperature: d.temperature || 'cold',
        expected_close: d.expected_close || null,
        last_contact: today,
        followup_count: 0,
        notes: d.notes || null,
      }));

      const { error } = await supabase.from('deals').insert(dealsToInsert);

      if (error) {
        throw error;
      }

      setImportSuccess(true);
      fetchDeals();

      setTimeout(() => {
        resetImportModal();
      }, 1500);
    } catch (error) {
      console.error('Error importing deals:', error);
      setImportError('Failed to import deals. Please try again.');
    } finally {
      setImportLoading(false);
    }
  }

  function openEditModal(deal: Deal) {
    setEditingDeal(deal);
    setFormData({
      name: deal.name,
      organization: deal.organization || '',
      contact_name: deal.contact_name || '',
      fraternity: deal.fraternity || '',
      phone: deal.phone || '',
      email: deal.email || '',
      value: deal.value,
      stage: deal.stage,
      temperature: deal.temperature || 'cold',
      expected_close: deal.expected_close || '',
      next_followup: deal.next_followup || '',
      notes: deal.notes || '',
    });
    setShowModal(true);
  }

  // Filter deals
  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.organization && d.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.fraternity && d.fraternity.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = filterStage === 'all' || d.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  // Group deals by stage for the pipeline view
  const dealsByStage = filteredDeals.reduce((acc, deal) => {
    if (!acc[deal.stage]) acc[deal.stage] = [];
    acc[deal.stage].push(deal);
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  // Calculate stats
  const pipelineValue = deals.filter(d => d.stage !== 'closed_lost').reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length;
  const needsFollowup = deals.filter(d => {
    if (['closed_won', 'closed_lost'].includes(d.stage)) return false;
    if (!d.next_followup) return true;
    return new Date(d.next_followup) <= new Date();
  }).length;

  const levelInfo = getLevel(stats.total_points);

  const stageOrder: DealStage[] = ['lead', 'demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won'];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  function getDaysUntil(date: string): string {
    if (!date) return '';
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff}d`;
  }

  return (
    <div className="module-page pipeline-gamified">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="celebration-toast">
          <span>{celebrationMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="module-header">
        <div className="module-header-content">
          <Link href="/nucleus" className="module-back">
            <ArrowLeft size={20} />
            Back to Nucleus
          </Link>
          <div className="module-title-row">
            <div className="module-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h1>Sales Pipeline</h1>
              <p>Track leads, book demos, close deals. Level up your sales game.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="module-main">
        {/* Gamification Stats Bar */}
        <div className="pipeline-stats-bar">
          <div className="pipeline-level-card">
            <div className="level-badge">
              <Trophy size={20} />
              <span className="level-number">Lvl {levelInfo.level}</span>
            </div>
            <div className="level-info">
              <span className="level-title">{levelInfo.title}</span>
              <div className="level-progress-bar">
                <div className="level-progress-fill" style={{ width: `${levelInfo.progress}%` }} />
              </div>
              <span className="level-points">{stats.total_points} / {levelInfo.nextThreshold} XP</span>
            </div>
          </div>

          <div className="pipeline-quick-stats">
            <div className="quick-stat">
              <Flame size={18} className="stat-icon streak" />
              <div>
                <span className="stat-value">{stats.current_streak}</span>
                <span className="stat-label">Day Streak</span>
              </div>
            </div>
            <div className="quick-stat">
              <Trophy size={18} className="stat-icon wins" />
              <div>
                <span className="stat-value">{stats.deals_closed}</span>
                <span className="stat-label">Deals Won</span>
              </div>
            </div>
            <div className="quick-stat">
              <Calendar size={18} className="stat-icon demos" />
              <div>
                <span className="stat-value">{stats.demos_booked}</span>
                <span className="stat-label">Demos</span>
              </div>
            </div>
            <div className="quick-stat urgent">
              <Clock size={18} className="stat-icon" />
              <div>
                <span className="stat-value">{needsFollowup}</span>
                <span className="stat-label">Need Follow-up</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Value Stats */}
        <div className="module-stats-row compact">
          <div className="module-stat">
            <span className="module-stat-value">{formatCurrency(pipelineValue)}</span>
            <span className="module-stat-label">Pipeline Value</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{activeDeals}</span>
            <span className="module-stat-label">Active Leads</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="module-actions">
            <select 
              className="stage-filter"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as DealStage | 'all')}
            >
              <option value="all">All Stages</option>
              {stageOrder.map(stage => (
                <option key={stage} value={stage}>{STAGE_CONFIG[stage].emoji} {STAGE_CONFIG[stage].label}</option>
              ))}
            </select>
            <button className="module-secondary-btn" onClick={() => setShowImportModal(true)}>
              <Upload size={16} />
              Import
            </button>
            <button className="module-primary-btn" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              Add Lead
            </button>
          </div>
        </div>

        {/* Pipeline Cards */}
        <div className="pipeline-cards">
          {loading ? (
            <div className="module-loading">Loading...</div>
          ) : filteredDeals.length > 0 ? (
            filteredDeals.map((deal) => (
              <div key={deal.id} className={`pipeline-card stage-${deal.stage}`}>
                <div className="pipeline-card-header">
                  <div className="pipeline-card-stage">
                    <span className="stage-emoji">{STAGE_CONFIG[deal.stage]?.emoji}</span>
                    <span className="stage-label">{STAGE_CONFIG[deal.stage]?.label}</span>
                  </div>
                  <span className={`temp-badge ${deal.temperature}`}>
                    {deal.temperature === 'hot' ? '🔥' : deal.temperature === 'warm' ? '☀️' : '❄️'}
                  </span>
                </div>
                
                <div className="pipeline-card-body">
                  <h3 className="pipeline-card-name">{deal.contact_name || deal.name}</h3>
                  <div className="pipeline-card-details">
                    <span className="detail-org">{deal.organization}</span>
                    {deal.fraternity && <span className="detail-frat">{deal.fraternity}</span>}
                  </div>
                  <div className="pipeline-card-value">{formatCurrency(deal.value)}</div>
                  
                  {deal.next_followup && (
                    <div className={`followup-reminder ${new Date(deal.next_followup) <= new Date() ? 'overdue' : ''}`}>
                      <Clock size={12} />
                      <span>Follow-up: {getDaysUntil(deal.next_followup)}</span>
                    </div>
                  )}
                </div>

                <div className="pipeline-card-actions">
                  {deal.phone && (
                    <a href={`sms:${deal.phone}`} className="action-btn text" title="Text">
                      <MessageSquare size={16} />
                    </a>
                  )}
                  <button className="action-btn followup" onClick={() => logFollowup(deal)} title="Log Follow-up">
                    <Phone size={16} />
                  </button>
                  {deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
                    <button className="action-btn advance" onClick={() => advanceStage(deal)} title="Advance Stage">
                      <ChevronRight size={16} />
                      <span>Next</span>
                    </button>
                  )}
                  <button className="action-btn edit" onClick={() => openEditModal(deal)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="action-btn delete" onClick={() => setDeleteConfirm({ show: true, id: deal.id })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="module-empty-state">
              <TrendingUp size={48} />
              <h3>No leads yet</h3>
              <p>Add your first lead to start tracking</p>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingDeal ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button className="module-modal-close" onClick={() => resetForm()}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <div className="form-row">
                <div className="module-form-group">
                  <label>Contact Name *</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value, name: e.target.value ? `${e.target.value} - Opportunity` : '' })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="module-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="555-123-4567"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="module-form-group">
                  <label>School/Organization</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="Ole Miss"
                  />
                </div>
                <div className="module-form-group">
                  <label>Fraternity</label>
                  <input
                    type="text"
                    value={formData.fraternity}
                    onChange={(e) => setFormData({ ...formData, fraternity: e.target.value })}
                    placeholder="Sigma Chi"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="module-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@olemiss.edu"
                  />
                </div>
                <div className="module-form-group">
                  <label>Value ($)</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    placeholder="299"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="module-form-group">
                  <label>Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
                  >
                    {stageOrder.map(stage => (
                      <option key={stage} value={stage}>{STAGE_CONFIG[stage].emoji} {STAGE_CONFIG[stage].label}</option>
                    ))}
                    <option value="closed_lost">❌ Closed Lost</option>
                  </select>
                </div>
                <div className="module-form-group">
                  <label>Temperature</label>
                  <select
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value as Deal['temperature'] })}
                  >
                    <option value="cold">❄️ Cold</option>
                    <option value="warm">☀️ Warm</option>
                    <option value="hot">🔥 Hot</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="module-form-group">
                  <label>Next Follow-up</label>
                  <input
                    type="date"
                    value={formData.next_followup}
                    onChange={(e) => setFormData({ ...formData, next_followup: e.target.value })}
                  />
                </div>
                <div className="module-form-group">
                  <label>Expected Close</label>
                  <input
                    type="date"
                    value={formData.expected_close}
                    onChange={(e) => setFormData({ ...formData, expected_close: e.target.value })}
                  />
                </div>
              </div>
              <div className="module-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="President, met at rush event..."
                  rows={3}
                />
              </div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => resetForm()}>
                Cancel
              </button>
              <button
                className="module-primary-btn"
                onClick={editingDeal ? updateDeal : createDeal}
                disabled={!formData.contact_name}
              >
                {editingDeal ? 'Update' : 'Add Lead'} {!editingDeal && `+${STAGE_CONFIG[formData.stage].points} pts`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="module-modal-overlay" onClick={() => resetImportModal()}>
          <div className="module-modal import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>
                {importMode === 'choose' && 'Import Leads'}
                {importMode === 'image' && 'Upload Image'}
                {importMode === 'text' && 'Paste Spreadsheet Data'}
                {importMode === 'preview' && 'Review Imported Leads'}
              </h2>
              <button className="module-modal-close" onClick={() => resetImportModal()}>
                <X size={20} />
              </button>
            </div>

            <div className="module-modal-body">
              {importSuccess && (
                <div className="import-success">
                  <div className="import-success-icon">
                    <Check size={32} />
                  </div>
                  <h3>Leads imported successfully!</h3>
                  <p>{parsedDeals.filter(d => d.selected).length} leads added to pipeline</p>
                </div>
              )}

              {importError && !importSuccess && (
                <div className="import-error">
                  <AlertCircle size={18} />
                  <span>{importError}</span>
                </div>
              )}

              {importMode === 'choose' && !importSuccess && (
                <div className="import-options">
                  <p className="import-description">
                    Import leads from an image (screenshot, business card, Attio export) or paste data from a spreadsheet.
                  </p>
                  <div className="import-option-cards">
                    <button 
                      className="import-option-card"
                      onClick={() => setImportMode('image')}
                    >
                      <div className="import-option-icon">
                        <Image size={28} />
                      </div>
                      <h4>Upload Image</h4>
                      <p>Screenshot, business card, or contact list</p>
                    </button>
                    <button 
                      className="import-option-card"
                      onClick={() => setImportMode('text')}
                    >
                      <div className="import-option-icon">
                        <FileSpreadsheet size={28} />
                      </div>
                      <h4>Paste from Spreadsheet</h4>
                      <p>Copy & paste from Sheets, Excel, or CSV</p>
                    </button>
                  </div>
                </div>
              )}

              {importMode === 'image' && !importSuccess && (
                <div className="import-upload">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div 
                    className="import-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {importLoading ? (
                      <>
                        <Loader2 size={40} className="spin" />
                        <p>Analyzing image with AI...</p>
                      </>
                    ) : (
                      <>
                        <Image size={40} />
                        <p>Click to upload or drag & drop</p>
                        <span>PNG, JPG, WEBP up to 10MB</span>
                      </>
                    )}
                  </div>
                  <button 
                    className="import-back-btn"
                    onClick={() => { setImportMode('choose'); setImportError(''); }}
                    disabled={importLoading}
                  >
                    ← Back to options
                  </button>
                </div>
              )}

              {importMode === 'text' && !importSuccess && (
                <div className="import-text">
                  <p className="import-text-hint">
                    Paste rows from your spreadsheet. Include headers if available (Name, School, Fraternity, Phone, Email, etc.)
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`Name\tSchool\tFraternity\tPhone\tEmail\nJohn Smith\tOle Miss\tSigma Chi\t555-1234\tjohn@olemiss.edu\nJane Doe\tAlabama\tKA\t555-5678\tjane@ua.edu`}
                    rows={10}
                    disabled={importLoading}
                  />
                  <div className="import-text-actions">
                    <button 
                      className="import-back-btn"
                      onClick={() => { setImportMode('choose'); setImportError(''); setImportText(''); }}
                      disabled={importLoading}
                    >
                      ← Back
                    </button>
                    <button
                      className="module-primary-btn"
                      onClick={handleTextParse}
                      disabled={importLoading || !importText.trim()}
                    >
                      {importLoading ? (
                        <>
                          <Loader2 size={16} className="spin" />
                          Parsing...
                        </>
                      ) : (
                        'Parse Data'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {importMode === 'preview' && !importSuccess && (
                <div className="import-preview">
                  <div className="import-preview-header">
                    <p>{parsedDeals.length} leads found</p>
                    <div className="import-preview-actions">
                      <button onClick={() => toggleAllDeals(true)}>Select All</button>
                      <button onClick={() => toggleAllDeals(false)}>Deselect All</button>
                    </div>
                  </div>
                  <div className="import-preview-list">
                    {parsedDeals.map((deal, index) => (
                      <div 
                        key={index}
                        className={`import-preview-item ${deal.selected ? 'selected' : ''}`}
                        onClick={() => toggleDealSelection(index)}
                      >
                        <div className="import-preview-checkbox">
                          {deal.selected && <Check size={14} />}
                        </div>
                        <div className="import-preview-content">
                          <div className="import-preview-name">{deal.contact_name || deal.name}</div>
                          <div className="import-preview-details">
                            {deal.organization && <span>{deal.organization}</span>}
                            {deal.fraternity && <span className="import-fraternity">{deal.fraternity}</span>}
                            {deal.phone && <span>{deal.phone}</span>}
                            {deal.email && <span>{deal.email}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {importMode === 'preview' && !importSuccess && (
              <div className="module-modal-footer">
                <button 
                  className="module-cancel-btn" 
                  onClick={() => { setImportMode('choose'); setParsedDeals([]); }}
                  disabled={importLoading}
                >
                  Start Over
                </button>
                <button
                  className="module-primary-btn"
                  onClick={importSelectedDeals}
                  disabled={importLoading || parsedDeals.filter(d => d.selected).length === 0}
                >
                  {importLoading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${parsedDeals.filter(d => d.selected).length} Leads`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Delete Lead"
        message="Are you sure you want to delete this lead from the pipeline?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirm.id && deleteDeal(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />
    </div>
  );
}
