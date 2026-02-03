'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ChevronDown, ChevronUp, ExternalLink, Clock, Loader2 } from 'lucide-react';

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to?: string;
  date: string;
  snippet: string;
  body?: string;
  isUnread: boolean;
}

interface LeadEmailHistoryProps {
  contactEmail: string;
  fetchEmailsForContact: (email: string) => Promise<EmailMessage[]>;
  isGoogleConnected: boolean;
  hasGmail: boolean;
}

export function LeadEmailHistory({ 
  contactEmail, 
  fetchEmailsForContact, 
  isGoogleConnected,
  hasGmail 
}: LeadEmailHistoryProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);

  useEffect(() => {
    if (expanded && isGoogleConnected && hasGmail && contactEmail) {
      loadEmails();
    }
  }, [expanded, isGoogleConnected, hasGmail, contactEmail]);

  async function loadEmails() {
    setLoading(true);
    try {
      const result = await fetchEmailsForContact(contactEmail);
      setEmails(result);
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  // Don't render if Google is not connected or no Gmail access
  if (!isGoogleConnected || !hasGmail) {
    return null;
  }

  // Don't render if no email address
  if (!contactEmail) {
    return null;
  }

  return (
    <div className="lead-email-history">
      <button 
        className="lead-email-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <Mail size={14} />
        <span>Email History</span>
        {emails.length > 0 && !expanded && (
          <span className="lead-email-count">{emails.length}</span>
        )}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="lead-email-panel">
          {loading ? (
            <div className="lead-email-loading">
              <Loader2 size={16} className="spin" />
              <span>Loading emails...</span>
            </div>
          ) : emails.length === 0 ? (
            <div className="lead-email-empty">
              <Mail size={20} />
              <p>No email history with this contact</p>
            </div>
          ) : (
            <div className="lead-email-list">
              {emails.slice(0, 5).map((email) => (
                <div 
                  key={email.id} 
                  className={`lead-email-item ${email.isUnread ? 'unread' : ''} ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                >
                  <div className="lead-email-header">
                    <span className="lead-email-subject">{email.subject || '(No subject)'}</span>
                    <span className="lead-email-date">
                      <Clock size={10} />
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <div className="lead-email-from">
                    {email.fromEmail === contactEmail ? `From: ${email.from}` : `To: ${contactEmail}`}
                  </div>
                  {selectedEmail?.id === email.id ? (
                    <div className="lead-email-body">
                      {email.body || email.snippet}
                    </div>
                  ) : (
                    <div className="lead-email-snippet">{email.snippet}</div>
                  )}
                </div>
              ))}
              {emails.length > 5 && (
                <div className="lead-email-more">
                  +{emails.length - 5} more emails
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .lead-email-history {
          margin-top: 12px;
          border-top: 1px solid var(--ws-border, #e5e7eb);
          padding-top: 12px;
        }

        .lead-email-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--ws-text-secondary, #6b7280);
          font-size: 13px;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.15s ease;
          width: 100%;
        }

        .lead-email-toggle:hover {
          background: var(--ws-bg-secondary, #f3f4f6);
          color: var(--ws-primary, #3b82f6);
        }

        .lead-email-count {
          background: var(--ws-primary, #3b82f6);
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: auto;
          margin-right: 4px;
        }

        .lead-email-panel {
          margin-top: 8px;
          background: var(--ws-bg-secondary, #f9fafb);
          border-radius: 8px;
          overflow: hidden;
        }

        .lead-email-loading, .lead-email-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: var(--ws-text-secondary, #9ca3af);
          gap: 8px;
          font-size: 13px;
        }

        .lead-email-loading {
          flex-direction: row;
        }

        :global(.lead-email-loading .spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .lead-email-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .lead-email-item {
          padding: 12px;
          border-bottom: 1px solid var(--ws-border, #e5e7eb);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .lead-email-item:last-child {
          border-bottom: none;
        }

        .lead-email-item:hover {
          background: white;
        }

        .lead-email-item.selected {
          background: white;
        }

        .lead-email-item.unread {
          background: rgba(59, 130, 246, 0.05);
        }

        .lead-email-item.unread .lead-email-subject {
          font-weight: 600;
        }

        .lead-email-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 4px;
        }

        .lead-email-subject {
          font-size: 13px;
          color: var(--ws-text-primary, #111827);
          line-height: 1.3;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lead-email-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--ws-text-secondary, #9ca3af);
          white-space: nowrap;
        }

        .lead-email-from {
          font-size: 11px;
          color: var(--ws-text-secondary, #6b7280);
          margin-bottom: 4px;
        }

        .lead-email-snippet {
          font-size: 12px;
          color: var(--ws-text-secondary, #9ca3af);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lead-email-body {
          font-size: 12px;
          color: var(--ws-text-secondary, #6b7280);
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--ws-border, #e5e7eb);
          max-height: 150px;
          overflow-y: auto;
        }

        .lead-email-more {
          text-align: center;
          padding: 10px;
          font-size: 12px;
          color: var(--ws-primary, #3b82f6);
          background: white;
          cursor: pointer;
        }

        .lead-email-more:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default LeadEmailHistory;
