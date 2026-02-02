'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  RefreshCw,
  Video,
  Coffee
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  colorId?: string;
}

type ViewMode = 'day' | 'week' | 'month';

interface TrailblaizeCalendarProps {
  events: CalendarEvent[];
  loading: boolean;
  connected: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

const eventColors = [
  '#14b8a6', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#ef4444'
];

export function TrailblaizeCalendar({
  events,
  loading,
  connected,
  onConnect,
  onRefresh
}: TrailblaizeCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Navigation
  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(currentDate);
    const delta = dir === 'next' ? 1 : -1;
    if (viewMode === 'day') d.setDate(d.getDate() + delta);
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Date helpers
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  };

  const getMonthWeeks = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const days: Date[] = [];
    
    // Pad start
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    // Current month
    const lastDay = new Date(year, month + 1, 0);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    // Pad end to complete 5 or 6 weeks
    while (days.length < 35) {
      days.push(new Date(year, month + 1, days.length - lastDay.getDate() - firstDay.getDay() + 1));
    }
    
    // Split into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.start.dateTime || e.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    }).sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date || '').getTime();
      const bTime = new Date(b.start.dateTime || b.start.date || '').getTime();
      return aTime - bTime;
    });
  };

  const getEventsForWeek = () => {
    const weekDays = getWeekDays();
    const start = weekDays[0];
    const end = weekDays[6];
    end.setHours(23, 59, 59, 999);
    
    return events.filter(e => {
      const eventDate = new Date(e.start.dateTime || e.start.date || '');
      return eventDate >= start && eventDate <= end;
    }).sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date || '').getTime();
      const bTime = new Date(b.start.dateTime || b.start.date || '').getTime();
      return aTime - bTime;
    });
  };

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return 'All day';
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getEventColor = (event: CalendarEvent, index: number) => {
    if (event.colorId) {
      const colorIndex = parseInt(event.colorId) % eventColors.length;
      return eventColors[colorIndex];
    }
    return eventColors[index % eventColors.length];
  };

  // Date label
  const getDateLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
      });
    }
    if (viewMode === 'week') {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const weekDays = getWeekDays();
  const monthWeeks = getMonthWeeks();
  const dayEvents = getEventsForDay(currentDate);
  const weekEvents = getEventsForWeek();

  // Not connected
  if (!connected) {
    return (
      <div className="tb-cal">
        <div className="tb-cal-connect">
          <Calendar size={36} />
          <h3>Connect Calendar</h3>
          <p>See your schedule at a glance</p>
          <button onClick={onConnect}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Google Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tb-cal">
      {/* Header */}
      <div className="tb-cal-header">
        <div className="tb-cal-nav">
          <button className="tb-cal-today" onClick={goToday}>Today</button>
          <button className="tb-cal-arrow" onClick={() => navigate('prev')}><ChevronLeft size={16} /></button>
          <button className="tb-cal-arrow" onClick={() => navigate('next')}><ChevronRight size={16} /></button>
          <span className="tb-cal-title">{getDateLabel()}</span>
        </div>
        <div className="tb-cal-actions">
          <div className="tb-cal-views">
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button key={v} className={viewMode === v ? 'active' : ''} onClick={() => setViewMode(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button className="tb-cal-refresh" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="tb-cal-content">
        {/* Day View - Agenda Style */}
        {viewMode === 'day' && (
          <div className="tb-cal-agenda">
            {dayEvents.length === 0 ? (
              <div className="tb-cal-empty-day">
                <Coffee size={24} />
                <span>No events today</span>
              </div>
            ) : (
              <div className="tb-cal-events-list">
                {dayEvents.map((event, i) => (
                  <div
                    key={event.id}
                    className="tb-cal-event-item"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="tb-cal-event-color" style={{ background: getEventColor(event, i) }} />
                    <div className="tb-cal-event-info">
                      <span className="tb-cal-event-title">{event.summary}</span>
                      <span className="tb-cal-event-time">
                        <Clock size={12} />
                        {formatTime(event.start.dateTime)}
                        {event.end.dateTime && ` – ${formatTime(event.end.dateTime)}`}
                      </span>
                      {event.location && (
                        <span className="tb-cal-event-loc"><MapPin size={12} />{event.location}</span>
                      )}
                    </div>
                    {event.htmlLink && (
                      <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="tb-cal-event-link" onClick={e => e.stopPropagation()}>
                        <Video size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Week View - Compact Schedule */}
        {viewMode === 'week' && (
          <div className="tb-cal-week">
            <div className="tb-cal-week-header">
              {weekDays.map((day, i) => (
                <div key={i} className={`tb-cal-week-day ${isToday(day) ? 'today' : ''}`}>
                  <span className="tb-cal-week-dayname">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className={`tb-cal-week-daynum ${isToday(day) ? 'today' : ''}`}>{day.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="tb-cal-week-body">
              {weekDays.map((day, i) => {
                const events = getEventsForDay(day);
                return (
                  <div key={i} className={`tb-cal-week-col ${isToday(day) ? 'today' : ''}`}>
                    {events.slice(0, 3).map((event, j) => (
                      <div
                        key={event.id}
                        className="tb-cal-week-event"
                        style={{ borderLeftColor: getEventColor(event, j) }}
                        onClick={() => setSelectedEvent(event)}
                        title={`${event.summary} - ${formatTime(event.start.dateTime)}`}
                      >
                        <span className="tb-cal-week-event-time">{formatTime(event.start.dateTime)}</span>
                        <span className="tb-cal-week-event-title">{event.summary}</span>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="tb-cal-week-more">+{events.length - 3} more</div>
                    )}
                    {events.length === 0 && <div className="tb-cal-week-empty" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month View - Mini Calendar */}
        {viewMode === 'month' && (
          <div className="tb-cal-month">
            <div className="tb-cal-month-header">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="tb-cal-month-grid">
              {monthWeeks.map((week, wi) => (
                <div key={wi} className="tb-cal-month-week">
                  {week.map((day, di) => {
                    const events = getEventsForDay(day);
                    return (
                      <div
                        key={di}
                        className={`tb-cal-month-day ${isToday(day) ? 'today' : ''} ${!isCurrentMonth(day) ? 'other' : ''}`}
                        onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                      >
                        <span className={isToday(day) ? 'today' : ''}>{day.getDate()}</span>
                        {events.length > 0 && (
                          <div className="tb-cal-month-dots">
                            {events.slice(0, 3).map((e, i) => (
                              <div key={e.id} className="tb-cal-month-dot" style={{ background: getEventColor(e, i) }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="tb-cal-loading">
            <RefreshCw size={18} className="spin" />
          </div>
        )}
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div className="tb-cal-modal-bg" onClick={() => setSelectedEvent(null)}>
          <div className="tb-cal-modal" onClick={e => e.stopPropagation()}>
            <div className="tb-cal-modal-head">
              <h4>{selectedEvent.summary}</h4>
              <button onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="tb-cal-modal-body">
              <div className="tb-cal-modal-row">
                <Clock size={14} />
                <span>
                  {selectedEvent.start.dateTime 
                    ? new Date(selectedEvent.start.dateTime).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit'
                      })
                    : 'All day'
                  }
                  {selectedEvent.end.dateTime && ` – ${formatTime(selectedEvent.end.dateTime)}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="tb-cal-modal-row">
                  <MapPin size={14} />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="tb-cal-modal-row">
                  <Users size={14} />
                  <span>{selectedEvent.attendees.length} attendees</span>
                </div>
              )}
            </div>
            <a 
              href={selectedEvent.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="tb-cal-modal-link"
            >
              <ExternalLink size={14} />
              Open in Calendar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
