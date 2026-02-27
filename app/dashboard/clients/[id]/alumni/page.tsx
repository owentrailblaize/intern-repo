'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Download, Search, X, Trash2, ChevronLeft, ChevronRight,
  Users, Phone, Mail, UserCheck, FileSpreadsheet, AlertCircle, CheckCircle2,
  ChevronDown, Filter, Smartphone, Send, Check, XCircle, Zap, MessageSquare,
  RefreshCw, MessageCircle,
} from 'lucide-react';
import {
  supabase,
  AlumniContact,
  OutreachStatus,
  OUTREACH_STATUS_CONFIG,
  ChapterWithOnboarding,
  SENDING_LINES,
  OutreachQueueEntry,
} from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';
import ModalOverlay from '@/components/ModalOverlay';

type SortField = 'first_name' | 'last_name' | 'phone_primary' | 'email' | 'year' | 'outreach_status' | 'created_at';
type SortDir = 'asc' | 'desc';
type TabView = 'contacts' | 'campaigns' | 'lines';

interface AlumniStats { total: number; have_phone: number; have_email: number; contacted: number; imessage: number; sms: number; unverified: number; responded: number; signed_up: number; }
interface ImportResult { imported: number; skipped: number; duplicates: number; dual_phone_count: number; queue_assigned: number; errors: { row: number; message: string }[]; }

interface DashboardLine {
  number: number;
  label: string;
  daily_limit: number;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  current_day: number;
  total_days: number;
}

interface DashboardData {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  days_remaining: number;
  total_days: number;
  lines: DashboardLine[];
}

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

function QueueStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: '#6b7280', bg: '#f3f4f6', label: 'Pending' },
    sent: { color: '#16a34a', bg: '#dcfce7', label: 'Sent' },
    failed: { color: '#dc2626', bg: '#fee2e2', label: 'Failed' },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: c.color, backgroundColor: c.bg }}>
      {c.label}
    </span>
  );
}

