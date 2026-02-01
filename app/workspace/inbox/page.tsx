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
  MoreVertical,
  Search,
  Filter,
  Mail,
  MailOpen,
  Clock,
  ChevronRight,
  Reply,
  Forward,
  X,
  Check,
  ExternalLink,
  RefreshCw,
  Link2
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  sent_at: string;
  sender?: { name: string };
}

type FilterType = 'inbox' | 'starred' | 'sent' | 'drafts';
type InboxSource = 'team' | 'gmail';

export default function InboxPage() {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({ to: '', subject: '', content: '' });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inboxSource, setInboxSource] = useState<InboxSource>('team');

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

    // Fetch all employees for compose
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('name');
    setEmployees(allEmployees || []);
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (currentEmployee) {
      fetchMessages();
    }
  }, [currentEmployee, filter]);

  async function fetchMessages() {
    if (!supabase || !currentEmployee) return;

    let query = supabase
      .from('portal_messages')
      .select('*, sender:sender_id(name)')
      .eq('is_draft', filter === 'drafts');

    if (filter === 'inbox') {
      query = query.eq('recipient_id', currentEmployee.id);
    } else if (filter === 'sent') {
      query = query.eq('sender_id', currentEmployee.id);
    } else if (filter === 'starred') {
      query = query.eq('recipient_id', currentEmployee.id).eq('is_starred', true);
    } else if (filter === 'drafts') {
      query = query.eq('sender_id', currentEmployee.id);
    }

    const { data } = await query.order('sent_at', { ascending: false });
    setMessages(data || []);
  }

  async function markAsRead(message: Message) {
    if (!supabase || message.is_read) return;
    await supabase.from('portal_messages').update({ is_read: true }).eq('id', message.id);
    fetchMessages();
  }

  async function toggleStar(message: Message) {
    if (!supabase) return;
    await supabase.from('portal_messages').update({ is_starred: !message.is_starred }).eq('id', message.id);
    fetchMessages();
  }

  async function deleteMessage(message: Message) {
    if (!supabase) return;
    await supabase.from('portal_messages').delete().eq('id', message.id);
    setSelectedMessage(null);
    fetchMessages();
  }

  async function sendMessage() {
    if (!supabase || !currentEmployee || !newMessage.to || !newMessage.subject) return;
    
    await supabase.from('portal_messages').insert([{
      sender_id: currentEmployee.id,
      recipient_id: newMessage.to,
      subject: newMessage.subject,
      content: newMessage.content,
      is_draft: false,
      sent_at: new Date().toISOString()
    }]);

    setNewMessage({ to: '', subject: '', content: '' });
    setShowCompose(false);
    fetchMessages();
  }

  const filteredMessages = messages.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return m.subject.toLowerCase().includes(query) ||
           m.content?.toLowerCase().includes(query) ||
           (m.sender as { name: string } | undefined)?.name?.toLowerCase().includes(query);
  });

  const unreadCount = messages.filter(m => !m.is_read && filter === 'inbox').length;

  if (loading) {
    return (
      <div className="ws-loading">
        <div className="ws-loading-spinner" />
        <p>Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="ws-subpage ws-inbox-page">
      {/* Header */}
      <header className="ws-subpage-header">
        <div className="ws-subpage-header-left">
          <h1>
            <Inbox size={24} />
            Inbox
          </h1>
          {inboxSource === 'team' && unreadCount > 0 && (
            <span className="ws-subpage-count">{unreadCount} unread</span>
          )}
          {inboxSource === 'gmail' && google.unreadCount > 0 && (
            <span className="ws-subpage-count">{google.unreadCount} unread</span>
          )}
        </div>
        <div className="ws-inbox-source-tabs">
          <button
            className={`ws-source-tab ${inboxSource === 'team' ? 'active' : ''}`}
            onClick={() => setInboxSource('team')}
          >
            <Mail size={16} />
            Team
          </button>
          <button
            className={`ws-source-tab ${inboxSource === 'gmail' ? 'active' : ''}`}
            onClick={() => setInboxSource('gmail')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Gmail
            {google.status?.connected && google.unreadCount > 0 && (
              <span className="ws-gmail-badge">{google.unreadCount}</span>
            )}
          </button>
        </div>
        {inboxSource === 'team' && (
          <button
            className="ws-add-btn"
            onClick={() => setShowCompose(true)}
          >
            <Send size={18} />
            Compose
          </button>
        )}
        {inboxSource === 'gmail' && google.status?.connected && (
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ws-add-btn"
          >
            <ExternalLink size={18} />
            Open Gmail
          </a>
        )}
      </header>

      {/* Team Messages Section */}
      {inboxSource === 'team' && (
        <>
          {/* Filters */}
          <div className="ws-subpage-filters">
            <div className="ws-search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="ws-filter-tabs">
              {[
                { id: 'inbox', label: 'Inbox', icon: Inbox },
                { id: 'starred', label: 'Starred', icon: Star },
                { id: 'sent', label: 'Sent', icon: Send },
                { id: 'drafts', label: 'Drafts', icon: Archive },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`ws-filter-tab ${filter === tab.id ? 'active' : ''}`}
                  onClick={() => setFilter(tab.id as FilterType)}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message List & Detail */}
          <div className="ws-inbox-container">
        <div className="ws-message-list">
          {filteredMessages.length === 0 ? (
            <div className="ws-subpage-empty">
              <Mail size={48} />
              <h3>No messages</h3>
              <p>{filter === 'inbox' ? 'Your inbox is empty' : `No ${filter} messages`}</p>
            </div>
          ) : (
            filteredMessages.map(message => (
              <div
                key={message.id}
                className={`ws-message-item ${!message.is_read ? 'unread' : ''} ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedMessage(message);
                  markAsRead(message);
                }}
              >
                <button 
                  className={`ws-message-star ${message.is_starred ? 'starred' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(message);
                  }}
                >
                  <Star size={16} />
                </button>
                <div className="ws-message-icon">
                  {message.is_read ? <MailOpen size={18} /> : <Mail size={18} />}
                </div>
                <div className="ws-message-content">
                  <div className="ws-message-header">
                    <span className="ws-message-sender">
                      {(message.sender as { name: string } | undefined)?.name || 'Unknown'}
                    </span>
                    <span className="ws-message-time">
                      {new Date(message.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="ws-message-subject">{message.subject}</span>
                  <span className="ws-message-preview">
                    {message.content?.substring(0, 80)}...
                  </span>
                </div>
                <ChevronRight size={16} className="ws-message-arrow" />
              </div>
            ))
          )}
        </div>

        {/* Message Detail */}
        {selectedMessage && (
          <div className="ws-message-detail">
            <div className="ws-message-detail-header">
              <h2>{selectedMessage.subject}</h2>
              <div className="ws-message-detail-actions">
                <button onClick={() => toggleStar(selectedMessage)}>
                  <Star size={18} className={selectedMessage.is_starred ? 'starred' : ''} />
                </button>
                <button onClick={() => deleteMessage(selectedMessage)}>
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setSelectedMessage(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="ws-message-detail-meta">
              <span>From: {(selectedMessage.sender as { name: string } | undefined)?.name || 'Unknown'}</span>
              <span><Clock size={14} /> {new Date(selectedMessage.sent_at).toLocaleString()}</span>
            </div>
            <div className="ws-message-detail-body">
              {selectedMessage.content || 'No content'}
            </div>
            <div className="ws-message-detail-footer">
              <button className="ws-message-reply-btn">
                <Reply size={16} />
                Reply
              </button>
              <button className="ws-message-forward-btn">
                <Forward size={16} />
                Forward
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Gmail Section */}
      {inboxSource === 'gmail' && (
        <div className="ws-gmail-section">
          {!google.status?.connected ? (
            <div className="ws-gmail-connect-prompt">
              <div className="ws-gmail-connect-icon">
                <svg width="48" height="48" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <h3>Connect your Gmail</h3>
              <p>View and manage your Gmail inbox directly in Trailblaize</p>
              <button className="ws-google-connect-btn" onClick={google.connect}>
                <Link2 size={16} />
                Connect Gmail
              </button>
            </div>
          ) : google.gmailLoading ? (
            <div className="ws-gmail-loading">
              <RefreshCw size={24} className="spinning" />
              <p>Loading your emails...</p>
            </div>
          ) : (
            <>
              <div className="ws-gmail-header">
                <span className="ws-gmail-count">
                  {google.emails.length} messages • {google.unreadCount} unread
                </span>
                <button
                  className="ws-refresh-btn"
                  onClick={google.fetchEmails}
                  disabled={google.gmailLoading}
                >
                  <RefreshCw size={14} className={google.gmailLoading ? 'spinning' : ''} />
                  Refresh
                </button>
              </div>
              <div className="ws-gmail-list">
                {google.emails.length === 0 ? (
                  <div className="ws-subpage-empty">
                    <Mail size={48} />
                    <h3>No emails</h3>
                    <p>Your Gmail inbox is empty</p>
                  </div>
                ) : (
                  google.emails.map(email => (
                    <a
                      key={email.id}
                      href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`ws-gmail-item ${email.isUnread ? 'unread' : ''}`}
                    >
                      <div
                        className="ws-gmail-avatar"
                        style={{
                          backgroundColor: (() => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
                            let hash = 0;
                            for (let i = 0; i < email.fromEmail.length; i++) {
                              hash = email.fromEmail.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            return colors[Math.abs(hash) % colors.length];
                          })()
                        }}
                      >
                        {email.from.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                      </div>
                      <div className="ws-gmail-item-content">
                        <div className="ws-gmail-item-header">
                          <span className="ws-gmail-from">{email.from}</span>
                          <span className="ws-gmail-date">
                            {(() => {
                              const date = new Date(email.date);
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
                            })()}
                          </span>
                        </div>
                        <span className="ws-gmail-subject">{email.subject}</span>
                        <span className="ws-gmail-snippet">{email.snippet}</span>
                      </div>
                      {email.isUnread && <div className="ws-gmail-unread-dot" />}
                      <ExternalLink size={14} className="ws-gmail-external" />
                    </a>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="ws-modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="ws-modal ws-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>New Message</h3>
              <button onClick={() => setShowCompose(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="ws-modal-body">
              <div className="ws-form-group">
                <label>To</label>
                <select
                  value={newMessage.to}
                  onChange={(e) => setNewMessage({ ...newMessage, to: e.target.value })}
                >
                  <option value="">Select recipient...</option>
                  {employees
                    .filter(e => e.id !== currentEmployee?.id)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="ws-form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Message subject"
                />
              </div>

              <div className="ws-form-group">
                <label>Message</label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Write your message..."
                  rows={8}
                />
              </div>
            </div>

            <div className="ws-modal-footer">
              <button 
                className="ws-modal-cancel"
                onClick={() => setShowCompose(false)}
              >
                Cancel
              </button>
              <button 
                className="ws-modal-submit"
                onClick={sendMessage}
                disabled={!newMessage.to || !newMessage.subject}
              >
                <Send size={16} />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
