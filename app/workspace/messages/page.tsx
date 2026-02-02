'use client';

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
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
  MessageCircle
} from 'lucide-react';

// Types
interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

// Mock data - collaboration-focused messages
const mockConversations: Conversation[] = [
  {
    id: '1',
    participant: {
      id: 'user-1',
      name: 'Sarah Chen',
      role: 'Product Manager',
      isOnline: true
    },
    lastMessage: 'The design review looks great!',
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000),
    unreadCount: 2
  },
  {
    id: '2',
    participant: {
      id: 'user-2',
      name: 'Marcus Rodriguez',
      role: 'Engineering Lead',
      isOnline: true
    },
    lastMessage: 'PR is ready for review',
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000),
    unreadCount: 0
  },
  {
    id: '3',
    participant: {
      id: 'user-3',
      name: 'Emily Watson',
      role: 'Design Lead',
      isOnline: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    lastMessage: 'Updated the Figma file with feedback',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0
  },
  {
    id: '4',
    participant: {
      id: 'user-4',
      name: 'James Park',
      role: 'Growth Lead',
      isOnline: false,
      lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    lastMessage: 'Numbers are looking solid this week',
    lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    unreadCount: 0
  },
  {
    id: '5',
    participant: {
      id: 'user-5',
      name: 'Ana Kowalski',
      role: 'Frontend Developer',
      isOnline: true
    },
    lastMessage: 'Fixed the responsive issues',
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unreadCount: 1
  }
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: '1-1', content: 'Hey! Have you had a chance to look at the Q1 roadmap?', senderId: 'user-1', timestamp: new Date(Date.now() - 60 * 60 * 1000), status: 'read' },
    { id: '1-2', content: 'Yes, reviewed it this morning. Really like the direction for the dashboard redesign.', senderId: 'current-user', timestamp: new Date(Date.now() - 55 * 60 * 1000), status: 'read' },
    { id: '1-3', content: 'The prioritization makes sense too. Should we sync on the timeline?', senderId: 'current-user', timestamp: new Date(Date.now() - 54 * 60 * 1000), status: 'read' },
    { id: '1-4', content: 'Perfect! Let\'s schedule a quick call. I\'ve also updated the specs based on stakeholder feedback.', senderId: 'user-1', timestamp: new Date(Date.now() - 45 * 60 * 1000), status: 'read' },
    { id: '1-5', content: 'How does tomorrow at 2pm work for you?', senderId: 'user-1', timestamp: new Date(Date.now() - 44 * 60 * 1000), status: 'read' },
    { id: '1-6', content: 'Tomorrow at 2 works great! I\'ll send a calendar invite.', senderId: 'current-user', timestamp: new Date(Date.now() - 30 * 60 * 1000), status: 'read' },
    { id: '1-7', content: 'Sounds good! I\'ll prep the presentation deck by then.', senderId: 'user-1', timestamp: new Date(Date.now() - 20 * 60 * 1000), status: 'read' },
    { id: '1-8', content: 'Also, the design review looks great! The team did an amazing job on the new components.', senderId: 'user-1', timestamp: new Date(Date.now() - 5 * 60 * 1000), status: 'read' },
  ],
  '2': [
    { id: '2-1', content: 'Hey, the authentication refactor is complete. Ready for code review when you have time.', senderId: 'user-2', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), status: 'read' },
    { id: '2-2', content: 'Nice! I\'ll take a look this afternoon. Any breaking changes I should know about?', senderId: 'current-user', timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000), status: 'read' },
    { id: '2-3', content: 'Just the session handling — documented it in the PR description. Tests are all passing.', senderId: 'user-2', timestamp: new Date(Date.now() - 1.25 * 60 * 60 * 1000), status: 'read' },
    { id: '2-4', content: 'Great, I appreciate the thorough documentation. Will review and merge by EOD.', senderId: 'current-user', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), status: 'read' },
    { id: '2-5', content: 'PR is ready for review 👍', senderId: 'user-2', timestamp: new Date(Date.now() - 30 * 60 * 1000), status: 'read' },
  ],
  '3': [
    { id: '3-1', content: 'Quick update on the design system — I\'ve added the new color tokens and updated the component library.', senderId: 'user-3', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), status: 'read' },
    { id: '3-2', content: 'The Figma file is now synced with the code.', senderId: 'user-3', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), status: 'read' },
    { id: '3-3', content: 'This is fantastic work, Emily! The consistency across components is much better now.', senderId: 'current-user', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000), status: 'read' },
    { id: '3-4', content: 'Thanks! Updated the Figma file with feedback from yesterday\'s design crit.', senderId: 'user-3', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), status: 'read' },
  ],
  '4': [
    { id: '4-1', content: 'Weekly metrics are in — we\'re up 23% on user acquisition compared to last week.', senderId: 'user-4', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), status: 'read' },
    { id: '4-2', content: 'That\'s excellent news! What\'s driving the increase?', senderId: 'current-user', timestamp: new Date(Date.now() - 4.75 * 60 * 60 * 1000), status: 'read' },
    { id: '4-3', content: 'The new onboarding flow is converting much better. Also seeing good traction from the partnership campaign.', senderId: 'user-4', timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000), status: 'read' },
    { id: '4-4', content: 'Numbers are looking solid this week 📈', senderId: 'user-4', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), status: 'read' },
  ],
  '5': [
    { id: '5-1', content: 'Just pushed a fix for the mobile navigation issues. Can you QA when you get a chance?', senderId: 'user-5', timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), status: 'read' },
    { id: '5-2', content: 'Sure thing! I\'ll test it on the staging environment.', senderId: 'current-user', timestamp: new Date(Date.now() - 24.5 * 60 * 60 * 1000), status: 'read' },
    { id: '5-3', content: 'Fixed the responsive issues — also improved the transition animations while I was in there.', senderId: 'user-5', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), status: 'read' },
  ]
};

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

