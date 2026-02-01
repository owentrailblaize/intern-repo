'use client';

import React from 'react';
import {
  Mail,
  MailOpen,
  RefreshCw,
  ExternalLink,
  Inbox,
  Star,
  Clock
} from 'lucide-react';

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

interface GoogleGmailWidgetProps {
  emails: GmailMessage[];
  unreadCount: number;
  loading: boolean;
  connected: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

export function GoogleGmailWidget({
  emails,
  unreadCount,
  loading,
  connected,
  onConnect,
  onRefresh
}: GoogleGmailWidgetProps) {
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  function getAvatarColor(email: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Not connected state
  if (!connected) {
    return (
      <section className="ws-card ws-google-widget ws-google-not-connected">
        <div className="ws-card-header">
          <h3>
            <Mail size={16} />
            Gmail
          </h3>
        </div>
        <div className="ws-google-connect-prompt">
          <div className="ws-google-connect-icon">
            <Mail size={32} />
          </div>
          <p>Connect your Gmail to see your inbox</p>
          <button className="ws-google-connect-btn" onClick={onConnect}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Gmail
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ws-card ws-google-widget ws-gmail-widget">
      <div className="ws-card-header">
        <h3>
          <Mail size={16} />
          Inbox
          {unreadCount > 0 && (
            <span className="ws-gmail-unread-badge">{unreadCount}</span>
          )}
        </h3>
        <div className="ws-gmail-header-actions">
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ws-gmail-open-btn"
          >
            <ExternalLink size={14} />
          </a>
          <button 
            className="ws-refresh-btn" 
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>
      
      <div className="ws-gmail-content">
        {loading && emails.length === 0 ? (
          <div className="ws-gmail-loading">
            <RefreshCw size={20} className="spinning" />
            <span>Loading emails...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="ws-gmail-empty">
            <Inbox size={32} />
            <p>Your inbox is empty</p>
          </div>
        ) : (
          <div className="ws-gmail-list">
            {emails.slice(0, 5).map(email => (
              <a
                key={email.id}
                href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`ws-gmail-item ${email.isUnread ? 'unread' : ''}`}
              >
                <div 
                  className="ws-gmail-avatar"
                  style={{ backgroundColor: getAvatarColor(email.fromEmail) }}
                >
                  {getInitials(email.from)}
                </div>
                <div className="ws-gmail-item-content">
                  <div className="ws-gmail-item-header">
                    <span className="ws-gmail-from">{email.from}</span>
                    <span className="ws-gmail-date">{formatDate(email.date)}</span>
                  </div>
                  <span className="ws-gmail-subject">{email.subject}</span>
                  <span className="ws-gmail-snippet">{email.snippet}</span>
                </div>
                {email.isUnread && <div className="ws-gmail-unread-dot" />}
              </a>
            ))}
          </div>
        )}
        
        {emails.length > 5 && (
          <a 
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ws-gmail-view-all"
          >
            View all {emails.length} emails
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </section>
  );
}
