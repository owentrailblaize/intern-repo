'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, HeartHandshake, Plus, Search, X, Trash2, Edit2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { supabase, Chapter, ONBOARDING_STEPS } from '@/lib/supabase';

export default function CustomerSuccessModule() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    chapter_name: '',
    school: '',
    fraternity: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'onboarding' as Chapter['status'],
    health: 'good' as Chapter['health'],
    mrr: 0,
    next_action: '',
    notes: '',
  });

  useEffect(() => {
    fetchChapters();
  }, []);

  async function fetchChapters() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching chapters:', error);
    } else {
      setChapters(data || []);
    }
    setLoading(false);
  }

  async function createChapter() {
    if (!supabase) {
      alert('Database not connected');
      return;
    }
    if (!formData.chapter_name.trim()) {
      alert('Chapter name is required');
      return;
    }

    const { error } = await supabase
      .from('chapters')
      .insert([{
        ...formData,
        chapter_created: true,
        onboarding_started: new Date().toISOString().split('T')[0],
      }]);

    if (error) {
      console.error('Error creating chapter:', error);
      alert(`Failed to create chapter: ${error.message}`);
    } else {
      resetForm();
      fetchChapters();
    }
  }

  async function updateChapter() {
    if (!supabase || !editingChapter) return;

    const { error } = await supabase
      .from('chapters')
      .update(formData)
      .eq('id', editingChapter.id);

    if (error) {
      console.error('Error updating chapter:', error);
      alert(`Failed to update chapter: ${error.message}`);
    } else {
      resetForm();
      fetchChapters();
    }
  }

  async function toggleOnboardingStep(chapter: Chapter, stepKey: string) {
    if (!supabase) return;
    
    const currentValue = chapter[stepKey as keyof Chapter];
    const newValue = !currentValue;
    
    // Check if all steps are now complete
    const allSteps = ONBOARDING_STEPS.map(s => s.key);
    const updatedSteps = { ...chapter, [stepKey]: newValue };
    const completedCount = allSteps.filter(key => 
      key === stepKey ? newValue : updatedSteps[key as keyof Chapter]
    ).length;
    
    const updateData: Record<string, unknown> = {
      [stepKey]: newValue,
      last_activity: new Date().toISOString().split('T')[0],
    };
    
    // Auto-update status when onboarding is complete
    if (completedCount === allSteps.length) {
      updateData.status = 'active';
      updateData.onboarding_completed = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('chapters')
      .update(updateData)
      .eq('id', chapter.id);

    if (error) {
      console.error('Error updating step:', error);
    } else {
      fetchChapters();
    }
  }

  async function deleteChapter(id: string) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter');
    } else {
      fetchChapters();
    }
  }

  function resetForm() {
    setFormData({
      chapter_name: '',
      school: '',
      fraternity: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'onboarding',
      health: 'good',
      mrr: 0,
      next_action: '',
      notes: '',
    });
    setEditingChapter(null);
    setShowModal(false);
  }

  function openEditModal(chapter: Chapter) {
    setEditingChapter(chapter);
    setFormData({
      chapter_name: chapter.chapter_name,
      school: chapter.school || '',
      fraternity: chapter.fraternity || '',
      contact_name: chapter.contact_name || '',
      contact_email: chapter.contact_email || '',
      contact_phone: chapter.contact_phone || '',
      status: chapter.status,
      health: chapter.health,
      mrr: chapter.mrr || 0,
      next_action: chapter.next_action || '',
      notes: chapter.notes || '',
    });
    setShowModal(true);
  }

  function getCompletionPercentage(chapter: Chapter): number {
    const completed = ONBOARDING_STEPS.filter(step => 
      chapter[step.key as keyof Chapter]
    ).length;
    return Math.round((completed / ONBOARDING_STEPS.length) * 100);
  }

  function getCompletedStepsCount(chapter: Chapter): number {
    return ONBOARDING_STEPS.filter(step => 
      chapter[step.key as keyof Chapter]
    ).length;
  }

  // Filter chapters
  const filteredChapters = chapters.filter(c => {
    const matchesSearch = c.chapter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.school && c.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.fraternity && c.fraternity.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalChapters = chapters.length;
  const activeChapters = chapters.filter(c => c.status === 'active').length;
  const onboardingChapters = chapters.filter(c => c.status === 'onboarding').length;
  const totalMRR = chapters.reduce((sum, c) => sum + (c.mrr || 0), 0);

  const statusLabels: Record<Chapter['status'], string> = {
    onboarding: 'Onboarding',
    active: 'Active',
    at_risk: 'At Risk',
    churned: 'Churned',
  };

  const healthLabels: Record<Chapter['health'], string> = {
    good: 'Good',
    warning: 'Warning',
    critical: 'Critical',
  };

  // Group steps by category
  const stepsByCategory = {
    setup: ONBOARDING_STEPS.filter(s => s.category === 'setup'),
    alumni: ONBOARDING_STEPS.filter(s => s.category === 'alumni'),
    members: ONBOARDING_STEPS.filter(s => s.category === 'members'),
    training: ONBOARDING_STEPS.filter(s => s.category === 'training'),
    engagement: ONBOARDING_STEPS.filter(s => s.category === 'engagement'),
    social: ONBOARDING_STEPS.filter(s => s.category === 'social'),
  };

  const categoryLabels: Record<string, string> = {
    setup: '🚀 Setup',
    alumni: '👥 Alumni',
    members: '🎓 Members',
    training: '📚 Training',
    engagement: '💬 Engagement',
    social: '📱 Social',
  };

  return (
    <div className="module-page">
      <header className="module-header">
        <div className="module-header-content">
          <Link href="/nucleus" className="module-back">
            <ArrowLeft size={20} />
            Back to Nucleus
          </Link>
          <div className="module-title-row">
            <div className="module-icon" style={{ backgroundColor: '#ec489915', color: '#ec4899' }}>
              <HeartHandshake size={24} />
            </div>
            <div>
              <h1>Customer Success</h1>
              <p>Track chapter onboarding, engagement, and success metrics.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="module-main">
        {/* Stats Row */}
        <div className="module-stats-row">
          <div className="module-stat">
            <span className="module-stat-value">{totalChapters}</span>
            <span className="module-stat-label">Total Chapters</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value" style={{ color: '#10b981' }}>{activeChapters}</span>
            <span className="module-stat-label">Active</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value" style={{ color: '#f59e0b' }}>{onboardingChapters}</span>
            <span className="module-stat-label">Onboarding</span>
          </div>
          <div className="module-stat">
            <span className="module-stat-value">${totalMRR.toLocaleString()}</span>
            <span className="module-stat-label">Total MRR</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="module-actions-bar">
          <div className="module-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="module-actions">
            <select
              className="module-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="at_risk">At Risk</option>
              <option value="churned">Churned</option>
            </select>
            <button className="module-primary-btn" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              Add Chapter
            </button>
          </div>
        </div>

        {/* Chapters List */}
        <div className="chapters-list">
          {loading ? (
            <div className="module-loading">Loading...</div>
          ) : filteredChapters.length > 0 ? (
            filteredChapters.map((chapter) => (
              <div key={chapter.id} className="chapter-card">
                <div 
                  className="chapter-card-header"
                  onClick={() => setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id)}
                >
                  <div className="chapter-card-expand">
                    {expandedChapter === chapter.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <div className="chapter-card-info">
                    <h3>{chapter.chapter_name}</h3>
                    <span className="chapter-card-subtitle">
                      {chapter.fraternity}{chapter.fraternity && chapter.school ? ' • ' : ''}{chapter.school}
                    </span>
                  </div>
                  <div className="chapter-card-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${getCompletionPercentage(chapter)}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {getCompletedStepsCount(chapter)}/{ONBOARDING_STEPS.length} steps
                    </span>
                  </div>
                  <span className={`module-status ${chapter.status}`}>{statusLabels[chapter.status]}</span>
                  <span className={`module-health ${chapter.health}`}>{healthLabels[chapter.health]}</span>
                  <div className="chapter-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="module-table-action" onClick={() => openEditModal(chapter)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="module-table-action delete" onClick={() => deleteChapter(chapter.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expandedChapter === chapter.id && (
                  <div className="chapter-card-body">
                    <div className="onboarding-checklist">
                      {Object.entries(stepsByCategory).map(([category, steps]) => (
                        <div key={category} className="checklist-category">
                          <h4>{categoryLabels[category]}</h4>
                          <div className="checklist-items">
                            {steps.map((step) => (
                              <label key={step.key} className="checklist-item">
                                <input
                                  type="checkbox"
                                  checked={!!chapter[step.key as keyof Chapter]}
                                  onChange={() => toggleOnboardingStep(chapter, step.key)}
                                />
                                <span className="checkmark">
                                  {chapter[step.key as keyof Chapter] && <Check size={12} />}
                                </span>
                                <span className="checklist-label">{step.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {chapter.contact_name && (
                      <div className="chapter-contact">
                        <strong>Contact:</strong> {chapter.contact_name}
                        {chapter.contact_email && ` • ${chapter.contact_email}`}
                        {chapter.contact_phone && ` • ${chapter.contact_phone}`}
                      </div>
                    )}
                    {chapter.next_action && (
                      <div className="chapter-next-action">
                        <strong>Next Action:</strong> {chapter.next_action}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="module-empty-state">
              <HeartHandshake size={48} />
              <h3>No chapters yet</h3>
              <p>Add your first chapter to start tracking onboarding</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="module-modal-overlay" onClick={() => resetForm()}>
          <div className="module-modal module-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="module-modal-header">
              <h2>{editingChapter ? 'Edit Chapter' : 'Add Chapter'}</h2>
              <button className="module-modal-close" onClick={() => resetForm()}>
                <X size={20} />
              </button>
            </div>
            <div className="module-modal-body">
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Chapter Name *</label>
                  <input
                    type="text"
                    value={formData.chapter_name}
                    onChange={(e) => setFormData({ ...formData, chapter_name: e.target.value })}
                    placeholder="e.g. Ole Miss Phi Delt"
                  />
                </div>
                <div className="module-form-group">
                  <label>Fraternity</label>
                  <input
                    type="text"
                    value={formData.fraternity}
                    onChange={(e) => setFormData({ ...formData, fraternity: e.target.value })}
                    placeholder="e.g. Phi Delta Theta"
                  />
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>School</label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="e.g. University of Mississippi"
                  />
                </div>
                <div className="module-form-group">
                  <label>MRR ($)</label>
                  <input
                    type="number"
                    value={formData.mrr}
                    onChange={(e) => setFormData({ ...formData, mrr: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Main contact person"
                  />
                </div>
                <div className="module-form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="module-form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className="module-form-row">
                <div className="module-form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Chapter['status'] })}
                  >
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="at_risk">At Risk</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
                <div className="module-form-group">
                  <label>Health</label>
                  <select
                    value={formData.health}
                    onChange={(e) => setFormData({ ...formData, health: e.target.value as Chapter['health'] })}
                  >
                    <option value="good">Good</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="module-form-group">
                <label>Next Action</label>
                <input
                  type="text"
                  value={formData.next_action}
                  onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                  placeholder="What's the next step for this chapter?"
                />
              </div>
              <div className="module-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
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
                onClick={editingChapter ? updateChapter : createChapter}
                disabled={!formData.chapter_name}
              >
                {editingChapter ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
