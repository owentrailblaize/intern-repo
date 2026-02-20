'use client';

import React, { useRef } from 'react';

interface ModalOverlayProps {
  className?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Drop-in replacement for overlay <div>s that dismisses on outside click.
 * Only fires onClose when BOTH mousedown and mouseup occur on the overlay
 * itself, preventing accidental closes during text selection / drag.
 */
export default function ModalOverlay({ className, onClose, children }: ModalOverlayProps) {
  const mouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <div
      className={className}
      onMouseDown={(e) => { mouseDownTarget.current = e.target; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}
