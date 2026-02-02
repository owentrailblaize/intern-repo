'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ExternalLink,
  Plus,
  Settings,
  MoreHorizontal,
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

// Event color mapping inspired by Google Calendar
const eventColors: Record<string, { bg: string; border: string; text: string }> = {
  '1': { bg: 'rgba(20, 184, 166, 0.15)', border: '#14b8a6', text: '#5eead4' },
  '2': { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#86efac' },
  '3': { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#d8b4fe' },
  '4': { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#f9a8d4' },
  '5': { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fcd34d' },
  '6': { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' },
  '7': { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#93c5fd' },
  default: { bg: 'rgba(20, 184, 166, 0.15)', border: '#14b8a6', text: '#5eead4' },
};

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

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  // Get date range label
  const getDateRangeLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'week': {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
        } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekEnd.getFullYear()}`;
        } else {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      }
      case 'month':
        return currentDate.toLocaleDateString('en-US', options);
      default:
        return '';
    }
  };

  // Helper functions
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
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
    
    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push(day);
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month
    const endPadding = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForHour = (date: Date, hour: number) => {
    return events.filter(event => {
      if (!event.start.dateTime) return false;
      const eventDate = new Date(event.start.dateTime);
      return eventDate.toDateString() === date.toDateString() && 
             eventDate.getHours() === hour;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatEventTime = (dateTime: string | undefined) => {
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

  const getEventPosition = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return { top: 0, height: 60 };
    
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // Each hour is 60px
    const top = (startMinutes / 60) * 60;
    const height = Math.max((duration / 60) * 60, 20);
    
    return { top, height };
  };

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return (minutes / 60) * 60; // 60px per hour
  }, [currentTime]);

  // Check if event is happening now
  const isHappeningNow = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return false;
    const now = currentTime.getTime();
    const start = new Date(event.start.dateTime).getTime();
    const end = new Date(event.end.dateTime).getTime();
    return now >= start && now <= end;
  };

  // Not connected state
  if (!connected) {
    return (
      <div className="tb-calendar tb-calendar-disconnected">
        <div className="tb-calendar-connect-prompt">
          <div className="tb-calendar-connect-icon">
            <Calendar size={56} strokeWidth={1.5} />
          </div>
          <h2>Connect Your Calendar</h2>
          <p>Sync with Google Calendar to see your schedule at a glance</p>
          <button className="tb-calendar-connect-btn" onClick={onConnect}>
            <svg width="20" height="20" viewBox="0 0 24 24">
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

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekDays = getWeekDays();
  const monthDays = getMonthDays();

  return (
    <div className="tb-calendar">
      {/* Calendar Header */}
      <div className="tb-calendar-header">
        <div className="tb-calendar-nav">
          <button className="tb-today-btn" onClick={goToToday}>
            Today
          </button>
          <div className="tb-nav-arrows">
            <button className="tb-nav-btn" onClick={() => navigate('prev')}>
              <ChevronLeft size={20} />
            </button>
            <button className="tb-nav-btn" onClick={() => navigate('next')}>
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 className="tb-date-label">{getDateRangeLabel()}</h2>
        </div>
        
        <div className="tb-calendar-actions">
          <div className="tb-view-toggle">
            <button
              className={`tb-view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              className={`tb-view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`tb-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
          <button 
            className="tb-refresh-btn" 
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
          >
            <Settings size={18} className={loading ? 'tb-spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="tb-calendar-body">
        {/* Day View */}
        {viewMode === 'day' && (
          <div className="tb-day-view">
            <div className="tb-day-header">
              <div className="tb-time-gutter"></div>
              <div className={`tb-day-column-header ${isToday(currentDate) ? 'today' : ''}`}>
                <span className="tb-day-name">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`tb-day-number ${isToday(currentDate) ? 'today' : ''}`}>
                  {currentDate.getDate()}
                </span>
              </div>
            </div>
            <div className="tb-day-grid-scroll">
              <div className="tb-day-grid">
                <div className="tb-time-column">
                  {hours.map(hour => (
                    <div key={hour} className="tb-time-slot">
                      <span className="tb-time-label">
                        {hour === 0 ? '' : new Date(0, 0, 0, hour).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          hour12: true 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="tb-events-column">
                  {/* Hour lines */}
                  {hours.map(hour => (
                    <div key={hour} className="tb-hour-line"></div>
                  ))}
                  
                  {/* Current time indicator */}
                  {isToday(currentDate) && (
                    <div 
                      className="tb-current-time-line"
                      style={{ top: `${currentTimePosition}px` }}
                    >
                      <div className="tb-current-time-dot"></div>
                    </div>
                  )}
                  
                  {/* Events */}
                  {getEventsForDay(currentDate).map(event => {
                    const pos = getEventPosition(event);
                    const color = getEventColor(event);
                    const happeningNow = isHappeningNow(event);
                    
                    return (
                      <a
                        key={event.id}
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`tb-event-block ${happeningNow ? 'now' : ''}`}
                        style={{
                          top: `${pos.top}px`,
                          height: `${pos.height}px`,
                          backgroundColor: color.bg,
                          borderLeftColor: color.border,
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedEvent(event);
                        }}
                      >
                        <div className="tb-event-content">
                          <span className="tb-event-title" style={{ color: color.text }}>
                            {event.summary}
                          </span>
                          <span className="tb-event-time">
                            {formatEventTime(event.start.dateTime)}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="tb-week-view">
            <div className="tb-week-header">
              <div className="tb-time-gutter"></div>
              {weekDays.map((day, index) => (
                <div 
                  key={index} 
                  className={`tb-week-day-header ${isToday(day) ? 'today' : ''}`}
                >
                  <span className="tb-day-name">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`tb-day-number ${isToday(day) ? 'today' : ''}`}>
                    {day.getDate()}
                  </span>
                </div>
              ))}
            </div>
            <div className="tb-week-grid-scroll">
              <div className="tb-week-grid">
                <div className="tb-time-column">
                  {hours.map(hour => (
                    <div key={hour} className="tb-time-slot">
                      <span className="tb-time-label">
                        {hour === 0 ? '' : new Date(0, 0, 0, hour).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          hour12: true 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="tb-week-day-column">
                    {/* Hour lines */}
                    {hours.map(hour => (
                      <div key={hour} className="tb-hour-line"></div>
                    ))}
                    
                    {/* Current time indicator */}
                    {isToday(day) && (
                      <div 
                        className="tb-current-time-line"
                        style={{ top: `${currentTimePosition}px` }}
                      >
                        <div className="tb-current-time-dot"></div>
                      </div>
                    )}
                    
                    {/* Events */}
                    {getEventsForDay(day).map(event => {
                      const pos = getEventPosition(event);
                      const color = getEventColor(event);
                      const happeningNow = isHappeningNow(event);
                      
                      return (
                        <a
                          key={event.id}
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`tb-event-block ${happeningNow ? 'now' : ''}`}
                          style={{
                            top: `${pos.top}px`,
                            height: `${pos.height}px`,
                            backgroundColor: color.bg,
                            borderLeftColor: color.border,
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedEvent(event);
                          }}
                        >
                          <div className="tb-event-content">
                            <span className="tb-event-title" style={{ color: color.text }}>
                              {event.summary}
                            </span>
                            {pos.height > 40 && (
                              <span className="tb-event-time">
                                {formatEventTime(event.start.dateTime)}
                              </span>
                            )}
                          </div>
                        </a>
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
          <div className="tb-month-view">
            <div className="tb-month-header">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="tb-month-day-name">{day}</div>
              ))}
            </div>
            <div className="tb-month-grid">
              {monthDays.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMo = isCurrentMonth(day);
                
                return (
                  <div 
                    key={index} 
                    className={`tb-month-day ${isToday(day) ? 'today' : ''} ${!isCurrentMo ? 'other-month' : ''}`}
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode('day');
                    }}
                  >
                    <span className={`tb-month-day-number ${isToday(day) ? 'today' : ''}`}>
                      {day.getDate()}
                    </span>
                    <div className="tb-month-events">
                      {dayEvents.slice(0, 3).map(event => {
                        const color = getEventColor(event);
                        return (
                          <div 
                            key={event.id} 
                            className="tb-month-event"
                            style={{ 
                              backgroundColor: color.bg,
                              borderLeftColor: color.border,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                          >
                            <span style={{ color: color.text }}>{event.summary}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="tb-month-more">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && !loading && (
          <div className="tb-calendar-empty">
            <Coffee size={48} strokeWidth={1.5} />
            <h3>Your schedule is clear</h3>
            <p>Perfect time for deep work</p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="tb-calendar-loading">
            <div className="tb-loading-spinner"></div>
            <span>Loading events...</span>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="tb-event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="tb-event-modal" onClick={e => e.stopPropagation()}>
            <div className="tb-event-modal-header">
              <h3>{selectedEvent.summary}</h3>
              <button className="tb-modal-close" onClick={() => setSelectedEvent(null)}>
                ×
              </button>
            </div>
            <div className="tb-event-modal-body">
              <div className="tb-event-detail">
                <Clock size={16} />
                <span>
                  {selectedEvent.start.dateTime 
                    ? new Date(selectedEvent.start.dateTime).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })
                    : selectedEvent.start.date
                  }
                  {selectedEvent.end.dateTime && (
                    <> – {formatEventTime(selectedEvent.end.dateTime)}</>
                  )}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="tb-event-detail">
                  <MapPin size={16} />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="tb-event-detail">
                  <Users size={16} />
                  <span>{selectedEvent.attendees.length} attendee{selectedEvent.attendees.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="tb-event-description">
                  <p>{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <div className="tb-event-modal-footer">
              <a 
                href={selectedEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="tb-open-gcal-btn"
              >
                <ExternalLink size={16} />
                Open in Google Calendar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
