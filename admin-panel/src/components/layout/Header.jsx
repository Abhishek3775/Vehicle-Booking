import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiMenu,
  FiSearch,
  FiBell,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiCalendar,
  FiTruck,
  FiFileText,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin.api';
import { notificationsApi } from '../../services/notifications.api';

export const Header = ({ isCollapsed, onToggleCollapse, onOpenMobile }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // User Menu State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Unread Notifications Count
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (res.success && res.data) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // Silently capture notification count errors
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounced Global Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await adminApi.globalSearch(searchQuery.trim());
        if (res.success && res.data) {
          setSearchResults(res.data);
          setIsSearchOpen(true);
        }
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click Outside Handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (path) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <header className={`header ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="header-left">
        <button
          onClick={onToggleCollapse}
          className="btn-icon"
          title="Toggle Sidebar"
          style={{ display: 'none', lgDisplay: 'flex' }}
        >
          <FiMenu size={18} />
        </button>

        <button
          onClick={onOpenMobile}
          className="btn-icon"
          title="Open Menu"
          aria-label="Open menu"
        >
          <FiMenu size={20} />
        </button>

        {/* Global Search Input */}
        <div className="header-search" ref={searchRef}>
          <FiSearch className="header-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search users, bookings, mechanics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
            aria-label="Global search"
          />

          {isSearchOpen && searchResults && (
            <div className="header-search-dropdown">
              {isSearching ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Searching...
                </div>
              ) : (
                <>
                  {/* Users */}
                  {searchResults.users?.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div className="sidebar-section-title" style={{ padding: '0.25rem 0.5rem' }}>
                        Users
                      </div>
                      {searchResults.users.map((u) => (
                        <div
                          key={u.id || u.userId}
                          className="header-dropdown-item"
                          onClick={() => handleSelectResult(`/users/${u.userId || u.id}`)}
                        >
                          <FiUser size={14} style={{ color: 'var(--primary)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bookings */}
                  {searchResults.bookings?.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div className="sidebar-section-title" style={{ padding: '0.25rem 0.5rem' }}>
                        Bookings
                      </div>
                      {searchResults.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="header-dropdown-item"
                          onClick={() => handleSelectResult(`/bookings/${b.id}`)}
                        >
                          <FiCalendar size={14} style={{ color: 'var(--info)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{b.bookingReference}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: {b.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mechanics */}
                  {searchResults.mechanics?.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div className="sidebar-section-title" style={{ padding: '0.25rem 0.5rem' }}>
                        Mechanics
                      </div>
                      {searchResults.mechanics.map((m) => (
                        <div
                          key={m.id}
                          className="header-dropdown-item"
                          onClick={() => handleSelectResult(`/mechanics/${m.id}`)}
                        >
                          <FiTruck size={14} style={{ color: 'var(--success)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.mechanicCode}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices?.length > 0 && (
                    <div>
                      <div className="sidebar-section-title" style={{ padding: '0.25rem 0.5rem' }}>
                        Invoices
                      </div>
                      {searchResults.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="header-dropdown-item"
                          onClick={() => handleSelectResult(`/invoices/${inv.id}`)}
                        >
                          <FiFileText size={14} style={{ color: 'var(--warning)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{inv.invoiceNumber}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{inv.totalAmount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!searchResults.users?.length &&
                    !searchResults.bookings?.length &&
                    !searchResults.mechanics?.length &&
                    !searchResults.invoices?.length) && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matching records found.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="header-icon-btn"
          title="Notifications"
          aria-label="View notifications"
        >
          <FiBell size={18} />
          {unreadCount > 0 && (
            <span className="header-notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Admin User Menu */}
        <div className="header-user-menu" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="header-user-btn"
            aria-expanded={isUserMenuOpen}
            aria-label="Admin account menu"
          >
            <div className="sidebar-admin-avatar" style={{ width: '30px', height: '30px', fontSize: '0.85rem' }}>
              {admin?.displayName ? admin.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              {admin?.displayName || 'Administrator'}
            </span>
            <FiChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {isUserMenuOpen && (
            <div className="header-dropdown">
              <div style={{ padding: '0.5rem 0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{admin?.displayName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{admin?.adminCode || 'ADMIN'}</div>
              </div>

              <div className="header-dropdown-divider" />

              <Link
                to="/profile"
                className="header-dropdown-item"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <FiUser size={16} /> Admin Profile
              </Link>

              <div className="header-dropdown-divider" />

              <button
                onClick={logout}
                className="header-dropdown-item"
                style={{ color: 'var(--danger)' }}
              >
                <FiLogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
