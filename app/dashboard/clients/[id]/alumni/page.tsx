'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Download, Search, X, Trash2, ChevronLeft, ChevronRight,
  Users, Phone, Mail, UserCheck, FileSpreadsheet, AlertCircle, CheckCircle2,
  ChevronDown, Filter, Plus, Settings, Smartphone, Send, Pause, Play,
  MessageSquare, Calendar, Zap, Edit2, ToggleLeft, ToggleRight, Eye,
} from 'lucide-react';
import {
  supabase,
  AlumniContact,
  OutreachStatus,
  OUTREACH_STATUS_CONFIG,
  ChapterWithOnboarding,
  SendingLine,
  OutreachCampaign,
} from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';
import ModalOverlay from '@/components/ModalOverlay';

type SortField = 'first_name' | 'last_name' | 'phone_primary' | 'email' | 'year' | 'outreach_status' | 'created_at';
type SortDir = 'asc' | 'desc';
type TabView = 'contacts' | 'campaigns' | 'lines';

interface AlumniStats { total: number; have_phone: number; have_email: number; contacted: number; }
interface ImportResult { imported: number; skipped: number; duplicates: number; dual_phone_count: number; errors: { row: number; message: string }[]; }
interface LineProgress { line_id: string; line: SendingLine; contacts_assigned: number; is_paused: boolean; sent: number; failed: number; total_days: number; current_day: number; }
interface CampaignDetail { campaign: OutreachCampaign; total_sent: number; total_failed: number; line_progress: LineProgress[]; }
interface QueueItem { id: string; contact_id: string; send_phone: string; queue_position: number; scheduled_day: number; status: string; contact?: { first_name: string; last_name: string; phone_primary: string; phone_secondary: string; }; }

