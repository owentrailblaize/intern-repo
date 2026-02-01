'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useUserRole } from '../hooks/useUserRole';
import { getNavigationItems } from '../utils/rolePermissions';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FolderKanban,
  Target,
  Users,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LucideIcon
} from 'lucide-react';

interface SidebarProps {
  unreadCount?: number;
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FolderKanban,
  Target,
  Users,
};

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { role, roleLabel, canAccessNucleus, features } = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavigationItems(role, unreadCount);

  const isActive = (href: string) => {
    if (href === '/workspace') return pathname === '/workspace';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="ws-mobile-header">
        <button 
          className="ws-mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="ws-mobile-logo">
          <img src="/logo-icon.svg" alt="Trailblaize" />
          <span>Workspace</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`ws-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="ws-sidebar-header">
          <Link href="/workspace" className="ws-logo">
            <img src="/logo-icon.svg" alt="Trailblaize" className="ws-logo-icon" />
            {!collapsed && <span className="ws-logo-text">Workspace</span>}
          </Link>
          <button 
            className="ws-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="ws-nav">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`ws-nav-item ${isActive(item.href) ? 'active' : ''} ${item.emphasized ? 'emphasized' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={20} />
                {!collapsed && (
                  <>
                    <span>{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ws-nav-badge">{item.badge}</span>
                    )}
                  </>
                )}
                {collapsed && item.badge && item.badge > 0 && (
                  <span className="ws-nav-badge-dot" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ws-sidebar-divider" />

        {/* Quick Access */}
        {!collapsed && (
          <div className="ws-quick-access">
            <span className="ws-quick-label">Quick Access</span>
            {canAccessNucleus && (
              <Link href="/nucleus" className="ws-nucleus-link">
                <Zap size={16} />
                <span>Nucleus Admin</span>
              </Link>
            )}
          </div>
        )}

        {/* User Section */}
        <div className="ws-sidebar-footer">
          <div className={`ws-user ${collapsed ? 'collapsed' : ''}`}>
            <div className="ws-user-avatar">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="ws-user-info">
                <span className="ws-user-name">{profile?.name}</span>
                <span className="ws-user-role">{roleLabel}</span>
              </div>
            )}
            <button 
              className="ws-logout-btn"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="ws-mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
