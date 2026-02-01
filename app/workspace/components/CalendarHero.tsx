'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  ExternalLink,
  ChevronRight,
  Zap,
  Coffee,
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

interface CalendarHeroProps {
  events: CalendarEvent[];
  loading: boolean;
  connected: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

export function CalendarHero({
  events,
  loading,
  connected,
  onConnect,
  onRefresh
}: CalendarHeroProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Find current and upcoming events
  const now = currentTime.getTime();
  
  const currentEvent = events.find(event => {
    if (!event.start.dateTime || !event.end.dateTime) return false;
    const start = new Date(event.start.dateTime).getTime();
    const end = new Date(event.end.dateTime).getTime();
    return now >= start && now <= end;
  });

  const upcomingEvents = events
    .filter(event => {
      if (!event.start.dateTime) return false;
      const start = new Date(event.start.dateTime).getTime();
      return start > now;
    })
    .slice(0, 4);

  const nextEvent = upcomingEvents[0];

  // Calculate time until next event
  function getTimeUntil(event: CalendarEvent | undefined): { minutes: number; text: string } | null {
    if (!event?.start.dateTime) return null;
    const start = new Date(event.start.dateTime).getTime();
    const diff = start - now;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return { minutes: 0, text: 'Starting now' };
    if (minutes < 60) return { minutes, text: `${minutes}m` };
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return { minutes, text: mins > 0 ? `${hours}h ${mins}m` : `${hours}h` };
    }
    return { minutes, text: 'Tomorrow' };
  }

  function formatEventTime(dateTime: string | undefined): string {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function getEventDuration(event: CalendarEvent): string {
    if (!event.start.dateTime || !event.end.dateTime) return '';
    const start = new Date(event.start.dateTime).getTime();
    const end = new Date(event.end.dateTime).getTime();
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  function getProgressPercent(event: CalendarEvent): number {
    if (!event.start.dateTime || !event.end.dateTime) return 0;
    const start = new Date(event.start.dateTime).getTime();
    const end = new Date(event.end.dateTime).getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }

  const timeUntilNext = getTimeUntil(nextEvent);
  const isFreeTime = !currentEvent && (!timeUntilNext || timeUntilNext.minutes > 15);

  // Not connected state
  if (!connected) {
    return (
      <div className="calendar-hero calendar-hero-disconnected">
        <div className="calendar-hero-connect">
          <div className="calendar-hero-connect-icon">
            <Calendar size={48} />
          </div>
          <h2>Connect Your Calendar</h2>
          <p>See your schedule at a glance and stay on top of your day</p>
          <button className="calendar-hero-connect-btn" onClick={onConnect}>
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

  return (
    <div className="calendar-hero">
      {/* Current Context Bar */}
      <div className={`calendar-context-bar ${currentEvent ? 'in-meeting' : isFreeTime ? 'free' : 'upcoming'}`}>
        <div className="calendar-context-status">
          {currentEvent ? (
            <>
              <div className="context-indicator live">
                <span className="pulse-dot" />
                In Meeting
              </div>
              <span className="context-title">{currentEvent.summary}</span>
              <span className="context-time">
                {Math.round((new Date(currentEvent.end.dateTime!).getTime() - now) / 60000)}m remaining
              </span>
            </>
          ) : nextEvent ? (
            <>
              <div className="context-indicator">
                <Clock size={14} />
                {isFreeTime ? 'Free Time' : 'Next Up'}
              </div>
              <span className="context-title">
                {isFreeTime ? `Free until ${formatEventTime(nextEvent.start.dateTime)}` : nextEvent.summary}
              </span>
              <span className="context-time">in {timeUntilNext?.text}</span>
            </>
          ) : (
            <>
              <div className="context-indicator free">
                <Coffee size={14} />
                Clear Schedule
              </div>
              <span className="context-title">No more meetings today</span>
            </>
          )}
        </div>
        <div className="calendar-context-actions">
          {currentEvent?.htmlLink && (
            <a 
              href={currentEvent.htmlLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="context-action-btn"
            >
              <Video size={14} />
              Join
            </a>
          )}
        </div>
      </div>

      {/* Current Meeting (if active) */}
      {currentEvent && (
        <div className="calendar-current-meeting">
          <div className="current-meeting-header">
            <div className="current-meeting-live">
              <span className="live-indicator" />
              LIVE NOW
            </div>
            <span className="current-meeting-duration">
              {getEventDuration(currentEvent)}
            </span>
          </div>
          <h2 className="current-meeting-title">{currentEvent.summary}</h2>
          <div className="current-meeting-progress">
            <div 
              className="progress-fill" 
              style={{ width: `${getProgressPercent(currentEvent)}%` }}
            />
          </div>
          <div className="current-meeting-meta">
            <span className="meeting-time">
              {formatEventTime(currentEvent.start.dateTime)} - {formatEventTime(currentEvent.end.dateTime)}
            </span>
            {currentEvent.location && (
              <span className="meeting-location">
                <MapPin size={12} />
                {currentEvent.location}
              </span>
            )}
            {currentEvent.attendees && currentEvent.attendees.length > 0 && (
              <span className="meeting-attendees">
                <Users size={12} />
                {currentEvent.attendees.length} attendee{currentEvent.attendees.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <a 
            href={currentEvent.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="current-meeting-join"
          >
            <Video size={16} />
            Open in Calendar
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Timeline */}
      <div className="calendar-timeline">
        <div className="timeline-header">
          <h3>
            <Calendar size={16} />
            {currentEvent ? 'Coming Up' : 'Today\'s Schedule'}
          </h3>
          <span className="timeline-date">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {loading ? (
          <div className="timeline-loading">
            <div className="loading-spinner" />
            Loading schedule...
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="timeline-empty">
            <Coffee size={32} />
            <p>{currentEvent ? 'Nothing else scheduled' : 'Your day is clear'}</p>
            <span>Perfect time for deep work</span>
          </div>
        ) : (
          <div className="timeline-events">
            {upcomingEvents.map((event, index) => {
              const timeUntil = getTimeUntil(event);
              const isNext = index === 0;
              const isSoon = timeUntil && timeUntil.minutes <= 15;
              
              return (
                <a
                  key={event.id}
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`timeline-event ${isNext ? 'next' : ''} ${isSoon ? 'soon' : ''}`}
                >
                  <div className="timeline-event-time">
                    <span className="event-start">{formatEventTime(event.start.dateTime)}</span>
                    <span className="event-duration">{getEventDuration(event)}</span>
                  </div>
                  <div className="timeline-event-connector">
                    <div className="connector-dot" />
                    <div className="connector-line" />
                  </div>
                  <div className="timeline-event-content">
                    <span className="event-title">{event.summary}</span>
                    <div className="event-meta">
                      {event.location && (
                        <span className="event-location">
                          <MapPin size={10} />
                          {event.location}
                        </span>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <span className="event-attendees">
                          <Users size={10} />
                          {event.attendees.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {isNext && timeUntil && (
                    <div className={`timeline-event-countdown ${isSoon ? 'urgent' : ''}`}>
                      {isSoon && <AlertCircle size={12} />}
                      {timeUntil.text}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
