'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, AlertTriangle, Flame } from 'lucide-react';
import { supabase, Deal, DealStage, STAGE_CONFIG } from '@/lib/supabase';
import { TrailblaizeCalendar } from './TrailblaizeCalendar';
import { useGoogleIntegration } from '../hooks/useGoogleIntegration';
import { UseWorkspaceDataReturn } from '../hooks/useWorkspaceData';
import { Employee } from '@/lib/supabase';

const STAGE_ORDER: DealStage[] = ['lead', 'demo_booked', 'first_demo', 'second_call', 'contract_sent', 'closed_won'];

const FUNNEL_COLORS: Record<string, string> = {
  lead: '#D1D5DB',
  demo_booked: '#9CA3AF',
  first_demo: '#6B7280',
  second_call: '#4B5563',
  contract_sent: '#374151',
  closed_won: '#10B981',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function relativeDate(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  if (diff === -1) return 'Yesterday';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff}d`;
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

interface CommandCenterProps {
  data: UseWorkspaceDataReturn;
  teamMembers: Employee[];
  firstName: string;
}

export function CommandCenter({ data, firstName }: CommandCenterProps) {
  const { currentEmployee } = data;
  const google = useGoogleIntegration(currentEmployee?.id);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    async function fetchDeals() {
      if (!supabase) return;
      const { data: d } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
      if (d) setDeals(d);
    }
    fetchDeals();
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // ---- Priority Actions ----
  const overdueDeals = useMemo(() =>
    deals
      .filter(d => d.next_followup && new Date(d.next_followup) < now && !['closed_won', 'closed_lost', 'hold_off'].includes(d.stage))
      .sort((a, b) => new Date(a.next_followup).getTime() - new Date(b.next_followup).getTime()),
    [deals, now]
  );

  const todayDeals = useMemo(() =>
    deals.filter(d => d.next_followup && d.next_followup.startsWith(todayStr) && !['closed_won', 'closed_lost', 'hold_off'].includes(d.stage)),
    [deals, todayStr]
  );

  const hotDeals = useMemo(() =>
    deals
      .filter(d => (d.temperature === 'hot' || ['second_call', 'contract_sent'].includes(d.stage)) && !['closed_won', 'closed_lost', 'hold_off'].includes(d.stage))
      .sort((a, b) => (b.value || 0) - (a.value || 0)),
    [deals]
  );

  // ---- Pipeline Snapshot ----
  const activeDeals = deals.filter(d => !['closed_won', 'closed_lost', 'hold_off'].includes(d.stage));
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const closedWon = deals.filter(d => d.stage === 'closed_won');
  const arrSold = closedWon.reduce((s, d) => s + (d.value || 0), 0);
  const mrrSold = arrSold / 12;
  const closeRate = deals.length ? Math.round((closedWon.length / deals.length) * 100) : 0;

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGE_ORDER.forEach(s => { counts[s] = 0; });
    deals.forEach(d => {
      if (counts[d.stage] !== undefined) counts[d.stage]++;
    });
    return counts;
  }, [deals]);

  const totalForFunnel = STAGE_ORDER.reduce((s, st) => s + stageCounts[st], 0);

  // ---- Upcoming follow-ups (next 7 days) ----
  const upcomingFollowups = useMemo(() => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    return deals
      .filter(d => d.next_followup && new Date(d.next_followup) > now && new Date(d.next_followup) <= future && !['closed_won', 'closed_lost', 'hold_off'].includes(d.stage))
      .sort((a, b) => new Date(a.next_followup).getTime() - new Date(b.next_followup).getTime());
  }, [deals, now]);

  // Group upcoming by day
  const upcomingByDay = useMemo(() => {
    const groups: { day: string; deals: Deal[] }[] = [];
    let currentDay = '';
    upcomingFollowups.forEach(d => {
      const day = d.next_followup.split('T')[0];
      if (day !== currentDay) {
        currentDay = day;
        groups.push({ day, deals: [] });
      }
      groups[groups.length - 1].deals.push(d);
    });
    return groups;
  }, [upcomingFollowups]);

  // Urgent stat for greeting
  const urgentCount = overdueDeals.length + todayDeals.length;

  return (
    <div className="cc-dashboard">
      {/* Greeting */}
      <div>
        <div className="cc-greeting">
          <span className="cc-greeting-text">
            {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {firstName}
          </span>
          <span className="cc-greeting-date">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div className="cc-greeting-stat">
          {urgentCount > 0 ? (
            <><strong>{urgentCount} lead{urgentCount !== 1 ? 's' : ''}</strong> need follow-up today</>
          ) : (
            <><strong>{formatCurrency(pipelineValue)}</strong> in pipeline across <strong>{activeDeals.length}</strong> active leads</>
          )}
        </div>
      </div>

      {/* Section 1: Priority Actions */}
      <div>
        <div className="cc-section-title">
          Today&apos;s Priorities
          <span className="cc-section-title-right">{todayStr}</span>
        </div>
        <div className="cc-priorities">
          {/* Overdue */}
          <div className="cc-priority-card">
            <div className="cc-priority-header">
              <span className="cc-priority-title">Overdue</span>
              {overdueDeals.length > 0 && <span className="cc-priority-badge red">{overdueDeals.length}</span>}
            </div>
            {overdueDeals.length > 0 ? (
              <div className="cc-priority-list">
                {overdueDeals.slice(0, 5).map(d => (
                  <Link key={d.id} href="/nucleus/pipeline" className="cc-priority-row">
                    <span className="cc-priority-name">{d.contact_name || d.name}</span>
                    <span className="cc-priority-meta overdue">{relativeDate(d.next_followup)}</span>
                  </Link>
                ))}
                {overdueDeals.length > 5 && (
                  <Link href="/nucleus/pipeline" className="cc-view-all">
                    View all {overdueDeals.length} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ) : (
              <div className="cc-priority-empty">
                <CheckCircle size={16} /> All caught up
              </div>
            )}
          </div>

          {/* Due Today */}
          <div className="cc-priority-card">
            <div className="cc-priority-header">
              <span className="cc-priority-title">Due Today</span>
              {todayDeals.length > 0 && <span className="cc-priority-badge">{todayDeals.length}</span>}
            </div>
            {todayDeals.length > 0 ? (
              <div className="cc-priority-list">
                {todayDeals.slice(0, 5).map(d => (
                  <Link key={d.id} href="/nucleus/pipeline" className="cc-priority-row">
                    <span className="cc-priority-name">{d.contact_name || d.name}</span>
                    <span className="cc-priority-meta">{d.organization || ''}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="cc-priority-empty">
                <CheckCircle size={16} /> No follow-ups due
              </div>
            )}
          </div>

          {/* Hot Leads */}
          <div className="cc-priority-card">
            <div className="cc-priority-header">
              <span className="cc-priority-title">Hot Leads</span>
              {hotDeals.length > 0 && <span className="cc-priority-badge">{hotDeals.length}</span>}
            </div>
            {hotDeals.length > 0 ? (
              <div className="cc-priority-list">
                {hotDeals.slice(0, 5).map(d => (
                  <Link key={d.id} href="/nucleus/pipeline" className="cc-priority-row">
                    <span className="cc-priority-name">{d.contact_name || d.name}</span>
                    <span className="cc-priority-value">{formatCurrency(d.value)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="cc-priority-empty">
                <Flame size={16} /> No hot leads yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Pipeline Snapshot */}
      <div>
        <div className="cc-section-title">Pipeline</div>
        <div className="cc-pipeline">
          <div className="cc-stats-row">
            <div className="cc-stat">
              <div className="cc-stat-number green">{formatCurrency(pipelineValue)}</div>
              <div className="cc-stat-label">Pipeline</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-number">{activeDeals.length}</div>
              <div className="cc-stat-label">Active</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-number green">{formatCurrency(arrSold)}</div>
              <div className="cc-stat-label">ARR Sold</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-number green">{formatCurrency(mrrSold)}</div>
              <div className="cc-stat-label">MRR Sold</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-number">{closedWon.length}</div>
              <div className="cc-stat-label">Won</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-number">{closeRate}%</div>
              <div className="cc-stat-label">Close Rate</div>
            </div>
          </div>

          {/* Funnel */}
          {totalForFunnel > 0 && (
            <>
              <div className="cc-funnel">
                {STAGE_ORDER.map(stage => {
                  const count = stageCounts[stage];
                  if (!count) return null;
                  return (
                    <div
                      key={stage}
                      className="cc-funnel-seg"
                      style={{
                        flex: count,
                        background: FUNNEL_COLORS[stage] || '#D1D5DB',
                      }}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
              <div className="cc-funnel-labels">
                {STAGE_ORDER.map(stage => (
                  <span key={stage} className="cc-funnel-label">
                    <span className="cc-funnel-dot" style={{ background: FUNNEL_COLORS[stage] || '#D1D5DB' }} />
                    {STAGE_CONFIG[stage]?.label} ({stageCounts[stage]})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 3: Calendar + Upcoming */}
      <div>
        <div className="cc-bottom-grid">
          <div className="cc-activity-card">
            <div className="cc-section-title" style={{ marginBottom: 8 }}>Calendar</div>
            <TrailblaizeCalendar
              events={google.calendarEvents}
              loading={google.calendarLoading}
              connected={google.status?.connected || false}
              onConnect={google.connect}
              onRefresh={google.fetchCalendarEvents}
            />
          </div>
          <div className="cc-upcoming-card">
            <div className="cc-section-title" style={{ marginBottom: 8 }}>Upcoming Follow-ups</div>
            {upcomingByDay.length > 0 ? (
              upcomingByDay.map(group => (
                <div key={group.day}>
                  <div className="cc-upcoming-day">{dayLabel(group.day)}</div>
                  {group.deals.map(d => (
                    <Link key={d.id} href="/nucleus/pipeline" className="cc-upcoming-row">
                      <span className="cc-upcoming-name">{d.contact_name || d.name}</span>
                      <span className="cc-upcoming-school">{d.organization || ''}</span>
                    </Link>
                  ))}
                </div>
              ))
            ) : (
              <div className="cc-priority-empty" style={{ padding: '24px 0' }}>
                <CheckCircle size={16} /> No upcoming follow-ups
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
