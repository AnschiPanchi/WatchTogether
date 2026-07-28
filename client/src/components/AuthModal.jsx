import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, Sparkles, LogIn } from 'lucide-react';

export default function AuthModal({ onClose }) {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchTab = (t) => {
    setTab(t);
    resetFields();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

    if (tab === 'signup') {
      if (!username.trim()) { setError('Please enter a display name.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), username.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-header">
          <div className="auth-title-row">
            <div className="auth-icon-wrap">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="auth-title">
                {tab === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="auth-subtitle">
                {tab === 'login'
                  ? 'Sign in to auto-fill your name'
                  : 'Set up your WatchParty profile'}
              </p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'login'}
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            <LogIn size={14} /> Sign In
          </button>
          <button
            role="tab"
            aria-selected={tab === 'signup'}
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            <User size={14} /> Sign Up
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-username">
                <User size={12} /> Display Name
              </label>
              <div className="auth-input-wrap">
                <input
                  id="auth-username"
                  type="text"
                  className="auth-input"
                  placeholder="How should we call you?"
                  value={username}
                  maxLength={32}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              <Mail size={12} /> Email
            </label>
            <div className="auth-input-wrap">
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">
              <Lock size={12} /> Password
            </label>
            <div className="auth-input-wrap">
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
                value={password}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {tab === 'signup' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-confirm">
                <Lock size={12} /> Confirm Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="auth-confirm"
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading
              ? 'Please wait…'
              : tab === 'login'
                ? '🔓 Sign In'
                : '🚀 Create Account'}
          </button>
        </form>

        <p className="auth-footer-hint">
          {tab === 'login'
            ? "Don't have an account? Switch to Sign Up above."
            : 'Already have an account? Switch to Sign In above.'}
        </p>
      </div>
    </div>
  );
}
