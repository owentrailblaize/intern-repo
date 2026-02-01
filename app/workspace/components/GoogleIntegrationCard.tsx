'use client';

import React, { useState } from 'react';
import {
  Link2,
  Unlink,
  Calendar,
  Mail,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';

interface GoogleStatus {
  connected: boolean;
  isExpired: boolean;
  scopes: string[];
  hasCalendar: boolean;
  hasGmail: boolean;
}

interface GoogleIntegrationCardProps {
  status: GoogleStatus | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GoogleIntegrationCard({
  status,
  loading,
  onConnect,
  onDisconnect
}: GoogleIntegrationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  if (loading) {
    return (
      <div className="ws-google-integration-card loading">
        <div className="ws-google-integration-loading">
          <div className="ws-loading-spinner" />
          <span>Checking Google connection...</span>
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="ws-google-integration-card not-connected">
        <div className="ws-google-integration-header">
          <div className="ws-google-integration-icon">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div className="ws-google-integration-info">
            <h4>Connect Google Workspace</h4>
            <p>Sync your calendar and inbox</p>
          </div>
        </div>
        <button className="ws-google-connect-btn" onClick={onConnect}>
          <Link2 size={16} />
          Connect
        </button>
      </div>
    );
  }

  return (
    <div className="ws-google-integration-card connected">
      <button 
        className="ws-google-integration-header clickable"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="ws-google-integration-icon connected">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
        <div className="ws-google-integration-info">
          <h4>
            Google Connected
            <CheckCircle size={14} className="ws-google-check" />
          </h4>
          <p>Calendar & Gmail synced</p>
        </div>
        <div className="ws-google-integration-expand">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="ws-google-integration-details">
          <div className="ws-google-scopes">
            <div className={`ws-google-scope ${status.hasCalendar ? 'active' : ''}`}>
              <Calendar size={14} />
              <span>Calendar</span>
              {status.hasCalendar ? (
                <CheckCircle size={12} className="scope-check" />
              ) : (
                <AlertCircle size={12} className="scope-warning" />
              )}
            </div>
            <div className={`ws-google-scope ${status.hasGmail ? 'active' : ''}`}>
              <Mail size={14} />
              <span>Gmail</span>
              {status.hasGmail ? (
                <CheckCircle size={12} className="scope-check" />
              ) : (
                <AlertCircle size={12} className="scope-warning" />
              )}
            </div>
          </div>

          {status.isExpired && (
            <div className="ws-google-warning">
              <AlertCircle size={14} />
              <span>Connection expired. Please reconnect.</span>
              <button onClick={onConnect}>Reconnect</button>
            </div>
          )}

          {!showDisconnectConfirm ? (
            <button 
              className="ws-google-disconnect-btn"
              onClick={() => setShowDisconnectConfirm(true)}
            >
              <Unlink size={14} />
              Disconnect
            </button>
          ) : (
            <div className="ws-google-disconnect-confirm">
              <span>Are you sure?</span>
              <button 
                className="ws-google-disconnect-yes"
                onClick={() => {
                  onDisconnect();
                  setShowDisconnectConfirm(false);
                }}
              >
                Yes, disconnect
              </button>
              <button 
                className="ws-google-disconnect-no"
                onClick={() => setShowDisconnectConfirm(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
