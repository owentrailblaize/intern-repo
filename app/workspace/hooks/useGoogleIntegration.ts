import { useState, useEffect, useCallback } from 'react';

interface GoogleStatus {
  connected: boolean;
  isExpired: boolean;
  scopes: string[];
  hasCalendar: boolean;
  hasGmail: boolean;
}

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

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  date: string;
  snippet: string;
  isUnread: boolean;
}

interface UseGoogleIntegrationReturn {
  // Status
  status: GoogleStatus | null;
  loading: boolean;
  error: string | null;
  
  // Calendar
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  fetchCalendarEvents: () => Promise<void>;
  
  // Gmail
  emails: GmailMessage[];
  unreadCount: number;
  gmailLoading: boolean;
  fetchEmails: () => Promise<void>;
  
  // Actions
  connect: () => void;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useGoogleIntegration(employeeId: string | undefined): UseGoogleIntegrationReturn {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [gmailLoading, setGmailLoading] = useState(false);

  // Check connection status
  const refreshStatus = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      const response = await fetch(`/api/google/status?employee_id=${employeeId}`);
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
        setError(null);
      } else {
        setStatus({ connected: false, isExpired: false, scopes: [], hasCalendar: false, hasGmail: false });
      }
    } catch (err) {
      console.error('Failed to fetch Google status:', err);
      setStatus({ connected: false, isExpired: false, scopes: [], hasCalendar: false, hasGmail: false });
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  // Fetch calendar events
  const fetchCalendarEvents = useCallback(async () => {
    if (!employeeId || !status?.connected) return;
    
    setCalendarLoading(true);
    try {
      const response = await fetch(`/api/google/calendar?employee_id=${employeeId}&days=7&max=10`);
      const data = await response.json();
      
      if (response.ok) {
        setCalendarEvents(data.events || []);
      } else if (data.code === 'NOT_CONNECTED') {
        setStatus(prev => prev ? { ...prev, connected: false } : null);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
    } finally {
      setCalendarLoading(false);
    }
  }, [employeeId, status?.connected]);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    if (!employeeId || !status?.connected) return;
    
    setGmailLoading(true);
    try {
      const response = await fetch(`/api/google/gmail?employee_id=${employeeId}&max=10`);
      const data = await response.json();
      
      if (response.ok) {
        setEmails(data.emails || []);
        setUnreadCount(data.unreadCount || 0);
      } else if (data.code === 'NOT_CONNECTED') {
        setStatus(prev => prev ? { ...prev, connected: false } : null);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setGmailLoading(false);
    }
  }, [employeeId, status?.connected]);

  // Connect Google account
  const connect = useCallback(() => {
    if (!employeeId) return;
    
    // Open OAuth flow in a popup or redirect
    window.location.href = `/api/google/auth?employee_id=${employeeId}`;
  }, [employeeId]);

  // Disconnect Google account
  const disconnect = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      
      if (response.ok) {
        setStatus({ connected: false, isExpired: false, scopes: [], hasCalendar: false, hasGmail: false });
        setCalendarEvents([]);
        setEmails([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError('Failed to disconnect Google account');
    }
  }, [employeeId]);

  // Initial status check
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Fetch data when connected (API will handle token refresh if expired)
  useEffect(() => {
    if (status?.connected) {
      // Always try to fetch - the API endpoints will refresh expired tokens
      // If refresh fails, the API returns NOT_CONNECTED and we update status
      fetchCalendarEvents();
      fetchEmails();
    }
  }, [status?.connected, fetchCalendarEvents, fetchEmails]);

  // Check for OAuth callback success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      refreshStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshStatus]);

  return {
    status,
    loading,
    error,
    calendarEvents,
    calendarLoading,
    fetchCalendarEvents,
    emails,
    unreadCount,
    gmailLoading,
    fetchEmails,
    connect,
    disconnect,
    refreshStatus,
  };
}
