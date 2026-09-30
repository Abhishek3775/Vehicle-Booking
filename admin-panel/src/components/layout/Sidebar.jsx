import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiUsers,
  FiTruck,
  FiCalendar,
  FiSend,
  FiTool,
  FiLayers,
  FiPackage,
  FiCreditCard,
  FiFileText,
  FiBell,
  FiActivity,
  FiUser,
  FiStar,
  FiHelpCircle,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { section: 'Overview' },
  { path: '/dashboard', label: 'Dashboard', icon: FiGrid },

  { section: 'Operations' },
  { path: '/bookings', label: 'Bookings', icon: FiCalendar },
  { path: '/dispatch', label: 'Dispatch', icon: FiSend },
  { path: '/mechanics', label: 'Mechanics', icon: FiTruck },
  { path: '/users', label: 'Users', icon: FiUsers },

  { section: 'Catalogue & Stock' },
  { path: '/services', label: 'Services', icon: FiTool },
  { path: '/service-packages', label: 'Packages', icon: FiLayers },
  { path: '/inventory', label: 'Inventory', icon: FiPackage },

  { section: 'Finance & Billing' },
  { path: '/payments', label: 'Payments', icon: FiCreditCard },
  { path: '/invoices', label: 'Invoices', icon: FiFileText },

  { section: 'System & Logs' },
  { path: '/notifications', label: 'Notifications', icon: FiBell },
  { path: '/audit-logs', label: 'Audit Logs', icon: FiActivity },
  { path: '/profile', label: 'Admin Profile', icon: FiUser },

  { section: 'Upcoming' },
  { path: '/reviews', label: 'Reviews', icon: FiStar, badge: 'Soon' },
  { path: '/support', label: 'Support', icon: FiHelpCircle, badge: 'Soon' },
];

export const Sidebar = ({ isCollapsed, isMobileOpen, onCloseMobile }) => {
  const { admin } = useAuth();

  return (
    <>
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Sidebar navigation"
      >
        <div className="sidebar-brand">
          <NavLink to="/dashboard" className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <FiTool />
            </div>
            {!isCollapsed && <span>AutoCare Admin</span>}
          </NavLink>

          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="btn-icon"
              style={{ color: '#ffffff' }}
              aria-label="Close sidebar"
            >
              <FiX size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, index) => {
            if (item.section) {
              if (isCollapsed) return null;
              return (
                <div key={`section-${index}`} className="sidebar-section-title">
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <div className="sidebar-nav-icon">
                  <Icon />
                </div>
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span className="sidebar-nav-badge">{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="sidebar-footer">
            <div className="sidebar-admin-card">
              <div className="sidebar-admin-avatar">
                {admin?.displayName ? admin.displayName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="sidebar-admin-info">
                <div className="sidebar-admin-name">{admin?.displayName || 'Administrator'}</div>
                <div className="sidebar-admin-role">{admin?.adminCode || 'ADMIN'}</div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
