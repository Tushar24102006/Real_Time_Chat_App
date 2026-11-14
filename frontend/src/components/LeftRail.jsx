import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getAvatarColor, getInitials } from '../utils/avatar';
import {
  MessageSquare,
  Users,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';

export default function LeftRail({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const avatarColor = getAvatarColor(user?.username);
  const avatarInitials = getInitials(user?.username);

  return (
    <nav className="left-rail" aria-label="Main Navigation">
      <div className="rail-top">
        <div className="rail-logo" title="PrepPulse Campus Community">
          <MessageSquare size={22} />
        </div>

        <button
          type="button"
          className={`rail-nav-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => onTabChange('all')}
          title="All Conversations"
          aria-label="All Conversations"
        >
          <MessageSquare size={19} />
        </button>

        <button
          type="button"
          className={`rail-nav-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => onTabChange('groups')}
          title="Placement Groups"
          aria-label="Placement Groups"
        >
          <Users size={19} />
        </button>
      </div>

      <div className="rail-bottom">
        <button
          type="button"
          className="rail-nav-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          className="rail-nav-btn"
          onClick={logout}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>

        <div
          className="rail-avatar"
          style={{ backgroundColor: avatarColor }}
          title={`Signed in as @${user?.username}`}
        >
          {avatarInitials}
          <span className="rail-online-dot"></span>
        </div>
      </div>
    </nav>
  );
}

