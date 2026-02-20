'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, Plus, Search, Filter, X, Trash2, Edit2, Upload, Image, FileSpreadsheet, Loader2, Check, AlertCircle, Phone, MessageSquare, Calendar, Flame, Trophy, Zap, Star, ChevronRight, Clock, Mail } from 'lucide-react';
import Link from 'next/link';
import { supabase, Deal, DealStage, STAGE_CONFIG, MRR_LEVEL_THRESHOLDS, MRR_LEVEL_TITLES } from '@/lib/supabase';
import { getConferenceForDeal } from '@/lib/conference-map';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import ModalOverlay from '@/components/ModalOverlay';
import PipelineTreeView from './PipelineTreeView';
import LeadDetailPanel from './LeadDetailPanel';
import FollowUpPicker from './FollowUpPicker';

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
  const { showToast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [filterStage, setFilterStage] = useState<DealStage | 'all'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [filterConference, setFilterConference] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Lead detail panel
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  // Inline follow-up picker
  const [followUpDealId, setFollowUpDealId] = useState<string | null>(null);
  // Advancing stage — track which deal ID is showing success state
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  // When true, the edit modal auto-focuses the phone input
  const [focusPhoneOnEdit, setFocusPhoneOnEdit] = useState(false);
  // Mobile detection for call behavior
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    contact_name: '',
    fraternity: '',
    phone: '',
    email: '',
    value: 299,
    conference: '',
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

  // Detect mobile for call behavior
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobileDevice(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobileDevice(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

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

  function getLevelMrr(mrrDollars: number): { level: number; title: string; progress: number; nextThreshold: number } {
    let level = 0;
    for (let i = 0; i < MRR_LEVEL_THRESHOLDS.length; i++) {
      if (mrrDollars >= MRR_LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    const currentThreshold = level === 0 ? 0 : MRR_LEVEL_THRESHOLDS[level - 1];
    const nextThreshold = MRR_LEVEL_THRESHOLDS[level] ?? MRR_LEVEL_THRESHOLDS[MRR_LEVEL_THRESHOLDS.length - 1];
    const progress = nextThreshold > currentThreshold
      ? ((mrrDollars - currentThreshold) / (nextThreshold - currentThreshold)) * 100
      : 100;
    return { level, title: MRR_LEVEL_TITLES[level] ?? 'GOAT', progress, nextThreshold };
  }

  // Stage advancement with optimistic UI + toast
  async function advanceStage(deal: Deal) {
    if (!supabase) return;
    
    const stageOrder: DealStage[] = ['lead', 'demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won'];
    const currentIndex = stageOrder.indexOf(deal.stage);
    if (currentIndex === -1 || currentIndex >= stageOrder.length - 1) return;
    
    const nextStage = stageOrder[currentIndex + 1];
    const today = new Date().toISOString().split('T')[0];

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: nextStage } : d));
    setAdvancingId(deal.id);
    setTimeout(() => setAdvancingId(null), 1500);
    
    const { error } = await supabase
      .from('deals')
      .update({ 
        stage: nextStage, 
        last_contact: today,
        followup_count: (deal.followup_count || 0) + 1 
      })
      .eq('id', deal.id);

    if (error) {
      // Revert optimistic update
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: deal.stage } : d));
      showToast('Failed to update stage. Please try again.', 'error');
    } else {
      showToast(`Stage updated to ${STAGE_CONFIG[nextStage]?.label}`, 'success');
      if (nextStage === 'closed_won') {
        setCelebrationMessage(`🏆 DEAL CLOSED! +${STAGE_CONFIG.closed_won.points} points!`);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
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
    const insertPayload = {
      ...formData,
      conference: formData.conference?.trim() || null,
      expected_close: formData.expected_close?.trim() || null,
      next_followup: formData.next_followup?.trim() || null,
      last_contact: today,
      followup_count: 0,
    };
    const { error } = await supabase
      .from('deals')
      .insert([insertPayload]);

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

    // Build update payload: only columns that exist on deals, and send null for empty date strings
    const updatePayload = {
      name: formData.name,
      organization: formData.organization || null,
      contact_name: formData.contact_name || null,
      fraternity: formData.fraternity || null,
      phone: formData.phone || null,
      email: formData.email || null,
      value: formData.value,
      conference: formData.conference?.trim() || null,
      stage: formData.stage,
      temperature: formData.temperature,
      expected_close: formData.expected_close?.trim() || null,
      next_followup: formData.next_followup?.trim() || null,
      notes: formData.notes || null,
    };

    const { error } = await supabase
      .from('deals')
      .update(updatePayload)
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
      conference: '',
      stage: 'lead',
      temperature: 'cold',
      expected_close: '',
      next_followup: '',
      notes: '',
    });
    setEditingDeal(null);
    setShowModal(false);
    setFocusPhoneOnEdit(false);
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

  function convertImageToJpeg(file: File, maxDimension = 2048): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not create canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpegDataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = objectUrl;
    });
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImportError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    try {
      const base64 = await convertImageToJpeg(file);
      await parseContent({ image: base64 });
    } catch {
      setImportError('Failed to read image file. Please try a different image.');
    }
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
      conference: deal.conference || '',
      stage: deal.stage,
      temperature: deal.temperature || 'cold',
      expected_close: deal.expected_close || '',
      next_followup: deal.next_followup || '',
      notes: deal.notes || '',
    });
    setShowModal(true);
  }

  // Full stage order for sorting (lead → ... → closed_won → closed_lost → hold_off)
  const fullStageOrder: DealStage[] = ['lead', 'demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won', 'closed_lost', 'hold_off'];

  // Filter deals
  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.organization && d.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.fraternity && d.fraternity.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = filterStage === 'all' || d.stage === filterStage;
    const matchesSchool = !filterSchool || (d.organization && d.organization.trim().toLowerCase() === filterSchool.toLowerCase());
    return matchesSearch && matchesStage && matchesSchool;
  });

  // Sort by pipeline order (new lead first, then demo booked, etc.), then by contact name
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    const stageA = fullStageOrder.indexOf(a.stage);
    const stageB = fullStageOrder.indexOf(b.stage);
    if (stageA !== stageB) return stageA - stageB;
    const nameA = (a.contact_name || a.name || '').toLowerCase();
    const nameB = (b.contact_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Unique schools for filter dropdown (from all deals)
  const uniqueSchools: string[] = Array.from(
    new Set(deals.map(d => d.organization?.trim()).filter((s): s is string => Boolean(s)))
  ).sort((a, b) => a.localeCompare(b));

  // Unique conferences for tree filter (derived from deals)
  const uniqueConferences: string[] = Array.from(new Set(deals.map(d => getConferenceForDeal(d)))).sort((a, b) => a.localeCompare(b));

  // Group deals by stage for the pipeline view (used elsewhere if needed)
  const dealsByStage = filteredDeals.reduce((acc, deal) => {
    if (!acc[deal.stage]) acc[deal.stage] = [];
    acc[deal.stage].push(deal);
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  // Calculate stats
  const pipelineValue = deals.filter(d => !['closed_lost', 'hold_off'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = deals.filter(d => !['closed_won', 'closed_lost', 'hold_off'].includes(d.stage)).length;
  const needsFollowup = deals.filter(d => {
    if (['closed_won', 'closed_lost', 'hold_off'].includes(d.stage)) return false;
    if (!d.next_followup) return true;
    return new Date(d.next_followup) <= new Date();
  }).length;

  // ARR/MRR from closed-won deals (treat deal value as annual)
  const arrFromSold = deals.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const mrrFromSold = arrFromSold / 12;
  const levelInfo = getLevelMrr(mrrFromSold);

  const stageOrder: DealStage[] = ['lead', 'demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won'];

  // Active filter count for mobile badge
  const activeFilterCount = [
    filterStage !== 'all' ? 1 : 0,
    filterSchool ? 1 : 0,
    filterConference ? 1 : 0,
    filterDateFrom ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function clearAllFilters() {
    setFilterStage('all');
    setFilterSchool('');
    setFilterConference('');
    setFilterDateFrom('');
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  function getDaysUntil(date: string): string {
    if (!date) return '';
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `in ${diff}d`;
  }

  function getFollowUpStatus(date: string): 'overdue' | 'today' | 'future' | 'none' {
    if (!date) return 'none';
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    return 'future';
  }

  // Set follow-up from inline picker
  async function setFollowUpDate(dealId: string, date: string | null) {
    if (!supabase) return;
    const { error } = await supabase
      .from('deals')
      .update({ next_followup: date })
      .eq('id', dealId);

    setFollowUpDealId(null);
    if (error) {
      showToast('Failed to save. Please try again.', 'error');
    } else {
      showToast(date ? `Follow-up set for ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Follow-up cleared', date ? 'success' : 'info');
      fetchDeals();
    }
  }

  // Open detail panel
  function openDetail(deal: Deal) {
    setDetailDeal(deal);
  }

  function isValidPhone(phone: string | null | undefined): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/[\s\-.()+]/g, '');
    return /^1?\d{10,14}$/.test(cleaned);
  }

  function handleCallClick(deal: Deal) {
    if (!isValidPhone(deal.phone)) return;
    if (isMobileDevice) {
      window.location.href = `tel:${deal.phone}`;
    } else {
      navigator.clipboard.writeText(deal.phone!).then(() => {
        showToast(`Copied: ${deal.phone}`, 'info');
      });
    }
  }

  function openEditModalWithPhoneFocus(deal: Deal) {
    setFocusPhoneOnEdit(true);
    openEditModal(deal);
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
          <div className="cc-breadcrumb">
            <Link href="/workspace">Dashboard</Link>
            <span>/</span>
            Sales Pipeline
          </div>
          <div className="module-title-row">
            <div className="module-icon">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1>Sales Pipeline</h1>
              <p>Track leads, book demos, close deals.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="module-main">
        {/* Dashboard: revenue, MRR level, and activity in one section */}
        <div className="pipeline-dashboard">
          <div className="pipeline-dashboard-metrics">
            <div className="pipeline-metric">
              <span className="pipeline-metric-value">{formatCurrency(pipelineValue)}</span>
              <span className="pipeline-metric-label">Pipeline Value</span>
            </div>
            <div className="pipeline-metric">
              <span className="pipeline-metric-value">{activeDeals}</span>
              <span className="pipeline-metric-label">Active Leads</span>
            </div>
            <div className="pipeline-metric">
              <span className="pipeline-metric-value">{formatCurrency(arrFromSold)}</span>
              <span className="pipeline-metric-label">ARR (sold)</span>
            </div>
            <div className="pipeline-metric">
              <span className="pipeline-metric-value">{formatCurrency(mrrFromSold)}</span>
              <span className="pipeline-metric-label">MRR (sold)</span>
            </div>
          </div>

          <div className="pipeline-level-card">
            <div className="level-badge">
              <Trophy size={20} />
              <span className="level-number">Lvl {levelInfo.level}</span>
            </div>
            <div className="level-info">
              <span className="level-title">{levelInfo.title}</span>
              <div className="level-progress-bar">
                <div className="level-progress-fill" style={{ width: `${Math.min(100, levelInfo.progress)}%` }} />
              </div>
              <span className="level-points">{formatCurrency(mrrFromSold)} / {formatCurrency(levelInfo.nextThreshold)} MRR</span>
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
            {searchQuery && (
              <button
                type="button"
                className="module-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="module-actions">
            <div className="pipeline-view-toggle">
              <button
                type="button"
                className={viewMode === 'list' ? 'module-secondary-btn active' : 'module-secondary-btn'}
                onClick={() => setViewMode('list')}
              >
                List View
              </button>
              <button
                type="button"
                className={viewMode === 'tree' ? 'module-secondary-btn active' : 'module-secondary-btn'}
                onClick={() => setViewMode('tree')}
              >
                Tree View
              </button>
            </div>

            {/* Desktop filters (hidden on mobile via CSS) */}
            <div className="pipeline-desktop-filters">
              <select 
                className="stage-filter"
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as DealStage | 'all')}
              >
                <option value="all">All Stages</option>
                {fullStageOrder.map(stage => (
                  <option key={stage} value={stage}>{STAGE_CONFIG[stage].emoji} {STAGE_CONFIG[stage].label}</option>
                ))}
              </select>
              <select
                className="stage-filter pipeline-filter-school"
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value)}
              >
                <option value="">All Schools</option>
                {uniqueSchools.map(school => (
                  <option key={school} value={school || ''}>{school}</option>
                ))}
              </select>
              {viewMode === 'tree' && (
                <>
                  <select
                    className="stage-filter pipeline-filter-school"
                    value={filterConference}
                    onChange={(e) => setFilterConference(e.target.value)}
                  >
                    <option value="">All Conferences</option>
                    {uniqueConferences.map(conf => (
                      <option key={conf} value={conf}>{conf}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="stage-filter pipeline-filter-date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    title="Date added from"
                  />
                </>
              )}
            </div>

            {/* Mobile filter button (shown on mobile via CSS) */}
            <button
              type="button"
              className="module-secondary-btn pipeline-filters-btn"
              onClick={() => setShowFilterSheet(true)}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && <span className="pipeline-filters-badge">{activeFilterCount}</span>}
            </button>

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

        {/* Mobile Filter Sheet */}
        <div
          className={`pipeline-filter-sheet-backdrop ${showFilterSheet ? 'open' : ''}`}
          onClick={() => setShowFilterSheet(false)}
        />
        <div className={`pipeline-filter-sheet ${showFilterSheet ? 'open' : ''}`}>
          <div className="pipeline-filter-sheet-handle" />
          <div className="pipeline-filter-sheet-header">
            <span className="pipeline-filter-sheet-title">Filters</span>
            <button
              type="button"
              className="module-search-clear"
              onClick={() => setShowFilterSheet(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="pipeline-filter-sheet-body">
            <div className="pipeline-filter-sheet-group">
              <label>Stage</label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as DealStage | 'all')}
              >
                <option value="all">All Stages</option>
                {fullStageOrder.map(stage => (
                  <option key={stage} value={stage}>{STAGE_CONFIG[stage].emoji} {STAGE_CONFIG[stage].label}</option>
                ))}
              </select>
            </div>
            <div className="pipeline-filter-sheet-group">
              <label>School</label>
              <select
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value)}
              >
                <option value="">All Schools</option>
                {uniqueSchools.map(school => (
                  <option key={school} value={school || ''}>{school}</option>
                ))}
              </select>
            </div>
            {viewMode === 'tree' && (
              <>
                <div className="pipeline-filter-sheet-group">
                  <label>Conference</label>
                  <select
                    value={filterConference}
                    onChange={(e) => setFilterConference(e.target.value)}
                  >
                    <option value="">All Conferences</option>
                    {uniqueConferences.map(conf => (
                      <option key={conf} value={conf}>{conf}</option>
                    ))}
                  </select>
                </div>
                <div className="pipeline-filter-sheet-group">
                  <label>Date From</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '0.9rem' }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="pipeline-filter-sheet-footer">
            <button
              type="button"
              className="pipeline-filter-sheet-clear"
              onClick={() => { clearAllFilters(); setShowFilterSheet(false); }}
            >
              Clear All
            </button>
            <button
              type="button"
              className="pipeline-filter-sheet-apply"
              onClick={() => setShowFilterSheet(false)}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Pipeline Table (desktop) or Mobile Cards */}
        {viewMode === 'list' && (
          <>
            {/* Desktop table — hidden on mobile via CSS */}
            <div className="pipeline-table-wrap">
              {loading ? (
                <div className="module-loading">Loading...</div>
              ) : sortedDeals.length > 0 ? (
                <table className="pipeline-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Contact</th>
                      <th>School / Org</th>
                      <th>Fraternity</th>
                      <th className="pipeline-table-value">Value</th>
                      <th>Follow-up</th>
                      <th className="pipeline-table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeals.map((deal) => {
                      const fupStatus = getFollowUpStatus(deal.next_followup);
                      const isAdvancing = advancingId === deal.id;
                      return (
                      <tr key={deal.id} className={`stage-${deal.stage} ${fupStatus === 'overdue' ? 'row-overdue' : ''}`}>
                        <td>
                          <div className="pipeline-table-stage">
                            <span className="stage-emoji">{STAGE_CONFIG[deal.stage]?.emoji}</span>
                            <span className="stage-label">{STAGE_CONFIG[deal.stage]?.label}</span>
                          </div>
                        </td>
                        <td>
                          <div className="pipeline-table-contact">
                            <span className="pipeline-card-name" onClick={() => openDetail(deal)} role="button" tabIndex={0}>{deal.contact_name || deal.name}</span>
                            <span className={`temp-badge ${deal.temperature}`}>
                              {deal.temperature === 'hot' ? '🔥' : deal.temperature === 'warm' ? '☀️' : '❄️'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="detail-org">{deal.organization || '—'}</span>
                        </td>
                        <td>
                          {deal.fraternity ? (
                            <span className="detail-frat">{deal.fraternity}</span>
                          ) : (
                            <span className="detail-org">—</span>
                          )}
                        </td>
                        <td className="pipeline-table-value">
                          <span className="pipeline-card-value">{formatCurrency(deal.value)}</span>
                        </td>
                        <td style={{ position: 'relative' }}>
                          <div
                            className={`followup-reminder followup-clickable ${fupStatus}`}
                            onClick={() => setFollowUpDealId(followUpDealId === deal.id ? null : deal.id)}
                            role="button"
                            tabIndex={0}
                          >
                            {deal.next_followup ? (
                              <>
                                <Clock size={12} />
                                <span>{getDaysUntil(deal.next_followup)}</span>
                              </>
                            ) : (
                              <span className="detail-org">—</span>
                            )}
                          </div>
                          {followUpDealId === deal.id && (
                            <FollowUpPicker
                              currentDate={deal.next_followup}
                              onSelect={(date) => setFollowUpDate(deal.id, date)}
                              onClose={() => setFollowUpDealId(null)}
                              isMobile={false}
                            />
                          )}
                        </td>
                        <td className="pipeline-table-actions">
                          <div className="pipeline-card-actions">
                            {isValidPhone(deal.phone) && (
                              <a href={`tel:${deal.phone}`} className="action-btn followup" title="Call">
                                <Phone size={16} />
                              </a>
                            )}
                            {isValidPhone(deal.phone) ? (
                              <a href={`sms:${deal.phone}`} className="action-btn text" title="Text">
                                <MessageSquare size={16} />
                              </a>
                            ) : (
                              <button
                                className="action-btn message-no-phone"
                                onClick={() => openEditModalWithPhoneFocus(deal)}
                                title="Add phone number to enable calling & messaging"
                              >
                                <span className="message-no-phone-wrap">
                                  <MessageSquare size={16} />
                                  <Plus size={10} className="message-plus-badge" />
                                </span>
                              </button>
                            )}
                            {!['closed_won', 'closed_lost', 'hold_off'].includes(deal.stage) ? (
                              <button
                                className={`action-btn advance ${isAdvancing ? 'advance-success' : ''}`}
                                onClick={() => advanceStage(deal)}
                                title="Advance Stage"
                              >
                                {isAdvancing ? <Check size={16} /> : <ChevronRight size={16} />}
                                <span>{isAdvancing ? 'Done' : 'Next'}</span>
                              </button>
                            ) : (
                              <button className="action-btn" disabled title="Final stage">
                                <Check size={16} />
                                <span>Won</span>
                              </button>
                            )}
                            <button className="action-btn edit" onClick={() => openEditModal(deal)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="action-btn delete" onClick={() => setDeleteConfirm({ show: true, id: deal.id })}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="module-empty-state">
                  <TrendingUp size={48} />
                  <h3>No leads yet</h3>
                  <p>Add your first lead to start tracking</p>
                </div>
              )}
            </div>

            {/* Mobile card list — shown on mobile via CSS */}
            <div className="pipeline-mobile-list">
              {loading ? (
                <div className="module-loading">Loading...</div>
              ) : sortedDeals.length > 0 ? (
                sortedDeals.map((deal) => {
                  const stageColor = STAGE_CONFIG[deal.stage]?.color || '#6b7280';
                  const fupStatus = getFollowUpStatus(deal.next_followup);
                  const isAdvancing = advancingId === deal.id;
                  return (
                    <div key={deal.id} className={`pipeline-mobile-card ${fupStatus === 'overdue' ? 'mobile-card-overdue' : ''}`} onClick={() => openDetail(deal)}>
                      <div className="pipeline-mobile-card-accent" style={{ background: fupStatus === 'overdue' ? '#ef4444' : stageColor }} />
                      <div className="pipeline-mobile-card-body">
                        {/* Row 1: Name + Value */}
                        <div className="pipeline-mobile-card-top">
                          <span className="pipeline-mobile-card-name">{deal.contact_name || deal.name}</span>
                          <span className="pipeline-mobile-card-value">{formatCurrency(deal.value)}</span>
                        </div>
                        {/* Row 2: Meta + Actions */}
                        <div className="pipeline-mobile-card-bottom">
                          <div className="pipeline-mobile-card-mid">
                            {deal.organization && <span className="pipeline-mobile-card-org">{deal.organization}</span>}
                            {deal.organization && deal.fraternity && <span className="pipeline-mobile-card-dot">·</span>}
                            {deal.fraternity && <span className="pipeline-mobile-card-frat">{deal.fraternity}</span>}
                            <span className="pipeline-mobile-card-stage" style={{ backgroundColor: `${stageColor}15`, color: stageColor }}>
                              {STAGE_CONFIG[deal.stage]?.label}
                            </span>
                          </div>
                          <div className="pipeline-mobile-card-actions" onClick={e => e.stopPropagation()}>
                            {isValidPhone(deal.phone) && (
                              <a href={`tel:${deal.phone}`} className="action-btn followup-btn" title="Call" onClick={e => e.stopPropagation()}>
                                <Phone size={14} />
                              </a>
                            )}
                            {isValidPhone(deal.phone) ? (
                              <a href={`sms:${deal.phone}`} className="action-btn text-btn" title="Text" onClick={e => e.stopPropagation()}>
                                <MessageSquare size={14} />
                              </a>
                            ) : (
                              <button
                                className="action-btn message-no-phone-mobile"
                                onClick={(e) => { e.stopPropagation(); openEditModalWithPhoneFocus(deal); }}
                                title="Add phone number"
                              >
                                <span className="message-no-phone-wrap">
                                  <MessageSquare size={14} />
                                  <Plus size={8} className="message-plus-badge" />
                                </span>
                              </button>
                            )}
                            {!['closed_won', 'closed_lost', 'hold_off'].includes(deal.stage) && (
                              <button
                                className={`action-btn advance ${isAdvancing ? 'advance-success' : ''}`}
                                onClick={(e) => { e.stopPropagation(); advanceStage(deal); }}
                                title="Advance Stage"
                              >
                                {isAdvancing ? <Check size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="module-empty-state">
                  <TrendingUp size={48} />
                  <h3>No leads yet</h3>
                  <p>Add your first lead to start tracking</p>
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'tree' && (
          <PipelineTreeView
            deals={deals}
            onEditDeal={openEditModal}
            onCallDeal={handleCallClick}
            onStageChanged={fetchDeals}
            filterStage={filterStage}
            filterConference={filterConference}
            filterSchool={filterSchool}
            filterDateFrom={filterDateFrom}
            searchQuery={searchQuery}
          />
        )}
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => resetForm()}>
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
                    autoFocus={focusPhoneOnEdit}
                    id="deal-phone-input"
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
                  <label>Fraternity / Chapter</label>
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
                  <label>Conference</label>
                  <select
                    value={formData.conference}
                    onChange={(e) => setFormData({ ...formData, conference: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="SEC">SEC</option>
                    <option value="Big 12">Big 12</option>
                    <option value="ACC">ACC</option>
                    <option value="Big Ten">Big Ten</option>
                    <option value="Pac-12">Pac-12</option>
                    <option value="Non-SEC">Non-SEC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
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
                    <option value="hold_off">⏸️ Hold Off</option>
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
        </ModalOverlay>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => resetImportModal()}>
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
        </ModalOverlay>
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

      {/* Lead Detail Panel (desktop slide-over / mobile full-screen sheet) */}
      {detailDeal && (
        <LeadDetailPanel
          deal={detailDeal}
          onClose={() => setDetailDeal(null)}
          onUpdated={() => {
            fetchDeals();
            // Refresh the detail deal with latest data
            if (detailDeal) {
              supabase?.from('deals').select('*').eq('id', detailDeal.id).single().then(({ data }) => {
                if (data) setDetailDeal(data);
              });
            }
          }}
          onDelete={(id) => { deleteDeal(id); setDetailDeal(null); }}
        />
      )}
    </div>
  );
}
