'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
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
  Check
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
          {unreadCount > 0 && (
            <span className="ws-subpage-count">{unreadCount} unread</span>
          )}
        </div>
        <button 
          className="ws-add-btn"
          onClick={() => setShowCompose(true)}
        >
          <Send size={18} />
          Compose
        </button>
      </header>

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