export default function AlumniPage() {
  const params = useParams();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<ChapterWithOnboarding | null>(null);
  const [contacts, setContacts] = useState<AlumniContact[]>([]);
  const [stats, setStats] = useState<AlumniStats>({ total: 0, have_phone: 0, have_email: 0, contacted: 0, imessage: 0, sms: 0, unverified: 0, responded: 0, signed_up: 0 });
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

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // iMessage filter
  const [imessageFilter, setImessageFilter] = useState<'all' | 'imessage' | 'sms' | 'unverified'>('all');

  // Verify iMessage
  const [verifying, setVerifying] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState(false);

  // Send Batch modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTouch, setSendTouch] = useState<1 | 2 | 3>(1);
  const [sendSchool, setSendSchool] = useState('');
  const [sendFraternity, setSendFraternity] = useState('');
  const [sendSignupLink, setSendSignupLink] = useState('');
  const [sendSenderName, setSendSenderName] = useState('Owen');
  const [sendBatchSize, setSendBatchSize] = useState(50);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; per_line: { line: number; label: string; sent: number; remaining: number }[]; errors: { contact_id: string; message: string }[] } | null>(null);

  // Poll responses
  const [polling, setPolling] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Queue per line
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const [lineQueues, setLineQueues] = useState<Record<number, OutreachQueueEntry[]>>({});
  const [queueLoading, setQueueLoading] = useState<number | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  // ── Data Fetching ──

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
      if (imessageFilter !== 'all') p.set('imessage_filter', imessageFilter);
      const res = await fetch(`/api/alumni?${p}`);
      const json = await res.json();
      if (json.data) { setContacts(json.data.contacts); setTotal(json.data.total); }
    } catch (err) { console.error('Failed to fetch contacts:', err); }
    finally { setLoading(false); }
  }, [chapterId, page, search, filterStatus, imessageFilter, sortBy, sortDir]);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch(`/api/outreach/dashboard?chapter_id=${chapterId}`);
      const json = await res.json();
      if (json.data) setDashboard(json.data);
    } catch (err) { console.error('Failed to fetch dashboard:', err); }
    finally { setDashLoading(false); }
  }, [chapterId]);

  async function fetchLineQueue(lineNumber: number) {
    setQueueLoading(lineNumber);
    try {
      const res = await fetch(`/api/outreach/queue?chapter_id=${chapterId}&line_number=${lineNumber}`);
      const json = await res.json();
      if (json.data) setLineQueues(prev => ({ ...prev, [lineNumber]: json.data.queue }));
    } catch (err) { console.error('Failed to fetch queue:', err); }
    finally { setQueueLoading(null); }
  }

  async function triggerAutoAssign() {
    try {
      await fetch('/api/outreach/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
    } catch (err) { console.error('Auto-assign failed:', err); }
  }

  useEffect(() => { fetchChapter(); fetchStats(); }, [fetchChapter, fetchStats]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { setPage(1); }, [search, filterStatus, imessageFilter]);
  useEffect(() => {
    if (activeTab === 'campaigns') {
      triggerAutoAssign().then(() => fetchDashboard());
    }
  }, [activeTab, fetchDashboard]);

  // ── Mark Sent / Failed ──

  async function markContact(queueId: string, status: 'sent' | 'failed', lineNumber: number) {
    setMarkingId(queueId);
    try {
      await fetch('/api/outreach/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId, status }),
      });
      setLineQueues(prev => ({
        ...prev,
        [lineNumber]: (prev[lineNumber] || []).map(q =>
          q.id === queueId ? { ...q, status } : q
        ),
      }));
      fetchDashboard();
      fetchStats();
    } catch (err) { console.error('Failed to mark contact:', err); }
    finally { setMarkingId(null); }
  }

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
      if (json.data) { setImportResult(json.data); fetchContacts(); fetchStats(); fetchDashboard(); }
      else if (json.error) setImportResult({ imported: 0, skipped: 0, duplicates: 0, dual_phone_count: 0, queue_assigned: 0, errors: [{ row: 0, message: json.error.message }] });
    } catch { setImportResult({ imported: 0, skipped: 0, duplicates: 0, dual_phone_count: 0, queue_assigned: 0, errors: [{ row: 0, message: 'Network error' }] }); }
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

  function toggleLineExpand(lineNumber: number) {
    if (expandedLine === lineNumber) {
      setExpandedLine(null);
    } else {
      setExpandedLine(lineNumber);
      if (!lineQueues[lineNumber]) fetchLineQueue(lineNumber);
    }
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleVerifyIMessage() {
    setVerifyConfirm(false);
    setVerifying(true);
    try {
      const res = await fetch('/api/outreach/verify-imessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
      const json = await res.json();
      if (json.data) {
        showToast(`Verified ${json.data.total_checked} contacts: ${json.data.imessage} iMessage, ${json.data.sms} SMS${json.data.errors > 0 ? `, ${json.data.errors} errors` : ''}`);
        fetchContacts();
        fetchStats();
      } else {
        showToast(json.error?.message || 'Verification failed', 'error');
      }
    } catch { showToast('Network error during verification', 'error'); }
    finally { setVerifying(false); }
  }

  async function handleSendBatch() {
    setSending(true);
    try {
      const res = await fetch('/api/outreach/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: chapterId,
          touch: sendTouch,
          sender_name: sendSenderName,
          school: sendSchool,
          fraternity: sendFraternity,
          signup_link: sendSignupLink,
          batch_size: sendBatchSize,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setSendResult(json.data);
        const lineBreakdown = json.data.per_line
          .filter((l: { sent: number }) => l.sent > 0)
          .map((l: { label: string; sent: number }) => `${l.label}: ${l.sent}`)
          .join(', ');
        showToast(`Sent ${json.data.sent} Touch ${sendTouch} messages${lineBreakdown ? ` (${lineBreakdown})` : ''}`);
        fetchContacts();
        fetchStats();
        fetchDashboard();
      } else {
        showToast(json.error?.message || 'Send failed', 'error');
      }
    } catch { showToast('Network error during send', 'error'); }
    finally { setSending(false); }
  }

  async function handlePollResponses() {
    setPolling(true);
    try {
      const res = await fetch('/api/outreach/poll-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
      const json = await res.json();
      if (json.data) {
        const cls = Object.entries(json.data.by_classification || {})
          .map(([k, v]) => `${v} ${k}`)
          .join(', ');
        showToast(`Checked ${json.data.polled} conversations: ${json.data.new_responses} new responses${cls ? ` (${cls})` : ''}`);
        fetchContacts();
        fetchStats();
      } else {
        showToast(json.error?.message || 'Poll failed', 'error');
      }
    } catch { showToast('Network error during poll', 'error'); }
    finally { setPolling(false); }
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {sortBy === field && <ChevronDown size={14} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />}
      </span>
    </th>
  );

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
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#16a34a' }}>{stats.imessage}</span><span className="module-stat-label"><MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />iMessage</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#6b7280' }}>{stats.sms}</span><span className="module-stat-label"><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />SMS</span></div>
        </div>
        <div className="module-stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '-8px' }}>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#d97706' }}>{stats.unverified}</span><span className="module-stat-label"><AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Unverified</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#10b981' }}>{stats.contacted}</span><span className="module-stat-label"><UserCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Contacted</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#2563eb' }}>{stats.responded}</span><span className="module-stat-label"><MessageCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Responded</span></div>
          <div className="module-stat"><span className="module-stat-value" style={{ color: '#16a34a' }}>{stats.signed_up}</span><span className="module-stat-label"><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Signed Up</span></div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
          {([['contacts', 'Contacts', Users], ['campaigns', 'Outreach Queue', Send], ['lines', 'Sending Lines', Smartphone]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: activeTab === key ? '#8b5cf6' : '#6b7280', borderBottom: `2px solid ${activeTab === key ? '#8b5cf6' : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.15s ease' }}>
              <Icon size={16} /> {label}
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
                  <select className="module-filter-select" value={imessageFilter} onChange={(e) => setImessageFilter(e.target.value as typeof imessageFilter)}>
                    <option value="all">All Numbers</option>
                    <option value="imessage">iMessage Only</option>
                    <option value="sms">SMS Only</option>
                    <option value="unverified">Unverified Only</option>
                  </select>
                </div>
                {selected.size > 0 && (
                  <>
                    <button className="module-filter-btn" onClick={() => setShowStatusModal(true)}>Update Status ({selected.size})</button>
                    <button className="module-filter-btn" onClick={exportCSV}><Download size={16} /> Export ({selected.size})</button>
                    <button className="module-filter-btn" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm(true)}><Trash2 size={16} /> Delete ({selected.size})</button>
                  </>
                )}
                {selected.size === 0 && <button className="module-filter-btn" onClick={exportCSV} disabled={contacts.length === 0}><Download size={16} /> Export CSV</button>}
                <button className="module-filter-btn" onClick={() => setVerifyConfirm(true)} disabled={verifying || stats.unverified === 0} style={{ color: '#d97706', borderColor: '#fde68a' }}>
                  {verifying ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</> : <><Zap size={16} /> Verify iMessage ({stats.unverified})</>}
                </button>
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
                      <th style={{ whiteSpace: 'nowrap', width: '50px' }}>Type</th>
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
                          <td>
                            {contact.is_imessage === true && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', backgroundColor: '#dcfce7' }}>iMsg</span>}
                            {contact.is_imessage === false && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#f3f4f6' }}>SMS</span>}
                            {contact.is_imessage === null && contact.phone_primary && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#d97706', backgroundColor: '#fef3c7' }}>?</span>}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#8b5cf6' }}>{formatPhone(contact.phone_secondary)}</td>
                          <td>{contact.email || '—'}</td>
                          <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{contact.year || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <StatusBadge status={contact.outreach_status} />
                              {contact.response_classification && (
                                <span style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#f3f4f6' }}>{contact.response_classification}</span>
                              )}
                            </div>
                          </td>
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

        {/* ═══════════════ OUTREACH QUEUE TAB ═══════════════ */}
        {activeTab === 'campaigns' && (
          <>
            {dashLoading && !dashboard ? (
              <div className="module-loading">Loading outreach queue...</div>
            ) : !dashboard || dashboard.total === 0 ? (
              <div className="module-empty-state">
                <Send size={48} />
                <h3>No contacts in the queue</h3>
                <p>Import alumni with phone numbers and they&apos;ll be automatically split across {SENDING_LINES.length} sending lines.</p>
                <button className="module-primary-btn" style={{ marginTop: '16px' }} onClick={() => { setActiveTab('contacts'); setShowImportModal(true); }}>
                  <Upload size={18} /> Import CSV
                </button>
              </div>
            ) : (
              <>
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button className="module-primary-btn" onClick={() => { setSendSchool(chapter?.school || ''); setSendFraternity(chapter?.fraternity || ''); setSendResult(null); setShowSendModal(true); }} disabled={sending}>
                    <Send size={16} /> Send Next Batch
                  </button>
                  <button className="module-filter-btn" onClick={handlePollResponses} disabled={polling} style={{ color: '#2563eb', borderColor: '#bfdbfe' }}>
                    {polling ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</> : <><MessageCircle size={16} /> Check Responses</>}
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="module-stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '20px' }}>
                  <div className="module-stat">
                    <span className="module-stat-value">{dashboard.total}</span>
                    <span className="module-stat-label">In Queue</span>
                  </div>
                  <div className="module-stat">
                    <span className="module-stat-value" style={{ color: '#16a34a' }}>{dashboard.sent}</span>
                    <span className="module-stat-label">Sent</span>
                  </div>
                  <div className="module-stat">
                    <span className="module-stat-value" style={{ color: '#dc2626' }}>{dashboard.failed}</span>
                    <span className="module-stat-label">Failed</span>
                  </div>
                  <div className="module-stat">
                    <span className="module-stat-value" style={{ color: '#8b5cf6' }}>{dashboard.pending}</span>
                    <span className="module-stat-label">Remaining</span>
                  </div>
                  <div className="module-stat">
                    <span className="module-stat-value" style={{ color: '#d97706' }}>{dashboard.days_remaining}</span>
                    <span className="module-stat-label">Days Left</span>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Overall Progress</span>
                    <span style={{ color: '#6b7280' }}>{dashboard.sent} / {dashboard.total} sent ({Math.round((dashboard.sent / Math.max(dashboard.total, 1)) * 100)}%)</span>
                  </div>
                  <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(dashboard.sent / Math.max(dashboard.total, 1)) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: '5px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* Per-Line Cards */}
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Per-Line Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dashboard.lines.map(line => {
                    const isExpanded = expandedLine === line.number;
                    const queue = lineQueues[line.number] || [];
                    const isLoadingQueue = queueLoading === line.number;
                    const pct = Math.round((line.sent / Math.max(line.total, 1)) * 100);

                    return (
                      <div key={line.number} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Line Header */}
                        <div
                          onClick={() => toggleLineExpand(line.number)}
                          style={{ padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Smartphone size={18} style={{ color: '#8b5cf6' }} />
                              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{line.label}</span>
                              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Line {line.number}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                {line.sent}/{line.total} sent
                              </span>
                              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                                Day {line.current_day} of {line.total_days}
                              </span>
                              <ChevronDown size={16} style={{ color: '#9ca3af', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: '#6b7280' }}>
                            <span>{line.pending} remaining · {line.failed > 0 ? `${line.failed} failed · ` : ''}{line.daily_limit}/day</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#8b5cf6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>

                        {/* Expanded Queue */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px 20px', background: '#fafafa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                                Today&apos;s Queue ({queue.length} contacts)
                              </h4>
                              <button
                                className="module-filter-btn"
                                style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
                                onClick={(e) => { e.stopPropagation(); fetchLineQueue(line.number); }}
                              >
                                Refresh
                              </button>
                            </div>

                            {isLoadingQueue ? (
                              <p style={{ fontSize: '0.8125rem', color: '#6b7280', padding: '12px 0' }}>Loading queue...</p>
                            ) : queue.length === 0 ? (
                              <p style={{ fontSize: '0.8125rem', color: '#6b7280', padding: '12px 0' }}>All caught up — no pending contacts for this line.</p>
                            ) : (
                              <div style={{ overflowX: 'auto' }}>
                                <table className="module-table" style={{ margin: 0 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ fontSize: '0.75rem' }}>#</th>
                                      <th style={{ fontSize: '0.75rem' }}>Name</th>
                                      <th style={{ fontSize: '0.75rem' }}>Phone</th>
                                      <th style={{ fontSize: '0.75rem' }}>Phone 2</th>
                                      <th style={{ fontSize: '0.75rem' }}>Status</th>
                                      <th style={{ fontSize: '0.75rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {queue.map((qi, idx) => (
                                      <tr key={qi.id}>
                                        <td style={{ fontSize: '0.8125rem', color: '#9ca3af', width: '40px' }}>{idx + 1}</td>
                                        <td style={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                                          {qi.contact?.first_name} {qi.contact?.last_name}
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                                          {formatPhone(qi.contact?.phone_primary || null)}
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#8b5cf6' }}>
                                          {formatPhone(qi.contact?.phone_secondary || null)}
                                        </td>
                                        <td><QueueStatusBadge status={qi.status} /></td>
                                        <td style={{ textAlign: 'right' }}>
                                          {qi.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); markContact(qi.id, 'sent', line.number); }}
                                                disabled={markingId === qi.id}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', border: '1px solid #bbf7d0', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                              >
                                                <Check size={12} /> Sent
                                              </button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); markContact(qi.id, 'failed', line.number); }}
                                                disabled={markingId === qi.id}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                              >
                                                <XCircle size={12} /> Failed
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ═══════════════ SENDING LINES TAB ═══════════════ */}
        {activeTab === 'lines' && (
          <>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '16px' }}>
              {SENDING_LINES.length} sending lines configured · Contacts are automatically split equally across all lines
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SENDING_LINES.map(line => {
                const lineData = dashboard?.lines.find(l => l.number === line.number);
                return (
                  <div key={line.number} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Smartphone size={20} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '2px' }}>Line {line.number} — {line.label}</div>
                          <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                            {line.daily_limit} contacts/day
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {lineData ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#374151' }}>{lineData.total}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {lineData.sent} sent · {lineData.pending} pending{lineData.failed > 0 ? ` · ${lineData.failed} failed` : ''}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>No assignments yet</div>
                        )}
                      </div>
                    </div>
                    {lineData && lineData.total > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(lineData.sent / Math.max(lineData.total, 1)) * 100}%`, background: '#8b5cf6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: '#9ca3af' }}>
                          <span>Day {lineData.current_day} of {lineData.total_days}</span>
                          <span>{Math.round((lineData.sent / Math.max(lineData.total, 1)) * 100)}% complete</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '16px' }}>
                    Columns: First Name, Last Name, Phone (or Phone 1 / Phone 2), Email, Year. Two numbers in one cell (comma/semicolon separated) will be split automatically. Contacts with phones are auto-assigned to sending lines.
                  </p>
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
                    {importResult.queue_assigned > 0 && (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{importResult.queue_assigned} contacts auto-assigned to sending lines</p>
                    )}
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

      {/* Verify iMessage Confirm */}
      <ConfirmModal
        isOpen={verifyConfirm}
        title="Verify iMessage Eligibility"
        message={`This will check ${stats.unverified} unverified phone numbers for iMessage eligibility via Linq. Continue?`}
        confirmText="Verify"
        cancelText="Cancel"
        variant="default"
        onConfirm={handleVerifyIMessage}
        onCancel={() => setVerifyConfirm(false)}
      />

      {/* Send Batch Modal */}
      {showSendModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => setShowSendModal(false)}>
          <div className="module-modal module-modal-large" onClick={e => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>Send Next Batch</h2>
              <button className="module-modal-close" onClick={() => setShowSendModal(false)}><X size={20} /></button>
            </div>
            <div className="module-modal-body">
              {sendResult ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <CheckCircle2 size={40} style={{ color: '#16a34a', marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Sent {sendResult.sent} Touch {sendTouch} Messages</h3>
                  {sendResult.per_line.filter(l => l.sent > 0).length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                      {sendResult.per_line.filter(l => l.sent > 0).map(l => (
                        <div key={l.line} style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#16a34a' }}>{l.sent}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{l.label} ({l.remaining} left)</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {sendResult.errors.length > 0 && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '8px', fontSize: '0.8125rem', textAlign: 'left', maxHeight: '150px', overflowY: 'auto' }}>
                      <strong>{sendResult.errors.length} errors:</strong>
                      {sendResult.errors.slice(0, 10).map((e, i) => <div key={i} style={{ color: '#991b1b', marginTop: '4px' }}>{e.message}</div>)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="module-form-group">
                    <label>Touch Number</label>
                    <select value={sendTouch} onChange={e => setSendTouch(Number(e.target.value) as 1 | 2 | 3)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', background: 'white' }}>
                      <option value={1}>Touch 1 — Verify</option>
                      <option value={2}>Touch 2 — Pitch + Link</option>
                      <option value={3}>Touch 3 — Check-in</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="module-form-group">
                      <label>School</label>
                      <input type="text" value={sendSchool} onChange={e => setSendSchool(e.target.value)} placeholder="e.g. University of Alabama" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }} />
                    </div>
                    <div className="module-form-group">
                      <label>Fraternity</label>
                      <input type="text" value={sendFraternity} onChange={e => setSendFraternity(e.target.value)} placeholder="e.g. Phi Delta Theta" style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }} />
                    </div>
                  </div>
                  {sendTouch === 2 && (
                    <div className="module-form-group">
                      <label>Signup Link</label>
                      <input type="text" value={sendSignupLink} onChange={e => setSendSignupLink(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="module-form-group">
                      <label>Sender Name</label>
                      <select value={sendSenderName} onChange={e => setSendSenderName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', background: 'white' }}>
                        {SENDING_LINES.map(l => <option key={l.number} value={l.label}>{l.label}</option>)}
                      </select>
                    </div>
                    <div className="module-form-group">
                      <label>Batch Size</label>
                      <input type="number" value={sendBatchSize} onChange={e => setSendBatchSize(Number(e.target.value))} min={1} max={150} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }} />
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Message Preview:</div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5 }}>
                      {sendTouch === 1 && `Hey is this {first_name} {last_name}? My name is ${sendSenderName}, and I am checking to verify your phone number for the ${sendSchool || '{school}'} ${sendFraternity || '{fraternity}'} alumni list.`}
                      {sendTouch === 2 && `Hey {first_name}, following up — we partnered with ${sendSchool || '{school}'} ${sendFraternity || '{fraternity}'} to launch Trailblaize, a free platform that connects actives and alumni. Here's the signup link if you're interested: ${sendSignupLink || '{signup_link}'}`}
                      {sendTouch === 3 && `Hey {first_name}, just checking back in — did you get a chance to sign up? Happy to answer any questions.`}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => setShowSendModal(false)}>{sendResult ? 'Close' : 'Cancel'}</button>
              {!sendResult && (
                <button className="module-primary-btn" onClick={handleSendBatch} disabled={sending || (sendTouch <= 2 && (!sendSchool || !sendFraternity)) || (sendTouch === 2 && !sendSignupLink)}>
                  {sending ? 'Sending...' : `Send Touch ${sendTouch}`}
                </button>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000,
          padding: '14px 20px', borderRadius: '10px', maxWidth: '440px',
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.875rem', fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', marginLeft: 'auto', color: 'inherit' }}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
