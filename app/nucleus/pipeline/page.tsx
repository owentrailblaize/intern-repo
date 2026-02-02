'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, Plus, Search, Filter, X, Trash2, Edit2, Upload, Image, FileSpreadsheet, Loader2, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase, Deal } from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';

interface ParsedDeal {
  name: string;
  organization: string;
  contact_name: string;
  value: number;
  email: string;
  phone: string;
  notes: string;
  selected?: boolean;
}

export default function PipelineModule() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    contact_name: '',
    value: 0,
    stage: 'discovery' as Deal['stage'],
    probability: 10,
    expected_close: '',
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

  // Fetch deals
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
    }
    setLoading(false);
  }

  // Create deal
  async function createDeal() {
    if (!supabase) return;
    const { error } = await supabase
      .from('deals')
      .insert([formData]);

    if (error) {
      console.error('Error creating deal:', error);
      alert('Failed to create deal');
    } else {
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
      value: 0,
      stage: 'discovery',
      probability: 10,
      expected_close: '',
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImportError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Convert to base64
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

      // Mark all deals as selected by default
      setParsedDeals(data.deals.map((d: ParsedDeal) => ({ ...d, selected: true })));
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

    try {
      // Transform parsed deals to match the deals table schema
      const dealsToInsert = selectedDeals.map(d => ({
        name: d.name,
        organization: d.organization || null,
        contact_name: d.contact_name || null,
        value: d.value || 0,
        stage: 'discovery' as const,
        probability: 10,
        expected_close: null,
      }));

      const { error } = await supabase.from('deals').insert(dealsToInsert);

      if (error) {
        throw error;
      }

      setImportSuccess(true);
      fetchDeals();

      // Close modal after brief success message
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
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expected_close: deal.expected_close || '',
    });
    setShowModal(true);
  }

  // Filter deals
  const filteredDeals = deals.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.organization && d.organization.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate stats
  const pipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length;
  const wonThisMonth = deals.filter(d => {
    if (d.stage !== 'closed_won') return false;
    const created = new Date(d.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const avgDealSize = deals.length > 0 ? pipelineValue / deals.length : 0;

  const stageLabels: Record<Deal['stage'], string> = {
    discovery: 'Discovery',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  };

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  return (
    <div className="module-page">
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
              <p>Monitor deals, track velocity, and manage opportunities through your funnel.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="module-main">
        {/* Stats Row */}
        <div className="module-stats-row">
          <div className="module-stat">
            <span className="module-stat-value">{formatCurrency(pipelineValue)}</span>
            <span className="module-stat-label">Pipeline Value</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{activeDeals}</span>
            <span className="module-stat-label">Active Deals</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{wonThisMonth}</span>
            <span className="module-stat-label">Won This Month</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">{formatCurrency(avgDealSize)}</span>
            <span className="module-stat-label">Avg Deal Size</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="module-actions">
            <button className="module-filter-btn">
              <Filter size={16} />
              Filter
            </button>
            <button className="module-primary-btn" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              Create Deal
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="module-table-container">
          {loading ? (
            <div className="module-loading">Loading...</div>
          ) : filteredDeals.length > 0 ? (
            <table className="module-table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Organization</th>
                  <th>Value</th>
                  <th>Stage</th>
                  <th>Probability</th>
                  <th>Expected Close</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td className="module-table-name">{deal.name}</td>
                    <td>{deal.organization}</td>
                    <td>{formatCurrency(deal.value)}</td>
                    <td>
                      <span className={`module-status ${deal.stage}`}>{stageLabels[deal.stage]}</span>
                    </td>
                    <td>{deal.probability}%</td>
                    <td>{deal.expected_close || '—'}</td>
                    <td>
                      <div className="module-table-actions">
                        <button className="module-table-action" onClick={() => openEditModal(deal)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="module-table-action delete" onClick={() => setDeleteConfirm({ show: true, id: deal.id })}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="module-empty-state">
              <TrendingUp size={48} />
              <h3>No deals in pipeline</h3>
              <p>Create your first deal to start tracking</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingDeal ? 'Edit Deal' : 'Create Deal'}</h2>
              <button className="module-modal-close" onClick={() => resetForm()}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <div className="module-form-group">
                <label>Deal Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Annual Subscription"
                />
              </div>
              <div className="module-form-group">
                <label>Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="module-form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Main contact"
                />
              </div>
              <div className="module-form-group">
                <label>Value ($)</label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="module-form-group">
                <label>Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as Deal['stage'] })}
                >
                  <option value="discovery">Discovery</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
              <div className="module-form-group">
                <label>Probability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
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
            <div className="module-modal-footer">
              <button className="module-cancel-btn" onClick={() => resetForm()}>
                Cancel
              </button>
              <button
                className="module-primary-btn"
                onClick={editingDeal ? updateDeal : createDeal}
                disabled={!formData.name}
              >
                {editingDeal ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Delete Deal"
        message="Are you sure you want to delete this deal from the pipeline?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirm.id && deleteDeal(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />
    </div>
  );
}
