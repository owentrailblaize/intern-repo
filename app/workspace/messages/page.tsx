'use client';

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, ROLE_LABELS, EmployeeRole } from '@/lib/supabase';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Users, 
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  MessageCircle,
  Plus,
  X
} from 'lucide-react';

// Types
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'received';
  isEdited?: boolean;
}

interface Conversation {
  id: string;
  name?: string;
  is_group: boolean;
  participant: {
    id: string;
    name: string;
    role: string;
    avatar_url?: string;
    isOnline: boolean;
    lastSeen?: Date;
  } | null;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  isOnline: boolean;
  department?: string;
}

// Helper functions
function formatMessageTime(date: Date): string {
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
}

function formatLastSeen(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (minutes < 60) return `last seen ${minutes}m ago`;
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function shouldShowTimestamp(currentMsg: Message, prevMsg: Message | null): boolean {
  if (!prevMsg) return true;
  const timeDiff = currentMsg.timestamp.getTime() - prevMsg.timestamp.getTime();
  return timeDiff > 10 * 60 * 1000; // 10 minutes
}

function shouldGroupWithPrevious(currentMsg: Message, prevMsg: Message | null): boolean {
  if (!prevMsg) return false;
  if (currentMsg.senderId !== prevMsg.senderId) return false;
  const timeDiff = currentMsg.timestamp.getTime() - prevMsg.timestamp.getTime();
  return timeDiff < 2 * 60 * 1000; // 2 minutes
}

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as EmployeeRole] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Message Status Component
function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'sending') {
    return <span className="chat-msg-status sending">○</span>;
  }
  if (status === 'sent') {
    return <Check size={14} className="chat-msg-status sent" />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={14} className="chat-msg-status delivered" />;
  }
  if (status === 'read') {
    return <CheckCheck size={14} className="chat-msg-status read" />;
  }
  return null;
}

