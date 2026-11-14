import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getAvatarColor, getInitials } from '../utils/avatar';
import {
  MessageSquare,
  Sun,
  Moon,
  ArrowRight,
  Hash,
  CheckCheck,
  Send,
  AlertCircle
} from 'lucide-react';
import './AuthPage.css';

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};
    if (mode === 'register') {
      if (!username.trim()) {
        errors.username = 'Username is required';
      } else if (username.length < 3 || username.length > 30) {
        errors.username = 'Username must be between 3 and 30 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.username = 'Only letters, numbers, and underscores allowed';
      }

      if (!email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please provide a valid email address';
      }
    } else {
      if (!username.trim()) {
        errors.username = 'Username or email is required';
      }
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ usernameOrEmail: username, password });
      } else {
        await register({ username, email, password });
      }
      navigate('/chat');
    } catch (err) {
      if (err.response?.data?.validationErrors) {
        setFieldErrors(err.response.data.validationErrors);
      } else if (err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError('Unable to connect to PrepPulse server. Please ensure backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoUsername) => {
    setServerError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await login({ usernameOrEmail: demoUsername, password: 'Password@123' });
      navigate('/chat');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Column: Form */}
      <div className="auth-left">
        <div>
          <header className="auth-header">
            <div className="auth-brand">
              <MessageSquare className="brand-icon" />
              <span className="brand-name">PrepPulse</span>
            </div>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </header>

          <div className="auth-headline">
            <h1>{mode === 'login' ? 'Sign in to community' : 'Join PrepPulse'}</h1>
            <p>Placement preparation rooms for college students</p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setFieldErrors({});
                setServerError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setFieldErrors({});
                setServerError('');
              }}
            >
              Register
            </button>
          </div>

          {serverError && (
            <div className="error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{serverError}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                {mode === 'login' ? 'Username or Email' : 'Username'}
              </label>
              <input
                id="username"
                type="text"
                className={`form-input ${fieldErrors.username ? 'error' : ''}`}
                placeholder={mode === 'login' ? 'aarav_sharma or aarav@campus.edu' : 'aarav_sharma'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              {fieldErrors.username && (
                <span className="form-error">{fieldErrors.username}</span>
              )}
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Campus Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                  placeholder="aarav.sharma@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <span className="form-error">{fieldErrors.email}</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {fieldErrors.password && (
                <span className="form-error">{fieldErrors.password}</span>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              <span>{mode === 'login' ? 'Sign In' : 'Create Student Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Student Logins */}
          <div className="quick-accounts">
            <div className="quick-title">Quick Demo Logins (Seed Accounts)</div>
            <div className="quick-list">
              <button
                type="button"
                className="quick-btn"
                onClick={() => handleQuickLogin('aarav_sharma')}
                disabled={isSubmitting}
              >
                <div className="quick-btn-user">
                  <div
                    className="quick-avatar"
                    style={{ backgroundColor: getAvatarColor('aarav_sharma') }}
                  >
                    AS
                  </div>
                  <span className="quick-btn-name">Aarav Sharma</span>
                </div>
                <span className="quick-btn-role">DSA Room Admin</span>
              </button>

              <button
                type="button"
                className="quick-btn"
                onClick={() => handleQuickLogin('priya_patel')}
                disabled={isSubmitting}
              >
                <div className="quick-btn-user">
                  <div
                    className="quick-avatar"
                    style={{ backgroundColor: getAvatarColor('priya_patel') }}
                  >
                    PP
                  </div>
                  <span className="quick-btn-name">Priya Patel</span>
                </div>
                <span className="quick-btn-role">Java Room Admin</span>
              </button>

              <button
                type="button"
                className="quick-btn"
                onClick={() => handleQuickLogin('rohan_verma')}
                disabled={isSubmitting}
              >
                <div className="quick-btn-user">
                  <div
                    className="quick-avatar"
                    style={{ backgroundColor: getAvatarColor('rohan_verma') }}
                  >
                    RV
                  </div>
                  <span className="quick-btn-name">Rohan Verma</span>
                </div>
                <span className="quick-btn-role">Student Member</span>
              </button>
            </div>
          </div>
        </div>

        <footer className="auth-footer">
          PrepPulse Platform &middot; Phase 1 Skeleton &middot; Spring Boot 3 + React
        </footer>
      </div>

      {/* Right Column: Static HTML/CSS UI Preview */}
      <div className="auth-right">
        <div className="preview-container" aria-hidden="true">
          <div className="preview-sidebar">
            <div className="preview-sidebar-header">
              <span>Rooms & Topics</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>3 Active</span>
            </div>
            <div className="preview-room-list">
              <div className="preview-room-item active">
                <Hash size={15} />
                <span>dsa-leetcode-grind</span>
              </div>
              <div className="preview-room-item">
                <Hash size={15} />
                <span>java-core-spring</span>
              </div>
              <div className="preview-room-item">
                <Hash size={15} />
                <span>hr-behavioral-prep</span>
              </div>
            </div>
          </div>

          <div className="preview-chat">
            <div className="preview-chat-header">
              <div>
                <div className="preview-chat-title"># dsa-leetcode-grind</div>
                <div className="preview-chat-topic">Topic: Graph Traversals & Kahn's Algorithm</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--online-dot)' }}></span>
                <span>5 online</span>
              </div>
            </div>

            <div className="preview-chat-body">
              {/* Message 1 */}
              <div className="preview-msg">
                <div
                  className="preview-msg-avatar"
                  style={{ backgroundColor: getAvatarColor('priya_patel') }}
                >
                  PP
                </div>
                <div className="preview-msg-content">
                  <span className="preview-msg-author">Priya Patel</span>
                  <div className="preview-bubble">
                    Course Schedule is topological sort using Kahn's algorithm (BFS with in-degree array). Really common in Google & Amazon OA.
                  </div>
                  <div className="preview-meta">
                    <span>10:32 AM</span>
                    <CheckCheck size={13} color="var(--accent)" />
                  </div>
                </div>
              </div>

              {/* Message 2 */}
              <div className="preview-msg">
                <div
                  className="preview-msg-avatar"
                  style={{ backgroundColor: getAvatarColor('rohan_verma') }}
                >
                  RV
                </div>
                <div className="preview-msg-content">
                  <span className="preview-msg-author">Rohan Verma</span>
                  <div className="preview-bubble">
                    Make sure to handle cycle detection carefully when the graph is disconnected.
                  </div>
                  <div className="preview-meta">
                    <span>10:35 AM</span>
                    <CheckCheck size={13} color="var(--accent)" />
                  </div>
                </div>
              </div>

              {/* Message 3 (Own) */}
              <div className="preview-msg own">
                <div
                  className="preview-msg-avatar"
                  style={{ backgroundColor: getAvatarColor('aarav_sharma') }}
                >
                  AS
                </div>
                <div className="preview-msg-content">
                  <div className="preview-bubble">
                    Targeting 3 Graph problems today. Let's finish Clone Graph and Course Schedule before evening.
                  </div>
                  <div className="preview-meta">
                    <span>10:38 AM</span>
                    <CheckCheck size={13} color="#fff" />
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-composer">
              <div className="preview-input">
                Message #dsa-leetcode-grind...
              </div>
              <button
                type="button"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default'
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

