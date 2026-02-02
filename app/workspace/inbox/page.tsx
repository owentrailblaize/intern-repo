'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import { useGoogleIntegration } from '../hooks/useGoogleIntegration';
import {
  Inbox,
  Send,
  Star,
  Trash2,
  Archive,
  Search,
  Mail,
  MailOpen,
  Clock,
  ChevronRight,
  Reply,
  Forward,
  X,
  ExternalLink,
  RefreshCw,
  Link2,
  AlertCircle,
  Loader2,
  Paperclip,
  Check
} from 'lucide-react';

export default function InboxPage() {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  
  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Google Integration
  const google = useGoogleIntegration(currentEmployee?.id);

  const fetchEmployee = useCallback(async () => {
    if (!supabase || !user) return;

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .single();

    if (data) {
      setCurrentEmployee(data);
    } else {
      const { data: fallback } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      if (fallback) setCurrentEmployee(fallback);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // Filter emails by search
  const filteredEmails = google.emails.filter(email => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    );
  });

  // Get selected email details
  const selectedEmailData = google.emails.find(e => e.id === selectedEmail);

  // Handle send email
  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject) return;
    
    setSendError(null);
    const result = await google.sendEmail({
      to: composeTo,
      subject: composeSubject,
      body: composeBody.replace(/\n/g, '<br>'),
      cc: composeCc || undefined,
      bcc: composeBcc || undefined,
    });

    if (result.success) {
      setSendSuccess(true);
      setTimeout(() => {
        setShowCompose(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeCc('');
        setComposeBcc('');
        setShowCcBcc(false);
        setSendSuccess(false);
      }, 1500);
    } else {
      setSendError(result.error || 'Failed to send email');
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
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
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get avatar color based on email
  const getAvatarColor = (email: string) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <div className="ws-loading">
        <div className="ws-loading-spinner" />
        <p>Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="ws-gmail-page">
      {/* Header */}
      <header className="ws-gmail-header">
        <div className="ws-gmail-header-left">
          <h1>
            <Mail size={24} />
            Inbox
          </h1>
          {google.status?.connected && google.unreadCount > 0 && (
            <span className="ws-gmail-unread-badge">{google.unreadCount}</span>
          )}
        </div>
        <div className="ws-gmail-header-right">
          {google.status?.connected && (
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ws-gmail-open-btn"
            >
              <ExternalLink size={16} />
              Open Gmail
            </a>
          )}
          <button
            className="ws-gmail-compose-btn"
            onClick={() => setShowCompose(true)}
            disabled={!google.status?.connected}
          >
            <Send size={18} />
            Compose
          </button>
        </div>
      </header>

      {/* Main Content */}
      {!google.status?.connected ? (
        /* Connect Gmail Prompt */
        <div className="ws-gmail-connect-container">
          <div className="ws-gmail-connect-card">
            <div className="ws-gmail-connect-icon">
              <svg width="64" height="64" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
            </div>
            <h2>Connect Your Gmail</h2>
            <p>Send and receive emails directly from Trailblaize. Your emails stay synced with Gmail.</p>
            <ul className="ws-gmail-features">
              <li><Check size={16} /> Read and manage your inbox</li>
              <li><Check size={16} /> Compose and send emails</li>
              <li><Check size={16} /> Secure OAuth 2.0 connection</li>
              <li><Check size={16} /> Real-time sync with Gmail</li>
            </ul>
            <button className="ws-gmail-connect-main-btn" onClick={google.connect}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      ) : google.error ? (
        /* Error State */
        <div className="ws-gmail-connect-container">
          <div className="ws-gmail-connect-card ws-gmail-error-card">
            <AlertCircle size={48} className="ws-gmail-error-icon" />
            <h2>Connection Error</h2>
            <p>{google.error}</p>
            <button className="ws-gmail-connect-main-btn" onClick={google.connect}>
              <Link2 size={18} />
              Reconnect Gmail
            </button>
          </div>
        </div>
      ) : (
        /* Gmail Interface */
        <div className="ws-gmail-interface">
          {/* Toolbar */}
          <div className="ws-gmail-toolbar">
            <div className="ws-gmail-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="ws-gmail-toolbar-actions">
              <span className="ws-gmail-count-label">
                {filteredEmails.length} emails • {google.unreadCount} unread
              </span>
              <button
                className={`ws-gmail-refresh-btn ${google.gmailLoading ? 'loading' : ''}`}
                onClick={google.fetchEmails}
                disabled={google.gmailLoading}
              >
                <RefreshCw size={16} className={google.gmailLoading ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Email List & Detail */}
          <div className="ws-gmail-content">
            {/* Email List */}
            <div className={`ws-gmail-list ${selectedEmail ? 'has-selection' : ''}`}>
              {google.gmailLoading && google.emails.length === 0 ? (
                <div className="ws-gmail-loading-state">
                  <Loader2 size={32} className="spin" />
                  <p>Loading emails...</p>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="ws-gmail-empty-state">
                  <Inbox size={48} />
                  <h3>{searchQuery ? 'No matching emails' : 'Your inbox is empty'}</h3>
                  <p>{searchQuery ? 'Try a different search term' : 'Emails you receive will appear here'}</p>
                </div>
              ) : (
                filteredEmails.map(email => (
                  <div
                    key={email.id}
                    className={`ws-gmail-list-item ${email.isUnread ? 'unread' : ''} ${selectedEmail === email.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEmail(email.id)}
                  >
                    <div 
                      className="ws-gmail-list-avatar"
                      style={{ backgroundColor: getAvatarColor(email.fromEmail) }}
                    >
                      {getInitials(email.from)}
                    </div>
                    <div className="ws-gmail-list-content">
                      <div className="ws-gmail-list-header">
                        <span className="ws-gmail-list-from">{email.from}</span>
                        <span className="ws-gmail-list-date">{formatDate(email.date)}</span>
                      </div>
                      <span className="ws-gmail-list-subject">{email.subject || '(No subject)'}</span>
                      <span className="ws-gmail-list-snippet">{email.snippet}</span>
                    </div>
                    {email.isUnread && <div className="ws-gmail-unread-dot" />}
                  </div>
                ))
              )}
            </div>

            {/* Email Detail */}
            {selectedEmail && selectedEmailData && (
              <div className="ws-gmail-detail">
                <div className="ws-gmail-detail-header">
                  <button 
                    className="ws-gmail-back-btn"
                    onClick={() => setSelectedEmail(null)}
                  >
                    <X size={18} />
                  </button>
                  <div className="ws-gmail-detail-actions">
                    <a
                      href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmailData.threadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ws-gmail-detail-action"
                      title="Open in Gmail"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>

                <div className="ws-gmail-detail-content">
                  <h2 className="ws-gmail-detail-subject">{selectedEmailData.subject || '(No subject)'}</h2>
                  
                  <div className="ws-gmail-detail-meta">
                    <div 
                      className="ws-gmail-detail-avatar"
                      style={{ backgroundColor: getAvatarColor(selectedEmailData.fromEmail) }}
                    >
                      {getInitials(selectedEmailData.from)}
                    </div>
                    <div className="ws-gmail-detail-sender">
                      <span className="ws-gmail-detail-name">{selectedEmailData.from}</span>
                      <span className="ws-gmail-detail-email">{selectedEmailData.fromEmail}</span>
                    </div>
                    <span className="ws-gmail-detail-date">
                      {new Date(selectedEmailData.date).toLocaleString()}
                    </span>
                  </div>

                  <div className="ws-gmail-detail-body">
                    <p>{selectedEmailData.snippet}</p>
                    <a
                      href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmailData.threadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ws-gmail-read-more"
                    >
                      Read full email in Gmail
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="ws-gmail-detail-footer">
                    <button 
                      className="ws-gmail-reply-btn"
                      onClick={() => {
                        setComposeTo(selectedEmailData.fromEmail);
                        setComposeSubject(`Re: ${selectedEmailData.subject}`);
                        setShowCompose(true);
                      }}
                    >
                      <Reply size={16} />
                      Reply
                    </button>
                    <button 
                      className="ws-gmail-forward-btn"
                      onClick={() => {
                        setComposeSubject(`Fwd: ${selectedEmailData.subject}`);
                        setComposeBody(`\n\n---------- Forwarded message ----------\nFrom: ${selectedEmailData.from}\nDate: ${new Date(selectedEmailData.date).toLocaleString()}\nSubject: ${selectedEmailData.subject}\n\n${selectedEmailData.snippet}`);
                        setShowCompose(true);
                      }}
                    >
                      <Forward size={16} />
                      Forward
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="ws-gmail-compose-overlay" onClick={() => !google.sendingEmail && setShowCompose(false)}>
          <div className="ws-gmail-compose-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-gmail-compose-header">
              <h3>New Message</h3>
              <button 
                className="ws-gmail-compose-close"
                onClick={() => setShowCompose(false)}
                disabled={google.sendingEmail}
              >
                <X size={20} />
              </button>
            </div>

            {sendSuccess ? (
              <div className="ws-gmail-send-success">
                <Check size={48} />
                <h4>Email Sent!</h4>
                <p>Your message has been sent successfully.</p>
              </div>
            ) : (
              <>
                <div className="ws-gmail-compose-body">
                  <div className="ws-gmail-compose-field">
                    <label>To</label>
                    <input
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="recipient@example.com"
                      disabled={google.sendingEmail}
                    />
                  </div>

                  {showCcBcc && (
                    <>
                      <div className="ws-gmail-compose-field">
                        <label>Cc</label>
                        <input
                          type="email"
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          placeholder="cc@example.com"
                          disabled={google.sendingEmail}
                        />
                      </div>
                      <div className="ws-gmail-compose-field">
                        <label>Bcc</label>
                        <input
                          type="email"
                          value={composeBcc}
                          onChange={(e) => setComposeBcc(e.target.value)}
                          placeholder="bcc@example.com"
                          disabled={google.sendingEmail}
                        />
                      </div>
                    </>
                  )}

                  {!showCcBcc && (
                    <button 
                      className="ws-gmail-cc-toggle"
                      onClick={() => setShowCcBcc(true)}
                    >
                      Cc/Bcc
                    </button>
                  )}

                  <div className="ws-gmail-compose-field">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Email subject"
                      disabled={google.sendingEmail}
                    />
                  </div>

                  <div className="ws-gmail-compose-field ws-gmail-compose-message">
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Write your message..."
                      rows={12}
                      disabled={google.sendingEmail}
                    />
                  </div>

                  {sendError && (
                    <div className="ws-gmail-send-error">
                      <AlertCircle size={16} />
                      {sendError}
                    </div>
                  )}
                </div>

                <div className="ws-gmail-compose-footer">
                  <button 
                    className="ws-gmail-send-btn"
                    onClick={handleSendEmail}
                    disabled={!composeTo || !composeSubject || google.sendingEmail}
                  >
                    {google.sendingEmail ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send
                      </>
                    )}
                  </button>
                  <button 
                    className="ws-gmail-discard-btn"
                    onClick={() => setShowCompose(false)}
                    disabled={google.sendingEmail}
                  >
                    Discard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
