'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useUserRole } from '../hooks/useUserRole';
import { getNavigationItems } from '../utils/rolePermissions';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  PenLine,
  Target,
  Users,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  MessageCircle,
  LucideIcon,
  TrendingUp,
  HeartHandshake,
  Wallet,
  Building2,
  Rocket,
  Bell,
  MoreHorizontal,
} from 'lucide-react';

interface SidebarProps {
  unreadCount?: number;
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  PenLine,
  Target,
  Users,
  MessageCircle,
  Zap,
  TrendingUp,
};

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { role, roleLabel, canAccessNucleus } = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const navItems = getNavigationItems(role, unreadCount);

  const isActive = (href: string) => {
    if (href === '/workspace') return pathname === '/workspace';
    return pathname.startsWith(href);
  };

  const inNucleus = pathname.startsWith('/nucleus');
  const nucleusModules = [
    { name: 'Dashboard', href: '/nucleus', icon: Zap },
    { name: 'Sales Pipeline', href: '/nucleus/pipeline', icon: TrendingUp },
    { name: 'Customer Success', href: '/nucleus/customer-success', icon: HeartHandshake },
    { name: 'Finance', href: '/nucleus/finance', icon: Wallet },
    { name: 'Operations', href: '/nucleus/operations', icon: CheckSquare },
    { name: 'Enterprise', href: '/nucleus/enterprise', icon: Building2 },
    { name: 'Fundraising', href: '/nucleus/fundraising', icon: Rocket },
    { name: 'Employees', href: '/nucleus/employees', icon: Users },
  ];

  // Bottom tab items for mobile
  const bottomTabItems = canAccessNucleus
    ? [
        { name: 'Dashboard', href: '/workspace', icon: 'LayoutDashboard' },
        { name: 'Nucleus', href: '/nucleus', icon: 'Zap' },
        { name: 'Pipeline', href: '/nucleus/pipeline', icon: 'TrendingUp' },
      ]
    : navItems.slice(0, 4);

  // Remaining items for the More sheet (non-admin only)
  const moreNavItems = canAccessNucleus ? [] : navItems.slice(4);

  const closeMoreSheet = useCallback(() => {
    setMoreSheetOpen(false);
  }, []);

  // Close more sheet on navigation
  useEffect(() => {
    setMoreSheetOpen(false);
  }, [pathname]);

  // Prevent body scroll when more sheet is open
  useEffect(() => {
    if (moreSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [moreSheetOpen]);

  // Get the page title from the current path
  const getPageTitle = () => {
    if (inNucleus) {
      const nucleusItem = nucleusModules.find(m => 
        m.href === pathname || (m.href !== '/nucleus' && pathname.startsWith(m.href))
      );
      return nucleusItem?.name || 'Nucleus';
    }
    const activeItem = navItems.find(item => isActive(item.href));
    return activeItem?.name || 'Workspace';
  };

  return (
    <>
      {/* Mobile Header — compact, 56px */}
      <header className="ws-mobile-header">
        <div className="ws-mobile-logo">
          <img src="/logo-icon.svg" alt="Trailblaize" />
        </div>
        <span className="ws-mobile-page-title">{getPageTitle()}</span>
        <button 
          className="ws-mobile-menu-btn"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className={`ws-sidebar ${collapsed ? 'collapsed' : ''}`}>
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
          {canAccessNucleus && (
            <Link
              href="/nucleus"
              className={`ws-nav-item ${pathname.startsWith('/nucleus') ? 'active' : ''}`}
            >
              <Zap size={20} />
              {!collapsed && <span>Nucleus Admin</span>}
            </Link>
          )}
          {inNucleus && canAccessNucleus && !collapsed && (
            <div className="ws-nav-nucleus-modules">
              {nucleusModules.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`ws-nav-item ws-nav-sub ${pathname === m.href || (m.href !== '/nucleus' && pathname.startsWith(m.href)) ? 'active' : ''}`}
                >
                  <m.icon size={18} />
                  <span>{m.name}</span>
                </Link>
              ))}
            </div>
          )}
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`ws-nav-item ${isActive(item.href) ? 'active' : ''} ${item.emphasized ? 'emphasized' : ''}`}
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

      {/* Bottom Tab Bar — Mobile only (visibility controlled via CSS) */}
      <nav className="ws-bottom-tabs" aria-label="Main navigation">
        {bottomTabItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const active = item.href === '/workspace'
            ? pathname === '/workspace'
            : item.href === '/nucleus'
              ? pathname === '/nucleus'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`ws-bottom-tab ${active ? 'active' : ''}`}
            >
              <span className="ws-bottom-tab-icon">
                <Icon size={22} />
              </span>
              <span className="ws-bottom-tab-label">{item.name}</span>
            </Link>
          );
        })}
        {!canAccessNucleus && (
          <button
            type="button"
            className={`ws-bottom-tab ${moreSheetOpen ? 'active' : ''}`}
            onClick={() => setMoreSheetOpen(!moreSheetOpen)}
            aria-label="More navigation"
          >
            <span className="ws-bottom-tab-icon">
              <MoreHorizontal size={22} />
            </span>
            <span className="ws-bottom-tab-label">More</span>
          </button>
        )}
      </nav>

      {/* More Sheet — Slide-up overlay (Mobile only) */}
      <div
        className={`ws-more-sheet-backdrop ${moreSheetOpen ? 'open' : ''}`}
        onClick={closeMoreSheet}
      />
      <div className={`ws-more-sheet ${moreSheetOpen ? 'open' : ''}`}>
        <div className="ws-more-sheet-handle" />
        <div className="ws-more-sheet-header">
          <span className="ws-more-sheet-title">Navigation</span>
          <button
            type="button"
            className="ws-more-sheet-close"
            onClick={closeMoreSheet}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="ws-more-sheet-content">
          {/* Remaining workspace nav items */}
          {moreNavItems.length > 0 && (
            <div className="ws-more-sheet-section">
              <div className="ws-more-sheet-section-label">Workspace</div>
              {moreNavItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`ws-more-sheet-item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={closeMoreSheet}
                  >
                    <span className="ws-more-sheet-item-icon">
                      <Icon size={18} />
                    </span>
                    <span>{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ws-nav-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Nucleus modules — only if user can access */}
          {canAccessNucleus && (
            <div className="ws-more-sheet-section">
              <div className="ws-more-sheet-section-label">Nucleus</div>
              {nucleusModules.map((m) => {
                const isModActive = pathname === m.href || (m.href !== '/nucleus' && pathname.startsWith(m.href));
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className={`ws-more-sheet-item ${isModActive ? 'active' : ''}`}
                    onClick={closeMoreSheet}
                  >
                    <span className="ws-more-sheet-item-icon">
                      <m.icon size={18} />
                    </span>
                    <span>{m.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="ws-more-sheet-divider" />

          {/* User info + sign out */}
          <div className="ws-more-sheet-user">
            <div className="ws-more-sheet-user-avatar">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="ws-more-sheet-user-info">
              <div className="ws-more-sheet-user-name">{profile?.name}</div>
              <div className="ws-more-sheet-user-email">{roleLabel}</div>
            </div>
            <button 
              className="ws-logout-btn"
              onClick={() => { signOut(); closeMoreSheet(); }}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
