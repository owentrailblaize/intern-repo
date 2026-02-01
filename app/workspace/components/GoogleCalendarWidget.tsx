'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  RefreshCw,
  Link2,
  AlertCircle
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
}

interface GoogleCalendarWidgetProps {
  events: CalendarEvent[];
  loading: boolean;
  connected: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

export function GoogleCalendarWidget({
  events,
  loading,
  connected,
  onConnect,
  onRefresh
}: GoogleCalendarWidgetProps) {
  // Group events by day
  const groupedEvents = events.reduce((groups, event) => {
    const dateStr = event.start.dateTime || event.start.date || '';
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  function formatTime(dateTimeStr: string | undefined, dateStr: string | undefined): string {
    if (dateTimeStr) {
      return new Date(dateTimeStr).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    return 'All day';
  }

  function isHappeningNow(event: CalendarEvent): boolean {
    if (!event.start.dateTime || !event.end.dateTime) return false;
    const now = new Date();
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return now >= start && now <= end;
  }

  // Not connected state
  if (!connected) {
    return (
      <section className="ws-card ws-google-widget ws-google-not-connected">
        <div className="ws-card-header">
          <h3>
            <Calendar size={16} />
            Google Calendar
          </h3>
        </div>
        <div className="ws-google-connect-prompt">
          <div className="ws-google-connect-icon">
            <Calendar size={32} />
          </div>
          <p>Connect your Google Calendar to see upcoming events</p>
          <button className="ws-google-connect-btn" onClick={onConnect}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Google Calendar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ws-card ws-google-widget ws-calendar-widget">
      <div className="ws-card-header">
        <h3>
          <Calendar size={16} />
          Calendar
        </h3>
        <button 
          className="ws-refresh-btn" 
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
        </button>
      </div>
      
      <div className="ws-calendar-content">
        {loading && events.length === 0 ? (
          <div className="ws-calendar-loading">
            <RefreshCw size={20} className="spinning" />
            <span>Loading events...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="ws-calendar-empty">
            <Calendar size={32} />
            <p>No upcoming events</p>
          </div>
        ) : (
          <div className="ws-calendar-days">
            {Object.entries(groupedEvents).map(([day, dayEvents]) => (
              <div key={day} className={`ws-calendar-day ${day === today ? 'today' : ''}`}>
                <div className="ws-calendar-day-header">
                  <span className="ws-calendar-day-label">{day}</span>
                  {day === today && <span className="ws-calendar-today-badge">Today</span>}
                </div>
                <div className="ws-calendar-events">
                  {dayEvents.map(event => (
                    <a
                      key={event.id}
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`ws-calendar-event ${isHappeningNow(event) ? 'happening-now' : ''}`}
                    >
                      <div className="ws-calendar-event-time">
                        <Clock size={12} />
                        {formatTime(event.start.dateTime, event.start.date)}
                      </div>
                      <div className="ws-calendar-event-info">
                        <span className="ws-calendar-event-title">{event.summary}</span>
                        {event.location && (
                          <span className="ws-calendar-event-location">
                            <MapPin size={10} />
                            {event.location}
                          </span>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <span className="ws-calendar-event-attendees">
                            <Users size={10} />
                            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {isHappeningNow(event) && (
                        <span className="ws-calendar-now-badge">Now</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
