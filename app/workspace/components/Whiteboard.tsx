'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Employee } from '@/lib/supabase';
import { Trash2, X, Send } from 'lucide-react';
import ModalOverlay from '@/components/ModalOverlay';

interface WhiteboardEntry {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  author_id: string | null;
  author_name: string;
  font_size: number;
  created_at: string;
}

interface PresenceUser {
  name: string;
  color: string;
  lastActive: number;
}

const MARKER_COLORS = [
  { id: 'black', hex: '#1a1a1a', label: 'Black' },
  { id: 'blue', hex: '#2563eb', label: 'Blue' },
  { id: 'red', hex: '#dc2626', label: 'Red' },
];

const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 3000;

export function Whiteboard() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<WhiteboardEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedColor, setSelectedColor] = useState(MARKER_COLORS[0].hex);
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [placementTarget, setPlacementTarget] = useState<{ x: number; y: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [animatingEntries, setAnimatingEntries] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Viewport state for pan
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panViewportStart, setPanViewportStart] = useState({ x: 0, y: 0 });

  // Fetch current employee
  useEffect(() => {
    async function fetchEmployee() {
      if (!supabase || !user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();

      if (data) setCurrentEmployee(data);
      setLoading(false);
    }
    fetchEmployee();
  }, [user]);

  // Fetch initial entries
  useEffect(() => {
    async function fetchEntries() {
      try {
        const res = await fetch('/api/whiteboard');
        const { data } = await res.json();
        if (data) setEntries(data);
      } catch (err) {
        console.error('Failed to fetch whiteboard entries:', err);
      }
    }
    fetchEntries();
  }, []);

  // Real-time subscription for new entries
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('whiteboard-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whiteboard_entries',
      }, (payload) => {
        const newEntry = payload.new as WhiteboardEntry;
        setEntries(prev => {
          if (prev.some(e => e.id === newEntry.id)) return prev;
          return [...prev, newEntry];
        });
        // Trigger animation for new entry
        setAnimatingEntries(prev => new Set(prev).add(newEntry.id));
        setTimeout(() => {
          setAnimatingEntries(prev => {
            const next = new Set(prev);
            next.delete(newEntry.id);
            return next;
          });
        }, 600);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'whiteboard_entries',
      }, () => {
        // Board was cleared — refetch
        fetchAllEntries();
      })
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  // Presence channel
  useEffect(() => {
    if (!supabase || !currentEmployee) return;

    const presenceChannel = supabase.channel('whiteboard-presence', {
      config: { presence: { key: currentEmployee.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = new Map<string, PresenceUser>();
        Object.entries(state).forEach(([key, presences]) => {
          const p = (presences as unknown as Array<{ name: string; color: string; lastActive: number }>)[0];
          if (p && key !== currentEmployee.id) {
            users.set(key, { name: p.name, color: p.color, lastActive: p.lastActive });
          }
        });
        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            name: currentEmployee.name,
            color: selectedColor,
            lastActive: Date.now(),
          });
        }
      });

    return () => {
      supabase!.removeChannel(presenceChannel);
    };
  }, [currentEmployee]);

  // Update presence when color changes
  useEffect(() => {
    if (!supabase || !currentEmployee) return;
    const channel = supabase.channel('whiteboard-presence');
    channel.track({
      name: currentEmployee.name,
      color: selectedColor,
      lastActive: Date.now(),
    }).catch(() => {});
  }, [selectedColor, currentEmployee]);

  async function fetchAllEntries() {
    try {
      const res = await fetch('/api/whiteboard');
      const { data } = await res.json();
      if (data) setEntries(data);
    } catch (err) {
      console.error('Failed to fetch whiteboard entries:', err);
    }
  }

  /** Find the best available placement position on the board */
  function findNextPosition(): { x: number; y: number } {
    if (placementTarget) {
      const target = placementTarget;
      setPlacementTarget(null);
      return target;
    }

    if (entries.length === 0) {
      return { x: 80, y: 80 };
    }

    // Place below the last entry with some padding
    const sorted = [...entries].sort((a, b) => {
      if (Math.abs(a.y - b.y) < 40) return a.x - b.x;
      return a.y - b.y;
    });

    const last = sorted[sorted.length - 1];
    let nextY = last.y + 52;
    let nextX = 80;

    // If we're getting too far down, start a new column
    if (nextY > BOARD_HEIGHT - 100) {
      const maxX = Math.max(...entries.map(e => e.x));
      nextX = maxX + 400;
      nextY = 80;
    }

    return { x: nextX, y: nextY };
  }

  /** Submit a new entry */
  const handleSubmit = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    const pos = findNextPosition();

    setInputText('');

    try {
      const res = await fetch('/api/whiteboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          x: pos.x,
          y: pos.y,
          color: selectedColor,
          author_id: currentEmployee?.id || null,
          author_name: currentEmployee?.name || profile?.name || 'Unknown',
          font_size: 28,
        }),
      });

      const { data } = await res.json();
      if (data) {
        // Entry will arrive via real-time subscription
        // but add it immediately for responsiveness
        setEntries(prev => {
          if (prev.some(e => e.id === data.id)) return prev;
          return [...prev, data];
        });
        setAnimatingEntries(prev => new Set(prev).add(data.id));
        setTimeout(() => {
          setAnimatingEntries(prev => {
            const next = new Set(prev);
            next.delete(data.id);
            return next;
          });
        }, 600);
      }
    } catch (err) {
      console.error('Failed to create entry:', err);
    }

    inputRef.current?.focus();
  }, [inputText, selectedColor, currentEmployee, profile, entries, placementTarget]);

  /** Handle keyboard submit */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /** Handle board click for placement targeting */
  const handleBoardClick = (e: React.MouseEvent) => {
    if (isPanning) return;
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = (e.clientX - rect.left) - viewport.x;
    const y = (e.clientY - rect.top) - viewport.y;

    setPlacementTarget({ x, y });
    inputRef.current?.focus();
  };

  /** Pan handlers */
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanViewportStart({ x: viewport.x, y: viewport.y });
    }
  };

  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setViewport({
      x: Math.min(0, Math.max(panViewportStart.x + dx, -(BOARD_WIDTH - window.innerWidth + 240))),
      y: Math.min(0, Math.max(panViewportStart.y + dy, -(BOARD_HEIGHT - window.innerHeight + 100))),
    });
  }, [isPanning, panStart, panViewportStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      return () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  /** Clear the board */
  async function clearBoard() {
    try {
      await fetch('/api/whiteboard?confirm=true', { method: 'DELETE' });
      setEntries([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear board:', err);
    }
  }

  // Active presence users (active within last 2 minutes)
  const activeUsers = Array.from(presenceUsers.entries())
    .filter(([, u]) => Date.now() - u.lastActive < 120000)
    .map(([id, u]) => ({ id, ...u }));

  if (loading) {
    return (
      <div className="wb-loading">
        <div className="wb-loading-spinner" />
        <p>Loading whiteboard...</p>
      </div>
    );
  }

  return (
    <div className="wb-container">
      {/* Minimal top bar */}
      <div className="wb-topbar">
        <span className="wb-topbar-title">Whiteboard</span>
        <div className="wb-topbar-right">
          {/* Active collaborators */}
          {activeUsers.length > 0 && (
            <div className="wb-presence">
              {activeUsers.map((u) => (
                <div
                  key={u.id}
                  className="wb-presence-dot"
                  style={{ background: u.color }}
                  title={u.name}
                >
                  <span className="wb-presence-label">{u.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}
          <button
            className="wb-clear-btn"
            onClick={() => setShowClearConfirm(true)}
            title="Clear board"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Whiteboard canvas */}
      <div
        ref={canvasRef}
        className="wb-canvas"
        onMouseDown={handlePanStart}
        onClick={handleBoardClick}
      >
        <div
          ref={boardRef}
          className="wb-board"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px)`,
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
          }}
        >
          {/* Placement target indicator */}
          {placementTarget && (
            <div
              className="wb-placement-marker"
              style={{ left: placementTarget.x, top: placementTarget.y }}
            />
          )}

          {/* Whiteboard entries */}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`wb-entry ${animatingEntries.has(entry.id) ? 'wb-entry-animate' : ''}`}
              style={{
                left: entry.x,
                top: entry.y,
                color: entry.color,
                fontSize: entry.font_size,
              }}
            >
              <span className="wb-entry-text">
                {animatingEntries.has(entry.id) ? (
                  <WriteOnText text={entry.text} />
                ) : (
                  entry.text
                )}
              </span>
              <span className="wb-entry-author">{entry.author_name?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom input bar */}
      <div className="wb-input-bar">
        {/* Color selector */}
        <div className="wb-color-selector">
          {MARKER_COLORS.map((color) => (
            <button
              key={color.id}
              className={`wb-color-dot ${selectedColor === color.hex ? 'wb-color-active' : ''}`}
              style={{ background: color.hex }}
              onClick={() => setSelectedColor(color.hex)}
              title={color.label}
              aria-label={`${color.label} marker`}
            />
          ))}
        </div>

        {/* Text input */}
        <div className="wb-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="wb-input"
            placeholder="Write on the board..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <button
            className="wb-send-btn"
            onClick={handleSubmit}
            disabled={!inputText.trim()}
            aria-label="Add to board"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <ModalOverlay className="wb-modal-overlay" onClose={() => setShowClearConfirm(false)}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <h3>Clear Whiteboard</h3>
              <button onClick={() => setShowClearConfirm(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="wb-modal-body">
              This will erase everything on the whiteboard. This action cannot be undone.
            </p>
            <div className="wb-modal-actions">
              <button className="wb-modal-cancel" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="wb-modal-confirm" onClick={clearBoard}>
                Clear Board
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/** Write-on animation component — characters appear sequentially */
function WriteOnText({ text }: { text: string }) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    const charDelay = Math.max(15, Math.min(40, 400 / text.length));
    let frame: number;
    let count = 0;

    function tick() {
      count++;
      setVisibleChars(count);
      if (count < text.length) {
        frame = window.setTimeout(tick, charDelay);
      }
    }

    frame = window.setTimeout(tick, 50);
    return () => clearTimeout(frame);
  }, [text]);

  return (
    <>
      <span>{text.slice(0, visibleChars)}</span>
      <span className="wb-cursor-blink">|</span>
    </>
  );
}