function formatPhone(e164: string | null): string {
  if (!e164) return '—';
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return e164;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  const cfg = OUTREACH_STATUS_CONFIG[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { color: string; bg: string }> = {
    draft: { color: '#6b7280', bg: '#f3f4f6' },
    active: { color: '#16a34a', bg: '#dcfce7' },
    paused: { color: '#d97706', bg: '#fef3c7' },
    completed: { color: '#2563eb', bg: '#dbeafe' },
  };
  const c = colors[status] || colors.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: c.color, backgroundColor: c.bg, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

export default function AlumniPage() {
  const params = useParams();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<ChapterWithOnboarding | null>(null);
  const [contacts, setContacts] = useState<AlumniContact[]>([]);
  const [stats, setStats] = useState<AlumniStats>({ total: 0, have_phone: 0, have_email: 0, contacted: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabView>('contacts');

  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<OutreachStatus>('not_contacted');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Sending lines
  const [lines, setLines] = useState<SendingLine[]>([]);
  const [showLineModal, setShowLineModal] = useState(false);
  const [editingLine, setEditingLine] = useState<SendingLine | null>(null);
  const [lineForm, setLineForm] = useState({ label: '', phone_number: '', daily_limit: 50 });

  // Campaigns
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: '', message_template: 'Hey {{first_name}}, ', use_secondary_phone: false });
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Campaign detail
  const [viewingCampaign, setViewingCampaign] = useState<string | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [todayQueue, setTodayQueue] = useState<Record<string, QueueItem[]>>({});

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const fetchChapter = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('chapters').select('*').eq('id', chapterId).single();
    if (data) setChapter(data);
  }, [chapterId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/alumni/stats?chapter_id=${chapterId}`);
      const json = await res.json();
      if (json.data) setStats(json.data);
    } catch (err) { console.error('Failed to fetch stats:', err); }
  }, [chapterId]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ chapter_id: chapterId, page: String(page), limit: String(limit), sort_by: sortBy, sort_dir: sortDir });
      if (search) p.set('search', search);
      if (filterStatus !== 'all') p.set('status', filterStatus);
      const res = await fetch(`/api/alumni?${p}`);
      const json = await res.json();
      if (json.data) { setContacts(json.data.contacts); setTotal(json.data.total); }
    } catch (err) { console.error('Failed to fetch contacts:', err); }
    finally { setLoading(false); }
  }, [chapterId, page, search, filterStatus, sortBy, sortDir]);

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch(`/api/sending-lines?chapter_id=${chapterId}`);
      const json = await res.json();
      if (json.data) setLines(json.data);
    } catch (err) { console.error('Failed to fetch lines:', err); }
  }, [chapterId]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns?chapter_id=${chapterId}`);
      const json = await res.json();
      if (json.data) setCampaigns(json.data);
    } catch (err) { console.error('Failed to fetch campaigns:', err); }
  }, [chapterId]);

  useEffect(() => { fetchChapter(); fetchStats(); fetchLines(); fetchCampaigns(); }, [fetchChapter, fetchStats, fetchLines, fetchCampaigns]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  // ── CSV Preview ──
  function handleFileSelect(file: File) {
    setImportFile(file); setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lns = text.split('\n').filter(l => l.trim());
      const preview = lns.slice(0, 6).map(line => {
        const cells: string[] = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQ) { if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
          else { if (ch === '"') inQ = true; else if (ch === ',') { cells.push(cur.trim()); cur = ''; } else if (ch === '\r') continue; else cur += ch; }
        }
        cells.push(cur.trim()); return cells;
      });
      setImportPreview(preview);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!importFile) return; setImporting(true);
    try {
      const fd = new FormData(); fd.append('file', importFile); fd.append('chapter_id', chapterId);
      const res = await fetch('/api/alumni/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.data) { setImportResult(json.data); fetchContacts(); fetchStats(); }
      else if (json.error) setImportResult({ imported: 0, skipped: 0, duplicates: 0, dual_phone_count: 0, errors: [{ row: 0, message: json.error.message }] });
    } catch { setImportResult({ imported: 0, skipped: 0, duplicates: 0, dual_phone_count: 0, errors: [{ row: 0, message: 'Network error' }] }); }
    finally { setImporting(false); }
  }

  function resetImportModal() { setShowImportModal(false); setImportFile(null); setImportPreview(null); setImportResult(null); setDragOver(false); }

  // ── Bulk ──
  function toggleSelectAll() { setSelected(selected.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id))); }
  function toggleSelect(id: string) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function bulkUpdateStatus() {
    try { await fetch('/api/alumni', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selected), updates: { outreach_status: bulkStatus } }) }); setSelected(new Set()); setShowStatusModal(false); fetchContacts(); fetchStats(); } catch (err) { console.error('Bulk update failed:', err); }
  }
  async function bulkDelete() {
    try { await fetch('/api/alumni', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selected) }) }); setSelected(new Set()); setDeleteConfirm(false); fetchContacts(); fetchStats(); } catch (err) { console.error('Bulk delete failed:', err); }
  }

  function exportCSV() {
    const toExport = selected.size > 0 ? contacts.filter(c => selected.has(c.id)) : contacts;
    const header = 'First Name,Last Name,Phone,Phone 2,Email,Year,Status,Date Added';
    const rows = toExport.map(c => [c.first_name, c.last_name, c.phone_primary || '', c.phone_secondary || '', c.email || '', c.year || '', c.outreach_status, formatDate(c.created_at)].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `alumni-${chapter?.chapter_name || chapterId}-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function handleSort(field: SortField) { if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(field); setSortDir('asc'); } }

  // ── Sending Lines ──
  async function saveLine() {
    const method = editingLine ? 'PATCH' : 'POST';
    const body = editingLine ? { id: editingLine.id, ...lineForm } : { chapter_id: chapterId, ...lineForm };
    await fetch('/api/sending-lines', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowLineModal(false); setEditingLine(null); setLineForm({ label: '', phone_number: '', daily_limit: 50 }); fetchLines();
  }
  async function toggleLine(line: SendingLine) {
    await fetch('/api/sending-lines', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: line.id, is_active: !line.is_active }) });
    fetchLines();
  }
  async function deleteLine(id: string) {
    await fetch('/api/sending-lines', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchLines();
  }

  // ── Campaign ──
  const activeLines = lines.filter(l => l.is_active);
  const selectedWithPhone = contacts.filter(c => selected.has(c.id) && c.phone_primary);
  const campaignContactCount = selected.size > 0 ? selectedWithPhone.length : stats.have_phone;

  function getCampaignPreview() {
    if (activeLines.length === 0) return [];
    const count = campaignContactCount;
    const lineCount = activeLines.length;
    const chunkSize = Math.floor(count / lineCount);
    const remainder = count % lineCount;
    return activeLines.map((line, i) => {
      const assigned = chunkSize + (i === lineCount - 1 ? remainder : 0);
      const days = Math.ceil(assigned / line.daily_limit);
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + days);
      return { line, assigned, days, completionDate };
    });
  }

  async function createCampaign() {
    setCreatingCampaign(true);
    try {
      let contactIds: string[];
      if (selected.size > 0) {
        contactIds = Array.from(selected);
      } else {
        if (!supabase) return;
        const { data } = await supabase.from('alumni_contacts').select('id').eq('chapter_id', chapterId).not('phone_primary', 'is', null);
        contactIds = (data || []).map(c => c.id);
      }
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId, name: campaignForm.name, message_template: campaignForm.message_template, use_secondary_phone: campaignForm.use_secondary_phone, contact_ids: contactIds }),
      });
      const json = await res.json();
      if (json.data) {
        setShowCampaignModal(false); setCampaignForm({ name: '', message_template: 'Hey {{first_name}}, ', use_secondary_phone: false }); setSelected(new Set()); fetchCampaigns();
        setActiveTab('campaigns'); setViewingCampaign(json.data.id);
      }
    } catch (err) { console.error('Failed to create campaign:', err); }
    finally { setCreatingCampaign(false); }
  }

  async function fetchCampaignDetail(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const json = await res.json();
      if (json.data) setCampaignDetail(json.data);
    } catch (err) { console.error('Failed to fetch campaign detail:', err); }
  }

  async function fetchTodayQueue(campaignId: string, lineId: string) {
    try {
      const res = await fetch(`/api/outreach/queue?campaign_id=${campaignId}&line_id=${lineId}`);
      const json = await res.json();
      if (json.data) setTodayQueue(prev => ({ ...prev, [lineId]: json.data.queue }));
    } catch (err) { console.error('Failed to fetch queue:', err); }
  }

  async function toggleCampaignStatus(campaign: OutreachCampaign) {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: campaign.id, status: newStatus }) });
    fetchCampaigns(); if (viewingCampaign === campaign.id) fetchCampaignDetail(campaign.id);
  }

  async function toggleLinePause(campaignId: string, lineId: string, isPaused: boolean) {
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: campaignId, line_id: lineId, is_paused: !isPaused }) });
    fetchCampaignDetail(campaignId);
  }

  useEffect(() => { if (viewingCampaign) fetchCampaignDetail(viewingCampaign); }, [viewingCampaign]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {sortBy === field && <ChevronDown size={14} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />}
      </span>
    </th>
  );

  const preview = getCampaignPreview();
  const maxDays = preview.length > 0 ? Math.max(...preview.map(p => p.days)) : 0;

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-header-content">
          <Link href="/nucleus/customer-success" className="module-back"><ArrowLeft size={20} /> Back to Customer Success</Link>
          <div className="module-title-row">
            <div className="module-icon" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}><Users size={24} /></div>
            <div>
              <h1>Alumni Contacts</h1>
              <p>{chapter?.chapter_name || 'Loading...'}{chapter?.school ? ` — ${chapter.school}` : ''}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="module-main">
        {/* Stats Row */}
        <div className="module-stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="module-stat"><span className="module-stat-value">{stats.total}</span><span className="module-stat-label"><Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Total Alumni</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#8b5cf6' }}>{stats.have_phone}</span><span className="module-stat-label"><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Have Phone</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#3b82f6' }}>{stats.have_email}</span><span className="module-stat-label"><Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Have Email</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#10b981' }}>{stats.contacted}</span><span className="module-stat-label"><UserCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Contacted</span></div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
          {([['contacts', 'Contacts', Users], ['campaigns', 'Campaigns', Send], ['lines', 'Sending Lines', Smartphone]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setActiveTab(key); setViewingCampaign(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: activeTab === key ? '#8b5cf6' : '#6b7280', borderBottom: `2px solid ${activeTab === key ? '#8b5cf6' : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.15s ease' }}>
              <Icon size={16} /> {label}
              {key === 'campaigns' && campaigns.filter(c => c.status === 'active').length > 0 && (
                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: '9999px' }}>{campaigns.filter(c => c.status === 'active').length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════ CONTACTS TAB ═══════════════ */}
        {activeTab === 'contacts' && (
          <>
            <div className="module-actions-bar">
              <div className="module-search">
                <Search size={18} />
                <input type="text" placeholder="Search by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}><X size={16} /></button>}
              </div>
              <div className="module-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={16} style={{ color: '#6b7280' }} />
                  <select className="module-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    {Object.entries(OUTREACH_STATUS_CONFIG).map(([key, cfg]) => (<option key={key} value={key}>{cfg.label}</option>))}
                  </select>
                </div>
                {selected.size > 0 && (
                  <>
                    <button className="module-primary-btn" style={{ background: '#8b5cf6' }} onClick={() => { if (activeLines.length === 0) { setActiveTab('lines'); return; } setShowCampaignModal(true); }}>
                      <Send size={16} /> Create Campaign ({selected.size})
                    </button>
                    <button className="module-filter-btn" onClick={() => setShowStatusModal(true)}>Update Status ({selected.size})</button>
                    <button className="module-filter-btn" onClick={exportCSV}><Download size={16} /> Export ({selected.size})</button>
                    <button className="module-filter-btn" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm(true)}><Trash2 size={16} /> Delete ({selected.size})</button>
                  </>
                )}
                {selected.size === 0 && <button className="module-filter-btn" onClick={exportCSV} disabled={contacts.length === 0}><Download size={16} /> Export CSV</button>}
                <button className="module-primary-btn" onClick={() => setShowImportModal(true)}><Upload size={18} /> Import CSV</button>
              </div>
            </div>

            {loading ? <div className="module-loading">Loading alumni contacts...</div>
            : contacts.length === 0 && !search && filterStatus === 'all' ? (
              <div className="module-empty-state"><FileSpreadsheet size={48} /><h3>No alumni contacts yet</h3><p>Import a CSV file to get started with alumni outreach.</p><button className="module-primary-btn" style={{ marginTop: '16px' }} onClick={() => setShowImportModal(true)}><Upload size={18} /> Import CSV</button></div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="module-table">
                    <thead><tr>
                      <th style={{ width: '40px' }}><input type="checkbox" checked={contacts.length > 0 && selected.size === contacts.length} onChange={toggleSelectAll} /></th>
                      <SortHeader field="first_name">Name</SortHeader>
                      <SortHeader field="phone_primary">Phone</SortHeader>
                      <th style={{ whiteSpace: 'nowrap' }}>Phone 2</th>
                      <SortHeader field="email">Email</SortHeader>
                      <SortHeader field="year">Year</SortHeader>
                      <SortHeader field="outreach_status">Status</SortHeader>
                      <SortHeader field="created_at">Date Added</SortHeader>
                    </tr></thead>
                    <tbody>
                      {contacts.map(contact => (
                        <tr key={contact.id} style={{ background: selected.has(contact.id) ? '#f0f4ff' : undefined }}>
                          <td><input type="checkbox" checked={selected.has(contact.id)} onChange={() => toggleSelect(contact.id)} /></td>
                          <td style={{ fontWeight: 500 }}>{contact.first_name} {contact.last_name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatPhone(contact.phone_primary)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#8b5cf6' }}>{formatPhone(contact.phone_secondary)}</td>
                          <td>{contact.email || '—'}</td>
                          <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{contact.year || '—'}</td>
                          <td><StatusBadge status={contact.outreach_status} /></td>
                          <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{formatDate(contact.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Showing {((page-1)*limit)+1}–{Math.min(page*limit, total)} of {total}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="module-filter-btn" disabled={page<=1} onClick={() => setPage(p => p-1)}><ChevronLeft size={16} /> Prev</button>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Page {page} of {totalPages}</span>
                      <button className="module-filter-btn" disabled={page>=totalPages} onClick={() => setPage(p => p+1)}>Next <ChevronRight size={16} /></button>
                    </div>
                  </div>
                )}
                {contacts.length === 0 && (search || filterStatus !== 'all') && (
                  <div className="module-empty-state" style={{ padding: '48px' }}><Search size={36} /><h3>No results found</h3><p>Try adjusting your search or filter criteria.</p></div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════ CAMPAIGNS TAB ═══════════════ */}
        {activeTab === 'campaigns' && !viewingCampaign && (
          <>
            <div className="module-actions-bar">
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</div>
              <button className="module-primary-btn" onClick={() => { setActiveTab('contacts'); }}><Plus size={18} /> Select Contacts to Start</button>
            </div>
            {campaigns.length === 0 ? (
              <div className="module-empty-state"><Send size={48} /><h3>No campaigns yet</h3><p>Select contacts from the Contacts tab and create your first outreach campaign.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {campaigns.map(camp => (
                  <div key={camp.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{camp.name}</span>
                        <CampaignStatusBadge status={camp.status} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{camp.total_contacts} contacts · Created {formatDate(camp.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(camp.status === 'active' || camp.status === 'paused') && (
                        <button className="module-filter-btn" onClick={() => toggleCampaignStatus(camp)}>
                          {camp.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                        </button>
                      )}
                      <button className="module-filter-btn" onClick={() => setViewingCampaign(camp.id)}><Eye size={14} /> View</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════════ CAMPAIGN DETAIL ═══════════════ */}
        {activeTab === 'campaigns' && viewingCampaign && campaignDetail && (
          <>
            <button className="module-filter-btn" style={{ marginBottom: '16px' }} onClick={() => { setViewingCampaign(null); setCampaignDetail(null); setTodayQueue({}); }}>
              <ArrowLeft size={16} /> Back to Campaigns
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{campaignDetail.campaign.name}</h2>
              <CampaignStatusBadge status={campaignDetail.campaign.status} />
              {(campaignDetail.campaign.status === 'active' || campaignDetail.campaign.status === 'paused') && (
                <button className="module-filter-btn" onClick={() => toggleCampaignStatus(campaignDetail.campaign)}>
                  {campaignDetail.campaign.status === 'active' ? <><Pause size={14} /> Pause All</> : <><Play size={14} /> Resume All</>}
                </button>
              )}
            </div>

            {/* Overall progress */}
            <div className="module-stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
              <div className="module-stat"><span className="module-stat-value">{campaignDetail.campaign.total_contacts}</span><span className="module-stat-label">Total Contacts</span></div>
              <div className="module-stat"><span className="module-stat-value" style={{ color: '#16a34a' }}>{campaignDetail.total_sent}</span><span className="module-stat-label">Sent</span></div>
              <div className="module-stat"><span className="module-stat-value" style={{ color: '#dc2626' }}>{campaignDetail.total_failed}</span><span className="module-stat-label">Failed</span></div>
              <div className="module-stat">
                <span className="module-stat-value" style={{ color: '#8b5cf6' }}>{campaignDetail.campaign.total_contacts - campaignDetail.total_sent - campaignDetail.total_failed}</span>
                <span className="module-stat-label">Remaining</span>
              </div>
            </div>

            {/* Overall progress bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem', color: '#6b7280' }}>
                <span>Overall Progress</span>
                <span>{Math.round((campaignDetail.total_sent / Math.max(campaignDetail.campaign.total_contacts, 1)) * 100)}%</span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(campaignDetail.total_sent / Math.max(campaignDetail.campaign.total_contacts, 1)) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Per-line progress */}
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Line Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {campaignDetail.line_progress.map(lp => (
                <div key={lp.line_id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Smartphone size={16} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontWeight: 600 }}>{lp.line?.label || 'Unknown Line'}</span>
                      <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>{formatPhone(lp.line?.phone_number)}</span>
                      {lp.is_paused && <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '9999px' }}>PAUSED</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Day {lp.current_day} of {lp.total_days}</span>
                      <button className="module-filter-btn" style={{ padding: '4px 10px' }} onClick={() => toggleLinePause(viewingCampaign!, lp.line_id, lp.is_paused)}>
                        {lp.is_paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                      </button>
                      <button className="module-filter-btn" style={{ padding: '4px 10px' }} onClick={() => fetchTodayQueue(viewingCampaign!, lp.line_id)}>
                        <Eye size={12} /> Queue
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem', color: '#6b7280' }}>
                    <span>{lp.sent} / {lp.contacts_assigned} sent</span>
                    <span>{Math.round((lp.sent / Math.max(lp.contacts_assigned, 1)) * 100)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(lp.sent / Math.max(lp.contacts_assigned, 1)) * 100}%`, background: lp.is_paused ? '#d97706' : '#8b5cf6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>

                  {/* Today's queue */}
                  {todayQueue[lp.line_id] && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>Today&apos;s Queue ({todayQueue[lp.line_id].length} contacts)</h4>
                      {todayQueue[lp.line_id].length === 0 ? (
                        <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>No queued contacts for today — all sent or line paused.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                          {todayQueue[lp.line_id].map(qi => (
                            <div key={qi.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e7eb', fontSize: '0.8125rem' }}>
                              <span style={{ fontWeight: 500 }}>{qi.contact?.first_name} {qi.contact?.last_name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#6b7280' }}>{formatPhone(qi.send_phone)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════ SENDING LINES TAB ═══════════════ */}
        {activeTab === 'lines' && (
          <>
            <div className="module-actions-bar">
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{lines.length} sending line{lines.length !== 1 ? 's' : ''} configured</div>
              <button className="module-primary-btn" onClick={() => { setEditingLine(null); setLineForm({ label: '', phone_number: '', daily_limit: 50 }); setShowLineModal(true); }}><Plus size={18} /> Add Line</button>
            </div>
            {lines.length === 0 ? (
              <div className="module-empty-state"><Smartphone size={48} /><h3>No sending lines configured</h3><p>Add your iMessage sending lines to start distributing outreach.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lines.map(line => (
                  <div key={line.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: line.is_active ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <Smartphone size={20} style={{ color: line.is_active ? '#8b5cf6' : '#9ca3af' }} />
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{line.label}</div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8125rem', color: '#6b7280' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{formatPhone(line.phone_number)}</span>
                          <span>{line.daily_limit}/day</span>
                          <span style={{ color: line.is_active ? '#16a34a' : '#9ca3af' }}>{line.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="module-filter-btn" style={{ padding: '6px 10px' }} onClick={() => toggleLine(line)}>
                        {line.is_active ? <ToggleRight size={18} style={{ color: '#16a34a' }} /> : <ToggleLeft size={18} />}
                      </button>
                      <button className="module-filter-btn" style={{ padding: '6px 10px' }} onClick={() => { setEditingLine(line); setLineForm({ label: line.label, phone_number: line.phone_number, daily_limit: line.daily_limit }); setShowLineModal(true); }}><Edit2 size={14} /></button>
                      <button className="module-filter-btn" style={{ padding: '6px 10px', color: '#dc2626' }} onClick={() => deleteLine(line.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay className="module-modal-overlay" onClose={resetImportModal}>
          <div className="module-modal module-modal-large" onClick={e => e.stopPropagation()}>
            <div className="module-modal-header"><h2>Import Alumni CSV</h2><button className="module-modal-close" onClick={resetImportModal}><X size={20} /></button></div>
            <div className="module-modal-body">
              {!importResult ? (
                <>
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) handleFileSelect(f); }} onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? '#8b5cf6' : '#d1d5db'}`, borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f5f3ff' : '#fafafa', transition: 'all 0.2s ease', marginBottom: '16px' }}>
                    <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                    <Upload size={32} style={{ color: '#8b5cf6', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{importFile ? importFile.name : 'Drop your CSV file here'}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'or click to browse'}</p>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '16px' }}>Columns: First Name, Last Name, Phone (or Phone 1 / Phone 2), Email, Year. Two numbers in one cell (comma/semicolon separated) will be split automatically.</p>
                  {importPreview && importPreview.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Preview (first {Math.min(importPreview.length - 1, 5)} rows)</h4>
                      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <table className="module-table" style={{ margin: 0 }}><thead><tr>{importPreview[0].map((h, i) => <th key={i} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                          <tbody>{importPreview.slice(1).map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ fontSize: '0.8125rem' }}>{cell}</td>)}</tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '24px', padding: '24px', borderRadius: '12px', background: importResult.imported > 0 ? '#f0fdf4' : '#fef2f2' }}>
                    {importResult.imported > 0 ? <CheckCircle2 size={40} style={{ color: '#16a34a', marginBottom: '8px' }} /> : <AlertCircle size={40} style={{ color: '#dc2626', marginBottom: '8px' }} />}
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '4px' }}>{importResult.imported > 0 ? 'Import Complete' : 'Import Failed'}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{importResult.imported}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Imported</div></div>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{importResult.duplicates}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Duplicates</div></div>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{importResult.skipped}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Skipped</div></div>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#ede9fe', borderRadius: '8px' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{importResult.dual_phone_count}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Dual Phone</div></div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '12px', background: '#fef2f2', borderRadius: '8px', fontSize: '0.8125rem' }}>
                      <strong style={{ display: 'block', marginBottom: '8px' }}>Errors:</strong>
                      {importResult.errors.slice(0, 20).map((err, i) => <div key={i} style={{ color: '#991b1b', marginBottom: '4px' }}>{err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}</div>)}
                      {importResult.errors.length > 20 && <div style={{ color: '#6b7280', marginTop: '8px' }}>...and {importResult.errors.length - 20} more</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={resetImportModal}>{importResult ? 'Close' : 'Cancel'}</button>
              {!importResult && <button className="module-primary-btn" onClick={doImport} disabled={!importFile || importing}>{importing ? 'Importing...' : 'Import'}</button>}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Sending Line Modal */}
      {showLineModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => setShowLineModal(false)}>
          <div className="module-modal" onClick={e => e.stopPropagation()}>
            <div className="module-modal-header"><h2>{editingLine ? 'Edit' : 'Add'} Sending Line</h2><button className="module-modal-close" onClick={() => setShowLineModal(false)}><X size={20} /></button></div>
            <div className="module-modal-body">
              <div className="module-form-group"><label>Label</label><input type="text" value={lineForm.label} onChange={e => setLineForm({...lineForm, label: e.target.value})} placeholder="e.g. Line 1, Owen's iPhone" /></div>
              <div className="module-form-group"><label>Phone Number</label><input type="tel" value={lineForm.phone_number} onChange={e => setLineForm({...lineForm, phone_number: e.target.value})} placeholder="+15551234567" /></div>
              <div className="module-form-group"><label>Daily Send Limit</label><input type="number" value={lineForm.daily_limit} onChange={e => setLineForm({...lineForm, daily_limit: parseInt(e.target.value) || 50})} min={1} max={500} /></div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => setShowLineModal(false)}>Cancel</button>
              <button className="module-primary-btn" onClick={saveLine} disabled={!lineForm.label || !lineForm.phone_number}>{editingLine ? 'Update' : 'Add Line'}</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Campaign Builder Modal */}
      {showCampaignModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => setShowCampaignModal(false)}>
          <div className="module-modal module-modal-large" onClick={e => e.stopPropagation()}>
            <div className="module-modal-header"><h2>Create Outreach Campaign</h2><button className="module-modal-close" onClick={() => setShowCampaignModal(false)}><X size={20} /></button></div>
            <div className="module-modal-body">
              <div className="module-form-group"><label>Campaign Name</label><input type="text" value={campaignForm.name} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} placeholder="e.g. Spring 2026 Alumni Outreach" /></div>
              <div className="module-form-group">
                <label>Message Template</label>
                <textarea value={campaignForm.message_template} onChange={e => setCampaignForm({...campaignForm, message_template: e.target.value})} rows={4} placeholder="Hey {{first_name}}, hope you're doing well! ..." />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{chapter_name}}'}, {'{{year}}'}</div>
              </div>
              <div className="module-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={campaignForm.use_secondary_phone} onChange={e => setCampaignForm({...campaignForm, use_secondary_phone: e.target.checked})} />
                  Prefer secondary phone number (falls back to primary if unavailable)
                </label>
              </div>

              {/* Distribution Preview */}
              <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><Zap size={18} style={{ color: '#8b5cf6' }} /><span style={{ fontWeight: 600, color: '#374151' }}>Distribution Preview</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '10px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a2744' }}>{campaignContactCount}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Contacts with phone</div>
                  </div>
                  <div style={{ padding: '10px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>{maxDays} day{maxDays !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Estimated completion</div>
                  </div>
                </div>
                {preview.map(p => (
                  <div key={p.line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: '#fff', border: '1px solid #e5e7eb', marginBottom: '8px', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smartphone size={14} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontWeight: 500 }}>{p.line.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', color: '#6b7280' }}>
                      <span>{p.assigned} contacts</span>
                      <span>{p.days} day{p.days !== 1 ? 's' : ''} @ {p.line.daily_limit}/day</span>
                      <span style={{ color: '#374151', fontWeight: 500 }}><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{p.completionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => setShowCampaignModal(false)}>Cancel</button>
              <button className="module-primary-btn" onClick={createCampaign} disabled={!campaignForm.name || !campaignForm.message_template || activeLines.length === 0 || campaignContactCount === 0 || creatingCampaign}>
                {creatingCampaign ? 'Creating...' : `Launch Campaign (${campaignContactCount} contacts)`}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Bulk Status Modal */}
      {showStatusModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => setShowStatusModal(false)}>
          <div className="module-modal" onClick={e => e.stopPropagation()}>
            <div className="module-modal-header"><h2>Update Status</h2><button className="module-modal-close" onClick={() => setShowStatusModal(false)}><X size={20} /></button></div>
            <div className="module-modal-body">
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>Update status for {selected.size} selected contact{selected.size > 1 ? 's' : ''}.</p>
              <div className="module-form-group"><label>New Status</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as OutreachStatus)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', background: 'white' }}>
                  {Object.entries(OUTREACH_STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                </select>
              </div>
            </div>
            <div className="module-modal-footer"><button className="module-cancel-btn" onClick={() => setShowStatusModal(false)}>Cancel</button><button className="module-primary-btn" onClick={bulkUpdateStatus}>Update {selected.size} Contact{selected.size > 1 ? 's' : ''}</button></div>
          </div>
        </ModalOverlay>
      )}

      <ConfirmModal isOpen={deleteConfirm} title="Delete Contacts" message={`Are you sure you want to delete ${selected.size} selected contact${selected.size > 1 ? 's' : ''}? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" variant="danger" onConfirm={bulkDelete} onCancel={() => setDeleteConfirm(false)} />
    </div>
  );
}
