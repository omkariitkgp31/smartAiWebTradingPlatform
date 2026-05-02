'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Wallet, ClipboardList, Bot, Settings, LogOut, List } from 'lucide-react';
import BullLogo from './BullLogo';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/portfolio', label: 'Portfolio', icon: Wallet },
  { path: '/orders', label: 'Orders', icon: ClipboardList },
  { path: '/bots', label: 'Bots', icon: Bot },
  { path: '/watchlist', label: 'Watchlist', icon: List },
  { path: '/admin', label: 'Admin', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <BullLogo size={24} className="logo-icon" />
          <span className="logo-text">Synthetic<span className="logo-accent">Bull</span></span>
        </div>
        <div className="sidebar-tagline">Stock Trading Terminal</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <Icon size={18} className="sidebar-link-icon" />
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'T'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{user?.username || 'Trader'}</div>
            <div className="sidebar-user-email">{user?.email || 'trader@syntheticbull.com'}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} id="btn-logout">
          <LogOut size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Logout
        </button>
      </div>
    </aside>
  );
}
