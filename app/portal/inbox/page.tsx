'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import {
  Inbox,
  Send,
  Star,
  Archive,
  Trash2,
  RefreshCw,
  MoreVertical,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Paperclip,
  Reply,
  Forward,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Settings,
  Plus
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  recipient_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_draft: boolean;
  labels: string[];
  sent_at: string;
  thread_id: string;
}

interface ExternalEmail {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  snippet: string;
  is_read: boolean;
  is_starred: boolean;
  email_date: string;
  labels: string[];
}

type TabType = 'inbox' | 'sent' | 'starred' | 'drafts' | 'external';

export default function InboxPage() {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [externalEmails, setExternalEmails] = useState<ExternalEmail[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Gmail connection state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [showGmailSetup, setShowGmailSetup] = useState(false);

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
    fetchAllEmployees();
    checkGmailConnection();
  }, [fetchEmployee]);

  useEffect(() => {
    if (currentEmployee) {
      fetchMessages();
      if (gmailConnected) {
        fetchExternalEmails();
      }
    }
  }, [currentEmployee, activeTab, gmailConnected]);

  async function fetchAllEmployees() {
    if (!supabase) return;
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('name');
    setEmployees(data || []);
  }

  async function checkGmailConnection() {
    if (!supabase || !user) return;
    // Check if user has connected Gmail
    const { data } = await supabase
      .from('portal_email_accounts')
      .select('*')
      .eq('employee_id', currentEmployee?.id)
      .eq('is_connected', true)
      .single();
    
    setGmailConnected(!!data);
  }

  async function fetchMessages() {
    if (!supabase || !currentEmployee) return;
    
    let query = supabase.from('portal_messages').select(`
      *,
      sender:sender_id(name, email)
    `);

    switch (activeTab) {
      case 'inbox':
        query = query
          .eq('recipient_id', currentEmployee.id)
          .eq('is_archived', false)
          .eq('is_draft', false);
        break;
      case 'sent':
        query = query
          .eq('sender_id', currentEmployee.id)
          .eq('is_draft', false);
        break;
      case 'starred':
        query = query
          .or(`sender_id.eq.${currentEmployee.id},recipient_id.eq.${currentEmployee.id}`)
          .eq('is_starred', true);
        break;
      case 'drafts':
        query = query
          .eq('sender_id', currentEmployee.id)
          .eq('is_draft', true);
        break;
    }

    const { data } = await query.order('sent_at', { ascending: false });
    
    setMessages(data?.map(m => ({
      ...m,
      sender_name: (m.sender as { name: string } | null)?.name || 'Unknown',
      sender_email: (m.sender as { email: string } | null)?.email || ''
    })) || []);
  }

  async function fetchExternalEmails() {
    if (!supabase || !currentEmployee) return;
    const { data } = await supabase
      .from('portal_external_emails')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .order('email_date', { ascending: false })
      .limit(50);
    setExternalEmails(data || []);
  }

  async function toggleRead(msg: Message) {
    if (!supabase) return;
    await supabase
      .from('portal_messages')
      .update({ is_read: !msg.is_read, read_at: msg.is_read ? null : new Date().toISOString() })
      .eq('id', msg.id);
    fetchMessages();
  }

  async function toggleStar(msg: Message, e: React.MouseEvent) {
    e.stopPropagation();
    if (!supabase) return;
    await supabase
      .from('portal_messages')
      .update({ is_starred: !msg.is_starred })
      .eq('id', msg.id);
    fetchMessages();
  }

  async function archiveMessage(msg: Message) {
    if (!supabase) return;
    await supabase
      .from('portal_messages')
      .update({ is_archived: true })
      .eq('id', msg.id);
    setSelectedMessage(null);
    fetchMessages();
  }

  async function deleteMessage(msg: Message) {
    if (!supabase) return;
    await supabase
      .from('portal_messages')
      .delete()
      .eq('id', msg.id);
    setSelectedMessage(null);
    fetchMessages();
  }

  async function sendMessage() {
    if (!supabase || !currentEmployee || !composeTo || !composeSubject) return;
    
    await supabase.from('portal_messages').insert([{
      sender_id: currentEmployee.id,
      recipient_id: composeTo,
      subject: composeSubject,
      body: composeBody,
      is_draft: false,
      thread_id: crypto.randomUUID(),
    }]);

    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    fetchMessages();
  }

  async function saveDraft() {
    if (!supabase || !currentEmployee) return;
    
    await supabase.from('portal_messages').insert([{
      sender_id: currentEmployee.id,
      recipient_id: composeTo || null,
      subject: composeSubject || '(No subject)',
      body: composeBody,
      is_draft: true,
      thread_id: crypto.randomUUID(),
    }]);

    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    if (gmailConnected) {
      await fetchExternalEmails();
    }
    setRefreshing(false);
  };

  const unreadCount = messages.filter(m => !m.is_read && m.recipient_id === currentEmployee?.id).length;

  const tabs = [
    { id: 'inbox' as TabType, label: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'sent' as TabType, label: 'Sent', icon: Send },
    { id: 'starred' as TabType, label: 'Starred', icon: Star },
    { id: 'drafts' as TabType, label: 'Drafts', icon: Mail },
    { id: 'external' as TabType, label: 'Gmail', icon: ExternalLink, isExternal: true },
  ];

  const filteredMessages: Message[] = messages.filter(msg => 
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="portal-loading-spinner" />
        <p>Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="inbox-page">
      {/* Inbox Header */}
      <header className="inbox-header">
        <h1>
          <Mail size={24} />
          Messages
        </h1>
        <button 
          className="inbox-compose-btn"
          onClick={() => setShowCompose(true)}
        >
          <Plus size={18} />
          Compose
        </button>
      </header>

      <div className="inbox-container">
        {/* Sidebar */}
        <aside className="inbox-sidebar">
          <nav className="inbox-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`inbox-tab ${activeTab === tab.id ? 'active' : ''} ${tab.isExternal && !gmailConnected ? 'disconnected' : ''}`}
                onClick={() => {
                  if (tab.id === 'external' && !gmailConnected) {
                    setShowGmailSetup(true);
                  } else {
                    setActiveTab(tab.id);
                    setSelectedMessage(null);
                  }
                }}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
                {tab.count && tab.count > 0 && (
                  <span className="inbox-tab-count">{tab.count}</span>
                )}
                {tab.isExternal && !gmailConnected && (
                  <span className="inbox-tab-badge">Connect</span>
                )}
              </button>
            ))}
          </nav>

          {/* Gmail Connection Status */}
          {activeTab === 'external' && (
            <div className="inbox-gmail-status">
              {gmailConnected ? (
                <div className="gmail-connected">
                  <Check size={16} />
                  <span>Gmail Connected</span>
                </div>
              ) : (
                <button 
                  className="gmail-connect-btn"
                  onClick={() => setShowGmailSetup(true)}
                >
                  <ExternalLink size={16} />
                  Connect Gmail
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="inbox-main">
          {/* Toolbar */}
          <div className="inbox-toolbar">
            <div className="inbox-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="inbox-toolbar-actions">
              <button 
                className={`inbox-toolbar-btn ${refreshing ? 'spinning' : ''}`}
                onClick={handleRefresh}
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
              <button className="inbox-toolbar-btn" title="More options">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Message List or Detail View */}
          <div className="inbox-content">
            {selectedMessage ? (
              /* Message Detail View */
              <div className="inbox-detail">
                <div className="inbox-detail-header">
                  <button 
                    className="inbox-back-btn"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <ChevronLeft size={20} />
                    Back
                  </button>
                  <div className="inbox-detail-actions">
                    <button 
                      className="inbox-detail-action"
                      onClick={() => archiveMessage(selectedMessage)}
                    >
                      <Archive size={18} />
                    </button>
                    <button 
                      className="inbox-detail-action"
                      onClick={() => deleteMessage(selectedMessage)}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      className={`inbox-detail-action ${selectedMessage.is_starred ? 'starred' : ''}`}
                      onClick={(e) => toggleStar(selectedMessage, e)}
                    >
                      <Star size={18} />
                    </button>
                  </div>
                </div>

                <div className="inbox-detail-content">
                  <h2>{selectedMessage.subject}</h2>
                  
                  <div className="inbox-detail-meta">
                    <div className="inbox-detail-sender">
                      <div className="inbox-avatar">
                        {selectedMessage.sender_name?.charAt(0) || '?'}
                      </div>
                      <div className="inbox-sender-info">
                        <span className="inbox-sender-name">{selectedMessage.sender_name}</span>
                        <span className="inbox-sender-email">{selectedMessage.sender_email}</span>
                      </div>
                    </div>
                    <span className="inbox-detail-date">
                      {new Date(selectedMessage.sent_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="inbox-detail-body">
                    {selectedMessage.body || <span className="no-content">No message content</span>}
                  </div>

                  <div className="inbox-detail-reply">
                    <button className="inbox-reply-btn">
                      <Reply size={16} />
                      Reply
                    </button>
                    <button className="inbox-forward-btn">
                      <Forward size={16} />
                      Forward
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'external' ? (
              /* External Gmail View */
              <div className="inbox-list">
                {!gmailConnected ? (
                  <div className="inbox-empty">
                    <ExternalLink size={48} />
                    <h3>Connect Your Gmail</h3>
                    <p>Link your Gmail account to see all your emails in one place</p>
                    <button 
                      className="inbox-connect-gmail-btn"
                      onClick={() => setShowGmailSetup(true)}
                    >
                      Connect Gmail Account
                    </button>
                  </div>
                ) : externalEmails.length === 0 ? (
                  <div className="inbox-empty">
                    <Mail size={48} />
                    <h3>No Gmail messages</h3>
                    <p>Your synced emails will appear here</p>
                  </div>
                ) : (
                  externalEmails.map(email => (
                    <div 
                      key={email.id}
                      className={`inbox-item external ${email.is_read ? 'read' : 'unread'}`}
                    >
                      <div className="inbox-item-checkbox">
                        <input type="checkbox" />
                      </div>
                      <button 
                        className={`inbox-item-star ${email.is_starred ? 'starred' : ''}`}
                      >
                        <Star size={16} />
                      </button>
                      <div className="inbox-item-sender">
                        {email.from_name || email.from_email}
                      </div>
                      <div className="inbox-item-content">
                        <span className="inbox-item-subject">{email.subject || '(No subject)'}</span>
                        <span className="inbox-item-snippet">{email.snippet}</span>
                      </div>
                      <div className="inbox-item-labels">
                        {email.labels?.slice(0, 2).map(label => (
                          <span key={label} className="inbox-label">{label}</span>
                        ))}
                      </div>
                      <span className="inbox-item-date">
                        {new Date(email.email_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Internal Messages List */
              <div className="inbox-list">
                {filteredMessages.length === 0 && (
                  <div className="inbox-empty">
                    <Inbox size={48} />
                    <h3>No messages</h3>
                    <p>{activeTab === 'inbox' ? 'Your inbox is empty' : `No ${activeTab} messages`}</p>
                  </div>
                )}
                {filteredMessages.map((msg: Message) => (
                  <div 
                    key={msg.id}
                    className={`inbox-item ${msg.is_read ? 'read' : 'unread'}`}
                    onClick={() => {
                      setSelectedMessage(msg);
                      if (!msg.is_read) toggleRead(msg);
                    }}
                  >
                    <div className="inbox-item-checkbox">
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                    </div>
                    <button 
                      className={`inbox-item-star ${msg.is_starred ? 'starred' : ''}`}
                      onClick={(e) => toggleStar(msg, e)}
                    >
                      <Star size={16} />
                    </button>
                    <div className="inbox-item-sender">
                      {activeTab === 'sent' ? 'To: ' : ''}{msg.sender_name}
                    </div>
                    <div className="inbox-item-content">
                      <span className="inbox-item-subject">{msg.subject || '(No subject)'}</span>
                      <span className="inbox-item-snippet">{msg.body?.slice(0, 80) || ''}</span>
                    </div>
                    <span className="inbox-item-date">
                      {new Date(msg.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="inbox-pagination">
            <span className="inbox-pagination-info">
              1-{filteredMessages.length} of {messages.length}
            </span>
            <div className="inbox-pagination-controls">
              <button className="inbox-pagination-btn" disabled>
                <ChevronLeft size={18} />
              </button>
              <button className="inbox-pagination-btn" disabled>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="inbox-compose-overlay">
          <div className="inbox-compose-modal">
            <div className="inbox-compose-header">
              <h3>New Message</h3>
              <button 
                className="inbox-compose-close"
                onClick={() => setShowCompose(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="inbox-compose-body">
              <div className="inbox-compose-field">
                <label>To</label>
                <select 
                  value={composeTo} 
                  onChange={(e) => setComposeTo(e.target.value)}
                >
                  <option value="">Select recipient...</option>
                  {employees
                    .filter(e => e.id !== currentEmployee?.id)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="inbox-compose-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter subject..."
                />
              </div>

              <div className="inbox-compose-field body">
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={10}
                />
              </div>
            </div>

            <div className="inbox-compose-footer">
              <div className="inbox-compose-actions-left">
                <button className="inbox-attach-btn">
                  <Paperclip size={18} />
                </button>
              </div>
              <div className="inbox-compose-actions-right">
                <button 
                  className="inbox-draft-btn"
                  onClick={saveDraft}
                >
                  Save Draft
                </button>
                <button 
                  className="inbox-send-btn"
                  onClick={sendMessage}
                  disabled={!composeTo || !composeSubject}
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Setup Modal */}
      {showGmailSetup && (
        <div className="inbox-compose-overlay">
          <div className="inbox-gmail-modal">
            <div className="inbox-compose-header">
              <h3>Connect Gmail</h3>
              <button 
                className="inbox-compose-close"
                onClick={() => setShowGmailSetup(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="inbox-gmail-content">
              <div className="inbox-gmail-icon">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
              </div>
              
              <h4>Link your Gmail account</h4>
              <p>See all your emails in one place. Your emails will sync automatically.</p>

              <div className="inbox-gmail-features">
                <div className="inbox-gmail-feature">
                  <Check size={16} />
                  <span>View Gmail messages directly</span>
                </div>
                <div className="inbox-gmail-feature">
                  <Check size={16} />
                  <span>Automatic sync every 5 minutes</span>
                </div>
                <div className="inbox-gmail-feature">
                  <Check size={16} />
                  <span>Secure OAuth 2.0 connection</span>
                </div>
              </div>

              <div className="inbox-gmail-notice">
                <AlertCircle size={16} />
                <span>This feature requires Google OAuth setup in production</span>
              </div>

              <button className="inbox-gmail-connect-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