// Typing Indicator Component
function TypingIndicator() {
  return (
    <div className="chat-typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

// Avatar Component
function Avatar({ name, isOnline }: { name: string; isOnline?: boolean }) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  // Rich, vibrant color palette
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  
  return (
    <div className="chat-avatar" style={{ background: color }}>
      {initials}
      {isOnline !== undefined && (
        <span className={`chat-avatar-status ${isOnline ? 'online' : 'offline'}`} />
      )}
    </div>
  );
}

// New Conversation Modal
function NewConversationModal({ 
  isOpen, 
  onClose, 
  teamMembers, 
  onSelectMember,
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  teamMembers: TeamMember[];
  onSelectMember: (member: TeamMember) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  
  if (!isOpen) return null;

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-header">
          <h2>New Message</h2>
          <button onClick={onClose} className="chat-modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="chat-modal-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="chat-modal-list">
          {isLoading ? (
            <div className="chat-modal-loading">Loading team members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="chat-modal-empty">No team members found</div>
          ) : (
            filteredMembers.map(member => (
              <button
                key={member.id}
                className="chat-modal-item"
                onClick={() => onSelectMember(member)}
              >
                <Avatar name={member.name} isOnline={member.isOnline} />
                <div className="chat-modal-item-info">
                  <span className="chat-modal-item-name">{member.name}</span>
                  <span className="chat-modal-item-role">{getRoleLabel(member.role)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentUserId = profile?.id;

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'x-employee-id': currentUserId
        }
      });
      const result = await response.json();
      
      if (result.data) {
        setConversations(result.data.map((conv: Conversation & { lastMessageTime?: string }) => ({
          ...conv,
          lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : undefined
        })));
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;

    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        headers: {
          'x-employee-id': currentUserId
        }
      });
      const result = await response.json();
      
      if (result.data) {
        setMessages(result.data.map((msg: Message & { timestamp: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUserId]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!currentUserId) return;

    setIsLoadingTeam(true);
    try {
      const response = await fetch('/api/messages/team', {
        headers: {
          'x-employee-id': currentUserId
        }
      });
      const result = await response.json();
      
      if (result.data) {
        setTeamMembers(result.data);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setIsLoadingTeam(false);
    }
  }, [currentUserId]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUserId || !supabase) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            content: string;
            sender_id: string;
            conversation_id: string;
            created_at: string;
          };
          
          // If message is for the current conversation, add it
          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            // Don't add if we already have it (we added it optimistically)
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                content: newMsg.content,
                senderId: newMsg.sender_id,
                timestamp: new Date(newMsg.created_at),
                status: newMsg.sender_id === currentUserId ? 'sent' : 'received'
              }];
            });
          }

          // Refresh conversations to update last message
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedConversation, fetchConversations]);

  // Simulate typing indicator
  useEffect(() => {
    if (selectedConversation?.participant?.isOnline) {
      const showTyping = Math.random() > 0.8;
      if (showTyping) {
        const timer = setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000 + Math.random() * 2000);
        }, 3000 + Math.random() * 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedConversation, messages]);

  // Handle conversation selection
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
    setIsTyping(false);
  };

  // Handle starting a new conversation
  const handleStartConversation = async (member: TeamMember) => {
    if (!currentUserId) return;

    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: currentUserId,
          participantId: member.id,
          isGroup: false
        })
      });
      const result = await response.json();

      if (result.data?.conversationId) {
        // Create new conversation object
        const newConv: Conversation = {
          id: result.data.conversationId,
          is_group: false,
          participant: {
            id: member.id,
            name: member.name,
            role: member.role,
            avatar_url: member.avatar_url,
            isOnline: member.isOnline
          },
          unreadCount: 0
        };

        // Check if conversation already exists in list
        const exists = conversations.find(c => c.id === newConv.id);
        if (!exists) {
          setConversations(prev => [newConv, ...prev]);
        }

        setSelectedConversation(newConv);
        fetchMessages(newConv.id);
        setShowNewConversation(false);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const messageContent = newMessage.trim();

    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: currentUserId,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          senderId: currentUserId,
          content: messageContent
        })
      });
      const result = await response.json();

      if (result.data) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => 
          m.id === tempId 
            ? { ...result.data, timestamp: new Date(result.data.timestamp), status: 'sent' as const }
            : m
        ));

        // Simulate status progression
        setTimeout(() => {
          setMessages(prev => prev.map(m => 
            m.id === result.data.id ? { ...m, status: 'delivered' as const } : m
          ));
        }, 500);

        setTimeout(() => {
          setMessages(prev => prev.map(m => 
            m.id === result.data.id ? { ...m, status: 'read' as const } : m
          ));
        }, 1500);
      } else {
        // Revert on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(messageContent);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Revert on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageContent);
    }

    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv =>
    conv.participant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant?.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-page">
      {/* Conversation List */}
      <aside className={`chat-sidebar ${selectedConversation ? 'mobile-hidden' : ''}`}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <MessageCircle size={22} />
            <h1>Messages</h1>
          </div>
          <div className="chat-sidebar-actions">
            <button 
              className="chat-new-btn"
              onClick={() => {
                setShowNewConversation(true);
                fetchTeamMembers();
              }}
              title="New message"
            >
              <Plus size={18} />
            </button>
            <span className="chat-workspace-badge">
              <Users size={12} />
              Workspace Chat
            </span>
          </div>
        </div>

        <div className="chat-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="chat-conversation-list">
          {isLoading ? (
            <div className="chat-loading">
              <div className="chat-loading-spinner" />
              <span>Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="chat-empty-list">
              <MessageCircle size={32} />
              <p>No conversations yet</p>
              <button 
                className="chat-start-btn"
                onClick={() => {
                  setShowNewConversation(true);
                  fetchTeamMembers();
                }}
              >
                Start a conversation
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                className={`chat-conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv)}
              >
                {conv.participant && (
                  <Avatar name={conv.participant.name} isOnline={conv.participant.isOnline} />
                )}
                <div className="chat-conversation-info">
                  <div className="chat-conversation-header">
                    <span className="chat-conversation-name">{conv.participant?.name || conv.name}</span>
                    <span className="chat-conversation-time">
                      {conv.lastMessageTime ? formatMessageTime(conv.lastMessageTime) : ''}
                    </span>
                  </div>
                  <div className="chat-conversation-preview">
                    <span className="chat-conversation-role">
                      {conv.participant ? getRoleLabel(conv.participant.role) : ''}
                    </span>
                    <span className="chat-conversation-last">{conv.lastMessage}</span>
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="chat-unread-badge">{conv.unreadCount}</span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      {selectedConversation ? (
        <main className="chat-main">
          {/* Chat Header */}
          <header className="chat-header">
            <button 
              className="chat-back-btn"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft size={20} />
            </button>
            {selectedConversation.participant && (
              <Avatar 
                name={selectedConversation.participant.name} 
                isOnline={selectedConversation.participant.isOnline} 
              />
            )}
            <div className="chat-header-info">
              <div className="chat-header-name">
                <span>{selectedConversation.participant?.name || selectedConversation.name}</span>
                <span className="chat-header-company">• Trailblaize</span>
              </div>
              <div className="chat-header-meta">
                <span className="chat-header-role">
                  {selectedConversation.participant ? getRoleLabel(selectedConversation.participant.role) : ''}
                </span>
                {selectedConversation.participant?.isOnline ? (
                  <span className="chat-header-online">
                    <span className="chat-online-dot" />
                    Online
                  </span>
                ) : selectedConversation.participant?.lastSeen && (
                  <span className="chat-header-lastseen">
                    {formatLastSeen(selectedConversation.participant.lastSeen)}
                  </span>
                )}
              </div>
            </div>
            <div className="chat-header-actions">
              <button className="chat-header-btn" title="Voice call">
                <Phone size={18} />
              </button>
              <button className="chat-header-btn" title="Video call">
                <Video size={18} />
              </button>
              <button className="chat-header-btn" title="More options">
                <MoreVertical size={18} />
              </button>
            </div>
          </header>

          {/* Messages Area */}
          <div className="chat-messages">
            <div className="chat-messages-inner">
              {isLoadingMessages ? (
                <div className="chat-loading-messages">
                  <div className="chat-loading-spinner" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-no-messages">
                  <MessageCircle size={40} />
                  <p>No messages yet</p>
                  <span>Send a message to start the conversation</span>
                </div>
              ) : (
                messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const isSent = message.senderId === currentUserId;
                  const showTimestamp = shouldShowTimestamp(message, prevMessage);
                  const isGrouped = shouldGroupWithPrevious(message, prevMessage);

                  return (
                    <React.Fragment key={message.id}>
                      {showTimestamp && (
                        <div className="chat-timestamp">
                          {formatMessageTime(message.timestamp)}
                        </div>
                      )}
                      <div
                        className={`chat-message ${isSent ? 'sent' : 'received'} ${isGrouped ? 'grouped' : ''}`}
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        {!isSent && !isGrouped && selectedConversation.participant && (
                          <Avatar name={selectedConversation.participant.name} />
                        )}
                        {!isSent && isGrouped && <div className="chat-avatar-spacer" />}
                        <div className="chat-message-bubble">
                          <p>{message.content}</p>
                          <div className="chat-message-meta">
                            {hoveredMessageId === message.id && (
                              <span className="chat-message-time">
                                {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                            {isSent && <MessageStatus status={message.status} />}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {/* Typing Indicator */}
              {isTyping && selectedConversation.participant && (
                <div className="chat-message received">
                  <Avatar name={selectedConversation.participant.name} />
                  <div className="chat-message-bubble typing-bubble">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="chat-input-area">
            <div className="chat-input-container">
              <button className="chat-input-btn" title="Attach file">
                <Paperclip size={20} />
              </button>
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="chat-input-btn" title="Emoji">
                <Smile size={20} />
              </button>
              <button 
                className={`chat-send-btn ${newMessage.trim() ? 'active' : ''}`}
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="chat-footer-text">Trailblaize.space • Secure workspace messaging</p>
          </div>
        </main>
      ) : (
        <main className="chat-empty">
          <div className="chat-empty-content">
            <div className="chat-empty-icon">
              <MessageCircle size={48} />
            </div>
            <h2>Welcome to Messages</h2>
            <p>Select a conversation to start chatting with your team</p>
          </div>
        </main>
      )}

      {/* New Conversation Modal */}
      <NewConversationModal 
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        teamMembers={teamMembers}
        onSelectMember={handleStartConversation}
        isLoading={isLoadingTeam}
      />
    </div>
  );
}
