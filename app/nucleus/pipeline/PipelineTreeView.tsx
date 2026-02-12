'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Edit2, User } from 'lucide-react';
import { Deal, DealStage, STAGE_CONFIG } from '@/lib/supabase';
import { getConferenceForDeal } from '@/lib/conference-map';

/** Tree color by stage (family tree spec) */
const TREE_STAGE_COLORS: Partial<Record<DealStage, string>> = {
  closed_won: '#10b981',
  contract_sent: '#3b82f6',
  demo_booked: '#eab308',
  first_demo: '#eab308',
  second_call: '#eab308',
  lead: '#6b7280',
  closed_lost: '#9ca3af',
  hold_off: '#9ca3af',
};

function getTreeStageColor(stage: DealStage): string {
  return TREE_STAGE_COLORS[stage] ?? '#6b7280';
}

export type SchoolPipelineStatus = 'Active Client' | 'Pipeline' | 'IFC Pipeline' | 'New Target';

function getSchoolPipelineStatus(deals: Deal[]): SchoolPipelineStatus {
  const hasClosedWon = deals.some(d => d.stage === 'closed_won');
  const hasContractOrClosed = deals.some(d => ['contract_sent', 'closed_won'].includes(d.stage));
  const hasDemoStages = deals.some(d => ['demo_booked', 'first_demo', 'second_call'].includes(d.stage));
  if (hasClosedWon) return 'Active Client';
  if (hasContractOrClosed) return 'Pipeline';
  if (hasDemoStages) return 'IFC Pipeline';
  return 'New Target';
}

interface TreeChapter {
  key: string;
  name: string;
  deals: Deal[];
}

interface TreeSchool {
  key: string;
  name: string;
  chapters: Map<string, TreeChapter>;
  deals: Deal[];
}

interface TreeConference {
  key: string;
  name: string;
  schools: Map<string, TreeSchool>;
  deals: Deal[];
}

