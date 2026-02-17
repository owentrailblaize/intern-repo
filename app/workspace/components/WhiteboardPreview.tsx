'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WhiteboardEntry {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  author_name: string;
  font_size: number;
  created_at: string;
}

const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 3000;

/**
 * Read-only scaled miniature of the shared whiteboard.
 * Fetches entries once, subscribes to real-time updates,
 * and renders them as absolutely-positioned text on a tiny canvas.
 */
export function WhiteboardPreview() {
  const [entries, setEntries] = useState<WhiteboardEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.05);

  // Fetch entries
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/whiteboard');
        const { data } = await res.json();
        if (data) setEntries(data);
      } catch (err) {
        console.error('WhiteboardPreview: failed to fetch entries', err);
      }
    }
    load();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('wb-preview-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whiteboard_entries',
      }, (payload) => {
        const entry = payload.new as WhiteboardEntry;
        setEntries(prev => prev.some(e => e.id === entry.id) ? prev : [...prev, entry]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'whiteboard_entries',
      }, () => {
        setEntries([]);
      })
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, []);

  // Compute scale to fit content in the container
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) {
        const sx = width / BOARD_WIDTH;
        const sy = height / BOARD_HEIGHT;
        setScale(Math.min(sx, sy));
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Link href="/workspace/whiteboard" className="cc-wb-preview">
      <div className="cc-wb-preview-header">
        <span className="cc-priority-title">Whiteboard</span>
        <ArrowUpRight size={14} className="cc-wb-preview-arrow" />
      </div>
      <div className="cc-wb-preview-canvas" ref={containerRef}>
        <div
          className="cc-wb-preview-board"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {entries.map((entry) => (
            <span
              key={entry.id}
              className="cc-wb-preview-entry"
              style={{
                left: entry.x,
                top: entry.y,
                color: entry.color,
                fontSize: entry.font_size,
              }}
            >
              {entry.text}
            </span>
          ))}
        </div>
        {entries.length === 0 && (
          <div className="cc-wb-preview-empty">
            Click to open the whiteboard
          </div>
        )}
      </div>
    </Link>
  );
}
