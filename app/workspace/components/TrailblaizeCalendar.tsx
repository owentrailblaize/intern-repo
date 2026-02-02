'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ExternalLink,
  RefreshCw,
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

// Trailblaize brand colors
const eventColors: Record<string, { bg: string; border: string; text: string }> = {
  '1': { bg: 'rgba(20, 184, 166, 0.2)', border: '#14b8a6', text: '#14b8a6' },
  '2': { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#22c55e' },
  '3': { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', text: '#a855f7' },
  '4': { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899', text: '#ec4899' },
  '5': { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#f59e0b' },
  '6': { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#ef4444' },
  '7': { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#3b82f6' },
  default: { bg: 'rgba(20, 184, 166, 0.2)', border: '#14b8a6', text: '#14b8a6' },
};

// Working hours config
const HOUR_HEIGHT = 48; // pixels per hour
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const VISIBLE_HOURS = END_HOUR - START_HOUR;

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && viewMode !== 'month') {
      const currentHour = new Date().getHours();
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 1) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [viewMode]);

  // Navigation
  const goToToday = () => setCurrentDate(new Date());
  
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const delta = direction === 'next' ? 1 : -1;
    
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + delta);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (delta * 7));
    else newDate.setMonth(newDate.getMonth() + delta);
    
    setCurrentDate(newDate);
  };

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

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Previous month padding
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    // Next month padding (5 or 6 rows)
    const rows = Math.ceil(days.length / 7);
    const totalCells = rows * 7;
    for (let i = 1; days.length < totalCells; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    return eventColors[event.colorId || 'default'] || eventColors.default;
  };

  const getEventStyle = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return { top: 0, height: 40 };
    
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    
    const top = Math.max(0, (startHour - START_HOUR) * HOUR_HEIGHT);
    const height = Math.max(24, (endHour - startHour) * HOUR_HEIGHT);
    
    return { top, height };
  };

  const currentTimeTop = useMemo(() => {
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    return (hour - START_HOUR) * HOUR_HEIGHT;
  }, [currentTime]);

  const isHappeningNow = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return false;
    const now = currentTime.getTime();
    return now >= new Date(event.start.dateTime).getTime() && 
           now <= new Date(event.end.dateTime).getTime();
  };

  // Date range label
  const getDateLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric' 
      });
    }
    if (viewMode === 'week') {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const hours = Array.from({ length: VISIBLE_HOURS }, (_, i) => START_HOUR + i);
  const weekDays = getWeekDays();
  const monthDays = getMonthDays();

  // Not connected
  if (!connected) {
    return (
      <div className="tb-cal">
        <div className="tb-cal-connect">
          <Calendar size={40} strokeWidth={1.5} />
          <h3>Connect Calendar</h3>
          <p>See your schedule at a glance</p>
          <button onClick={onConnect}>
            <svg width="18" height="18" viewBox="0 0 24 24">
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
          <button className="tb-cal-today" onClick={goToToday}>Today</button>
          <button className="tb-cal-arrow" onClick={() => navigate('prev')}>
            <ChevronLeft size={18} />
          </button>
          <button className="tb-cal-arrow" onClick={() => navigate('next')}>
            <ChevronRight size={18} />
          </button>
          <span className="tb-cal-title">{getDateLabel()}</span>
        </div>
        
        <div className="tb-cal-actions">
          <div className="tb-cal-views">
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button
                key={v}
                className={viewMode === v ? 'active' : ''}
                onClick={() => setViewMode(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button 
            className="tb-cal-refresh" 
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="tb-cal-body">
        {/* Day/Week View */}
        {(viewMode === 'day' || viewMode === 'week') && (
          <div className={`tb-cal-grid ${viewMode}`}>
            {/* Day headers */}
            <div className="tb-cal-day-headers">
              <div className="tb-cal-gutter" />
              {(viewMode === 'day' ? [currentDate] : weekDays).map((day, i) => (
                <div key={i} className={`tb-cal-day-header ${isToday(day) ? 'today' : ''}`}>
                  <span className="tb-cal-day-name">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`tb-cal-day-num ${isToday(day) ? 'today' : ''}`}>
                    {day.getDate()}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Scrollable time grid */}
            <div className="tb-cal-scroll" ref={scrollRef}>
              <div className="tb-cal-times">
                {/* Time labels */}
                <div className="tb-cal-time-col">
                  {hours.map(hour => (
                    <div key={hour} className="tb-cal-time-slot">
                      <span>{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
                    </div>
                  ))}
                </div>
                
                {/* Day columns */}
                {(viewMode === 'day' ? [currentDate] : weekDays).map((day, dayIdx) => (
                  <div key={dayIdx} className="tb-cal-day-col">
                    {/* Hour lines */}
                    {hours.map(hour => (
                      <div key={hour} className="tb-cal-hour-line" />
                    ))}
                    
                    {/* Current time line */}
                    {isToday(day) && currentTimeTop >= 0 && currentTimeTop <= VISIBLE_HOURS * HOUR_HEIGHT && (
                      <div className="tb-cal-now-line" style={{ top: currentTimeTop }}>
                        <div className="tb-cal-now-dot" />
                      </div>
                    )}
                    
                    {/* Events */}
                    {getEventsForDay(day).map(event => {
                      const style = getEventStyle(event);
                      const color = getEventColor(event);
                      const now = isHappeningNow(event);
                      
                      return (
                        <div
                          key={event.id}
                          className={`tb-cal-event ${now ? 'now' : ''}`}
                          style={{
                            top: style.top,
                            height: style.height,
                            backgroundColor: color.bg,
                            borderLeftColor: color.border,
                          }}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <span className="tb-cal-event-title" style={{ color: color.text }}>
                            {event.summary}
                          </span>
                          {style.height > 30 && (
                            <span className="tb-cal-event-time">{formatTime(event.start.dateTime)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="tb-cal-month">
            <div className="tb-cal-month-header">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="tb-cal-month-grid">
              {monthDays.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={i}
                    className={`tb-cal-month-day ${isToday(day) ? 'today' : ''} ${!isCurrentMonth(day) ? 'other' : ''}`}
                    onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                  >
                    <span className={`tb-cal-month-num ${isToday(day) ? 'today' : ''}`}>
                      {day.getDate()}
                    </span>
                    <div className="tb-cal-month-events">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className="tb-cal-month-event"
                          style={{ 
                            backgroundColor: getEventColor(event).bg,
                            color: getEventColor(event).text
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                        >
                          {event.summary}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="tb-cal-month-more">+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {events.length === 0 && !loading && (
          <div className="tb-cal-empty">
            <Coffee size={32} />
            <span>Schedule clear</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="tb-cal-loading">
            <RefreshCw size={20} className="spin" />
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