function buildTree(deals: Deal[]): Map<string, TreeConference> {
  const byConference = new Map<string, TreeConference>();
  for (const deal of deals) {
    const confName = getConferenceForDeal(deal);
    if (!byConference.has(confName)) {
      byConference.set(confName, { key: `conf-${confName}`, name: confName, schools: new Map(), deals: [] });
    }
    const conf = byConference.get(confName)!;
    conf.deals.push(deal);

    const schoolName = deal.organization?.trim() || 'Unknown School';
    if (!conf.schools.has(schoolName)) {
      conf.schools.set(schoolName, { key: `school-${schoolName}`, name: schoolName, chapters: new Map(), deals: [] });
    }
    const school = conf.schools.get(schoolName)!;
    school.deals.push(deal);

    const chapterName = deal.fraternity?.trim() || 'Unknown Chapter';
    if (!school.chapters.has(chapterName)) {
      school.chapters.set(chapterName, { key: `chapter-${schoolName}-${chapterName}`, name: chapterName, deals: [] });
    }
    const chapter = school.chapters.get(chapterName)!;
    chapter.deals.push(deal);
  }
  return byConference;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

interface PipelineTreeViewProps {
  deals: Deal[];
  onEditDeal: (deal: Deal) => void;
  filterStage: DealStage | 'all';
  filterConference: string;
  filterSchool: string;
  filterDateFrom: string;
  searchQuery: string;
}

export default function PipelineTreeView({
  deals,
  onEditDeal,
  filterStage,
  filterConference,
  filterSchool,
  filterDateFrom,
  searchQuery,
}: PipelineTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredDeals = useMemo(() => {
    let list = deals.filter(d => d.stage !== 'closed_lost');
    if (filterStage !== 'all') list = list.filter(d => d.stage === filterStage);
    if (filterConference) list = list.filter(d => getConferenceForDeal(d) === filterConference);
    if (filterSchool) list = list.filter(d => (d.organization?.trim() || '').toLowerCase() === filterSchool.toLowerCase());
    if (filterDateFrom) list = list.filter(d => d.created_at && d.created_at >= filterDateFrom);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        d =>
          (d.organization?.toLowerCase().includes(q)) ||
          (d.fraternity?.toLowerCase().includes(q)) ||
          (d.contact_name?.toLowerCase().includes(q)) ||
          (d.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [deals, filterStage, filterConference, filterSchool, filterDateFrom, searchQuery]);

  const tree = useMemo(() => buildTree(filteredDeals), [filteredDeals]);

  const stats = useMemo(() => {
    const schools = new Set(filteredDeals.map(d => d.organization?.trim()).filter(Boolean));
    const chapters = new Set(filteredDeals.map(d => `${d.organization?.trim() || ''}|${d.fraternity?.trim() || ''}`));
    const pipelineValue = filteredDeals
      .filter(d => !['closed_won', 'hold_off'].includes(d.stage))
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    const closedArr = filteredDeals
      .filter(d => d.stage === 'closed_won')
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    const totalDeals = filteredDeals.length;
    const closedCount = filteredDeals.filter(d => d.stage === 'closed_won').length;
    const closeRate = totalDeals ? Math.round((closedCount / totalDeals) * 100) : 0;
    return {
      schools: schools.size,
      chapters: chapters.size,
      pipelineValue,
      closedArr,
      closeRate,
    };
  }, [filteredDeals]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const conferenceNames = useMemo(() => Array.from(tree.keys()).sort(), [tree]);
  const hasExpandedDefault = useRef(false);
  useEffect(() => {
    if (conferenceNames.length > 0 && !hasExpandedDefault.current) {
      hasExpandedDefault.current = true;
      setExpanded(prev => {
        const next = new Set(prev);
        conferenceNames.forEach(c => next.add(`conf-${c}`));
        return next;
      });
    }
  }, [conferenceNames]);

  return (
    <div className="pipeline-tree-view">
      <div className="pipeline-tree-stats">
        <div className="pipeline-tree-stat-card">
          <span className="pipeline-tree-stat-value">{stats.schools}</span>
          <span className="pipeline-tree-stat-label">Schools</span>
        </div>
        <div className="pipeline-tree-stat-card">
          <span className="pipeline-tree-stat-value">{stats.chapters}</span>
          <span className="pipeline-tree-stat-label">Chapters</span>
        </div>
        <div className="pipeline-tree-stat-card">
          <span className="pipeline-tree-stat-value">{formatCurrency(stats.pipelineValue)}</span>
          <span className="pipeline-tree-stat-label">Pipeline</span>
        </div>
        <div className="pipeline-tree-stat-card pipeline-tree-stat-card-highlight">
          <span className="pipeline-tree-stat-value">{formatCurrency(stats.closedArr)}</span>
          <span className="pipeline-tree-stat-label">Closed ARR</span>
        </div>
        <div className="pipeline-tree-stat-card">
          <span className="pipeline-tree-stat-value">{stats.closeRate}%</span>
          <span className="pipeline-tree-stat-label">Close Rate</span>
        </div>
      </div>

      <div className="pipeline-tree-nodes">
        {conferenceNames.length === 0 ? (
          <div className="pipeline-tree-empty">
            <p>No deals match the current filters.</p>
          </div>
        ) : (
          <div className="pipeline-tree-list">
            {conferenceNames.map(confName => {
              const conf = tree.get(confName)!;
              const confId = conf.key;
              const isConfOpen = expanded.has(confId);
              const schoolCount = conf.schools.size;
              const totalChapters = Array.from(conf.schools.values()).reduce((s, sch) => s + sch.chapters.size, 0);
              const confArr = conf.deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + (Number(d.value) || 0), 0);

              return (
                <div key={confId} className="pipeline-tree-branch pipeline-tree-branch-conference">
                  <button
                    type="button"
                    className="pipeline-tree-node pipeline-tree-node-conference"
                    onClick={() => toggle(confId)}
                  >
                    <span className="pipeline-tree-chevron">{isConfOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                    <span className="pipeline-tree-node-main">
                      <span className="pipeline-tree-node-label">{conf.name}</span>
                      <span className="pipeline-tree-node-badges">
                        <span className="pipeline-tree-badge">{schoolCount} schools</span>
                        <span className="pipeline-tree-badge">{totalChapters} chapters</span>
                        <span className="pipeline-tree-badge pipeline-tree-badge-arr">{formatCurrency(confArr)} ARR</span>
                      </span>
                    </span>
                  </button>
                  {isConfOpen && (
                    <div className="pipeline-tree-children pipeline-tree-children-school">
                      {Array.from(conf.schools.entries())
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([schoolName, school]) => {
                          const schoolId = school.key;
                          const isSchoolOpen = expanded.has(schoolId);
                          const schoolStatus = getSchoolPipelineStatus(school.deals);
                          const schoolArr = school.deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + (Number(d.value) || 0), 0);

                          const isSchoolActive = schoolStatus === 'Active Client';
                          return (
                            <div key={schoolId} className="pipeline-tree-branch pipeline-tree-branch-school">
                              <button
                                type="button"
                                className={`pipeline-tree-node pipeline-tree-node-school ${isSchoolActive ? 'pipeline-tree-node-school-active' : ''}`}
                                onClick={() => toggle(schoolId)}
                              >
                                <span className="pipeline-tree-chevron">{isSchoolOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                                <span className="pipeline-tree-node-main">
                                  <span className="pipeline-tree-node-label">{school.name}</span>
                                  <span className={`pipeline-tree-status pipeline-tree-status-${schoolStatus.replace(/\s+/g, '-').toLowerCase()}`}>
                                    {schoolStatus.toUpperCase().replace(/\s+/g, ' ')}
                                  </span>
                                  {schoolArr > 0 && (
                                    <span className="pipeline-tree-node-value">{formatCurrency(schoolArr)} ARR</span>
                                  )}
                                </span>
                              </button>
                              {isSchoolOpen && (
                                <div className="pipeline-tree-children pipeline-tree-children-chapter">
                                  {Array.from(school.chapters.entries())
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([chapterName, chapter]) => {
                                      const chapterId = chapter.key;
                                      const isChapterOpen = expanded.has(chapterId);
                                      const primaryDeal = chapter.deals[0];
                                      const stage = primaryDeal?.stage ?? 'lead';
                                      const color = getTreeStageColor(stage);
                                      const value = chapter.deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
                                      const isClosed = stage === 'closed_won';

                                      return (
                                        <div key={chapterId} className="pipeline-tree-branch pipeline-tree-branch-chapter">
                                          <button
                                            type="button"
                                            className={`pipeline-tree-node pipeline-tree-node-chapter ${isClosed ? 'pipeline-tree-node-chapter-closed' : ''}`}
                                            style={{ ['--stage-color' as string]: color }}
                                            onClick={() => toggle(chapterId)}
                                          >
                                            <span className="pipeline-tree-chevron">{isChapterOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                                            <span className="pipeline-tree-node-main">
                                              <span className="pipeline-tree-node-label">{chapter.name}</span>
                                              <span className="pipeline-tree-stage-badge" style={!isClosed ? { backgroundColor: `${color}20`, color } : undefined}>
                                                {STAGE_CONFIG[stage]?.label ?? stage}
                                              </span>
                                              {value > 0 && <span className="pipeline-tree-node-value">{formatCurrency(value)}</span>}
                                            </span>
                                          </button>
                                          {isChapterOpen && (
                                            <div className="pipeline-tree-children pipeline-tree-children-contact">
                                              {chapter.deals.map(deal => (
                                                <div
                                                  key={deal.id}
                                                  className="pipeline-tree-node pipeline-tree-node-contact"
                                                  style={{ ['--stage-color' as string]: getTreeStageColor(deal.stage) }}
                                                >
                                                  <span className="pipeline-tree-chevron pipeline-tree-chevron-placeholder" />
                                                  <span className="pipeline-tree-node-main">
                                                    <User size={14} className="pipeline-tree-contact-icon" />
                                                    <span className="pipeline-tree-node-label">{deal.contact_name || deal.name}</span>
                                                    {deal.expected_close && (
                                                      <span className="pipeline-tree-stage-badge pipeline-tree-stage-badge-date">
                                                        Estimated Close: {deal.expected_close}
                                                      </span>
                                                    )}
                                                    <span className="pipeline-tree-stage-badge" style={{
                                                      backgroundColor: deal.stage === 'closed_won' ? '#10b981' : `${getTreeStageColor(deal.stage)}30`,
                                                      color: deal.stage === 'closed_won' ? 'white' : getTreeStageColor(deal.stage),
                                                    }}>
                                                      {STAGE_CONFIG[deal.stage]?.label ?? deal.stage}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      className="pipeline-tree-edit-btn"
                                                      onClick={() => onEditDeal(deal)}
                                                      title="Edit in CRM"
                                                    >
                                                      <Edit2 size={14} />
                                                      <span>Edit</span>
                                                    </button>
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
