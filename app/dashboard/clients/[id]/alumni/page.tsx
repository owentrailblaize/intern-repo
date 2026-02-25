'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Download, Search, X, Trash2, ChevronLeft, ChevronRight,
  Users, Phone, Mail, UserCheck, FileSpreadsheet, AlertCircle, CheckCircle2,
  ChevronDown, Filter,
} from 'lucide-react';
import {
  supabase,
  AlumniContact,
  OutreachStatus,
  OUTREACH_STATUS_CONFIG,
  ChapterWithOnboarding,
} from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';
import ModalOverlay from '@/components/ModalOverlay';

type SortField = 'first_name' | 'last_name' | 'phone' | 'email' | 'outreach_status' | 'created_at';
type SortDir = 'asc' | 'desc';

interface AlumniStats {
  total: number;
  have_phone: number;
  have_email: number;
  contacted: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: { row: number; message: string }[];
}

function formatPhone(e164: string | null): string {
  if (!e164) return '—';
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  const cfg = OUTREACH_STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
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

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<OutreachStatus>('not_contacted');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [chapterId]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        chapter_id: chapterId,
        page: String(page),
        limit: String(limit),
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`/api/alumni?${params}`);
      const json = await res.json();
      if (json.data) {
        setContacts(json.data.contacts);
        setTotal(json.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [chapterId, page, search, filterStatus, sortBy, sortDir]);

  useEffect(() => { fetchChapter(); }, [fetchChapter]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => { setPage(1); }, [search, filterStatus]);

  // CSV preview
  function handleFileSelect(file: File) {
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const preview = lines.slice(0, 6).map(line => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { cells.push(current.trim()); current = ''; }
            else if (ch === '\r') { continue; }
            else { current += ch; }
          }
        }
        cells.push(current.trim());
        return cells;
      });
      setImportPreview(preview);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('chapter_id', chapterId);

      const res = await fetch('/api/alumni/import', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.data) {
        setImportResult(json.data);
        fetchContacts();
        fetchStats();
      } else if (json.error) {
        setImportResult({ imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, message: json.error.message }] });
      }
    } catch {
      setImportResult({ imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, message: 'Network error' }] });
    } finally {
      setImporting(false);
    }
  }

  function resetImportModal() {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setDragOver(false);
  }

  // Bulk actions
  function toggleSelectAll() {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map(c => c.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkUpdateStatus() {
    const ids = Array.from(selected);
    try {
      await fetch('/api/alumni', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates: { outreach_status: bulkStatus } }),
      });
      setSelected(new Set());
      setShowStatusModal(false);
      fetchContacts();
      fetchStats();
    } catch (err) {
      console.error('Bulk update failed:', err);
    }
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    try {
      await fetch('/api/alumni', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setSelected(new Set());
      setDeleteConfirm(false);
      fetchContacts();
      fetchStats();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  }

  function exportCSV() {
    if (!supabase) return;
    const allSelected = Array.from(selected);
    const toExport = allSelected.length > 0
      ? contacts.filter(c => allSelected.includes(c.id))
      : contacts;

    const header = 'First Name,Last Name,Phone,Email,Status,Date Added';
    const rows = toExport.map(c =>
      [c.first_name, c.last_name, c.phone || '', c.email || '', c.outreach_status, formatDate(c.created_at)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumni-${chapter?.chapter_name || chapterId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {sortBy === field && (
          <ChevronDown
            size={14}
            style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
          />
        )}
      </span>
    </th>
  );

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-header-content">
          <Link href="/nucleus/customer-success" className="module-back">
            <ArrowLeft size={20} />
            Back to Customer Success
          </Link>
          <div className="module-title-row">
            <div className="module-icon" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
              <Users size={24} />
            </div>
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
          <div className="module-stat">
            <span className="module-stat-value">{stats.total}</span>
            <span className="module-stat-label"><Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Total Alumni</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value" style={{ color: '#8b5cf6' }}>{stats.have_phone}</span>
            <span className="module-stat-label"><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Have Phone</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value" style={{ color: '#3b82f6' }}>{stats.have_email}</span>
            <span className="module-stat-label"><Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Have Email</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value" style={{ color: '#10b981' }}>{stats.contacted}</span>
            <span className="module-stat-label"><UserCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Contacted</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="module-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={16} style={{ color: '#6b7280' }} />
              <select
                className="module-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                {Object.entries(OUTREACH_STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            {selected.size > 0 && (
              <>
                <button className="module-filter-btn" onClick={() => setShowStatusModal(true)}>
                  Update Status ({selected.size})
                </button>
                <button className="module-filter-btn" onClick={exportCSV}>
                  <Download size={16} />
                  Export ({selected.size})
                </button>
                <button
                  className="module-filter-btn"
                  style={{ color: '#dc2626', borderColor: '#fecaca' }}
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={16} />
                  Delete ({selected.size})
                </button>
              </>
            )}
            {selected.size === 0 && (
              <button className="module-filter-btn" onClick={exportCSV} disabled={contacts.length === 0}>
                <Download size={16} />
                Export CSV
              </button>
            )}
            <button className="module-primary-btn" onClick={() => setShowImportModal(true)}>
              <Upload size={18} />
              Import CSV
            </button>
          </div>
        </div>

        {/* Contact Table */}
        {loading ? (
          <div className="module-loading">Loading alumni contacts...</div>
        ) : contacts.length === 0 && !search && filterStatus === 'all' ? (
          <div className="module-empty-state">
            <FileSpreadsheet size={48} />
            <h3>No alumni contacts yet</h3>
            <p>Import a CSV file to get started with alumni outreach.</p>
            <button
              className="module-primary-btn"
              style={{ marginTop: '16px' }}
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={18} />
              Import CSV
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="module-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={contacts.length > 0 && selected.size === contacts.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <SortHeader field="first_name">Name</SortHeader>
                    <SortHeader field="phone">Phone</SortHeader>
                    <SortHeader field="email">Email</SortHeader>
                    <SortHeader field="outreach_status">Status</SortHeader>
                    <SortHeader field="created_at">Date Added</SortHeader>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={selected.has(contact.id) ? 'selected' : ''}
                      style={{ background: selected.has(contact.id) ? '#f0f4ff' : undefined }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {contact.first_name} {contact.last_name}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {formatPhone(contact.phone)}
                      </td>
                      <td>{contact.email || '—'}</td>
                      <td><StatusBadge status={contact.outreach_status} /></td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{formatDate(contact.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                padding: '12px 16px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
              }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="module-filter-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="module-filter-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 && (search || filterStatus !== 'all') && (
              <div className="module-empty-state" style={{ padding: '48px' }}>
                <Search size={36} />
                <h3>No results found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay className="module-modal-overlay" onClose={resetImportModal}>
          <div className="module-modal module-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>Import Alumni CSV</h2>
              <button className="module-modal-close" onClick={resetImportModal}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              {!importResult ? (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                        handleFileSelect(file);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? '#8b5cf6' : '#d1d5db'}`,
                      borderRadius: '12px',
                      padding: '40px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragOver ? '#f5f3ff' : '#fafafa',
                      transition: 'all 0.2s ease',
                      marginBottom: '16px',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                    <Upload size={32} style={{ color: '#8b5cf6', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                      {importFile ? importFile.name : 'Drop your CSV file here'}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'or click to browse'}
                    </p>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '16px' }}>
                    Expected columns: First Name, Last Name, Phone, Email. We accept common aliases and are case-insensitive.
                  </p>

                  {/* Preview */}
                  {importPreview && importPreview.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>
                        Preview (first {Math.min(importPreview.length - 1, 5)} rows)
                      </h4>
                      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <table className="module-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              {importPreview[0].map((header, i) => (
                                <th key={i} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(1).map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci} style={{ fontSize: '0.8125rem' }}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Import Result */
                <div>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                    padding: '24px',
                    borderRadius: '12px',
                    background: importResult.imported > 0 ? '#f0fdf4' : '#fef2f2',
                  }}>
                    {importResult.imported > 0 ? (
                      <CheckCircle2 size={40} style={{ color: '#16a34a', marginBottom: '8px' }} />
                    ) : (
                      <AlertCircle size={40} style={{ color: '#dc2626', marginBottom: '8px' }} />
                    )}
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '4px' }}>
                      {importResult.imported > 0 ? 'Import Complete' : 'Import Failed'}
                    </h3>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{importResult.imported}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Imported</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{importResult.duplicates}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Duplicates</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{importResult.skipped}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Skipped</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '12px',
                      background: '#fef2f2',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                    }}>
                      <strong style={{ display: 'block', marginBottom: '8px' }}>Errors:</strong>
                      {importResult.errors.slice(0, 20).map((err, i) => (
                        <div key={i} style={{ color: '#991b1b', marginBottom: '4px' }}>
                          {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                        </div>
                      ))}
                      {importResult.errors.length > 20 && (
                        <div style={{ color: '#6b7280', marginTop: '8px' }}>
                          ...and {importResult.errors.length - 20} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={resetImportModal}>
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  className="module-primary-btn"
                  onClick={doImport}
                  disabled={!importFile || importing}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Bulk Status Update Modal */}
      {showStatusModal && (
        <ModalOverlay className="module-modal-overlay" onClose={() => setShowStatusModal(false)}>
          <div className="module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>Update Status</h2>
              <button className="module-modal-close" onClick={() => setShowStatusModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Update status for {selected.size} selected contact{selected.size > 1 ? 's' : ''}.
              </p>
              <div className="module-form-group">
                <label>New Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as OutreachStatus)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                  }}
                >
                  {Object.entries(OUTREACH_STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button className="module-primary-btn" onClick={bulkUpdateStatus}>
                Update {selected.size} Contact{selected.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm}
        title="Delete Contacts"
        message={`Are you sure you want to delete ${selected.size} selected contact${selected.size > 1 ? 's' : ''}? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={bulkDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