export default function MessagesPage() {
  const { profile } = useAuth();
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [messages, setMessages] = useState<Message[]>(mockMessages['1'] || []);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Simulate typing indicator
  useEffect(() => {
    if (selectedConversation?.participant.isOnline) {
      const showTyping = Math.random() > 0.7;
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
    setMessages(mockMessages[conv.id] || []);
    setIsTyping(false);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      senderId: 'current-user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate message status progression
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'sent' } : m));
    }, 500);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'delivered' } : m));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'read' } : m));
    }, 2000);

    // Focus back on input
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
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant.role.toLowerCase().includes(searchQuery.toLowerCase())
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
          <span className="chat-workspace-badge">
            <Users size={12} />
            Workspace Chat
          </span>
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
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              className={`chat-conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
              onClick={() => handleSelectConversation(conv)}
            >
              <Avatar name={conv.participant.name} isOnline={conv.participant.isOnline} />
              <div className="chat-conversation-info">
                <div className="chat-conversation-header">
                  <span className="chat-conversation-name">{conv.participant.name}</span>
                  <span className="chat-conversation-time">
                    {conv.lastMessageTime ? formatMessageTime(conv.lastMessageTime) : ''}
                  </span>
                </div>
                <div className="chat-conversation-preview">
                  <span className="chat-conversation-role">{conv.participant.role}</span>
                  <span className="chat-conversation-last">{conv.lastMessage}</span>
                </div>
              </div>
              {conv.unreadCount > 0 && (
                <span className="chat-unread-badge">{conv.unreadCount}</span>
              )}
            </button>
          ))}
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
            <Avatar name={selectedConversation.participant.name} isOnline={selectedConversation.participant.isOnline} />
            <div className="chat-header-info">
              <div className="chat-header-name">
                <span>{selectedConversation.participant.name}</span>
                <span className="chat-header-company">• Trailblaize</span>
              </div>
              <div className="chat-header-meta">
                <span className="chat-header-role">{selectedConversation.participant.role}</span>
                {selectedConversation.participant.isOnline ? (
                  <span className="chat-header-online">
                    <span className="chat-online-dot" />
                    Online
                  </span>
                ) : selectedConversation.participant.lastSeen && (
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
              {messages.map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const isSent = message.senderId === 'current-user';
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
                      {!isSent && !isGrouped && (
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
              })}

              {/* Typing Indicator */}
              {isTyping && (
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
    </div>
  );
}
