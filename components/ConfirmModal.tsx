'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import ModalOverlay from '@/components/ModalOverlay';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 size={24} />,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      buttonBg: '#dc2626',
      buttonHover: '#b91c1c',
    },
    warning: {
      icon: <AlertTriangle size={24} />,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      buttonBg: '#d97706',
      buttonHover: '#b45309',
    },
    default: {
      icon: <AlertTriangle size={24} />,
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      buttonBg: '#1a2744',
      buttonHover: '#0f172a',
    },
  };

  const styles = variantStyles[variant];

  return (
    <ModalOverlay className="confirm-modal-overlay" onClose={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-modal-close" onClick={onCancel}>
          <X size={18} />
        </button>
        
        <div 
          className="confirm-modal-icon"
          style={{ backgroundColor: styles.iconBg, color: styles.iconColor }}
        >
          {styles.icon}
        </div>
        
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className="confirm-modal-confirm"
            style={{ backgroundColor: styles.buttonBg }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
