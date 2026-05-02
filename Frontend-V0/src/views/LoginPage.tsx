'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import BullLogo from '../components/BullLogo';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  return (
      <div className="auth-split-layout" id="login-page">
      {/* Decorative Left Side */}
      <div className="auth-decorative-side">
        <div className="bg-grid"></div>

        {/* Device Mockups Container */}
        <div className="device-container">
          <div className="device-laptop">
            <div className="screen-header">
              <div className="mock-logo-text">Synthetic<span>Bull</span></div>
            </div>
            <div className="screen-body">
              <div className="screen-scroll-group">
                <div className="mock-metric-row">
                  <div className="mock-metric-col">
                    <span className="mock-label">Total Portfolio</span>
                    <span className="mock-val">$ 124,532.50</span>
                  </div>
                  <div className="mock-metric-col" style={{alignItems: 'flex-end'}}>
                    <span className="mock-label">Today's Return</span>
                    <span className="mock-val mock-green">+$1,240.00</span>
                  </div>
                </div>
                <div className="mock-metric-row">
                  <div className="mock-metric-col">
                    <span className="mock-label">AAPL</span>
                    <span className="mock-val">$150.25</span>
                  </div>
                  <div className="mock-metric-col" style={{alignItems: 'flex-end'}}>
                    <span className="mock-val mock-green">↑ 1.2%</span>
                  </div>
                </div>
                <div className="mock-chart-large">
                  <div style={{height: '30%'}}></div>
                  <div style={{height: '50%'}}></div>
                  <div style={{height: '40%'}}></div>
                  <div style={{height: '70%'}}></div>
                  <div style={{height: '60%'}}></div>
                  <div style={{height: '90%'}}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="device-mobile">
            <div className="screen-header" style={{justifyContent: 'center'}}>
              <div className="mock-logo-text">Synthetic<span>Bull</span></div>
            </div>
            <div className="screen-body">
              <div className="mobile-scroll-group">
                <div className="mock-metric-col" style={{marginBottom: '16px'}}>
                  <span className="mock-label">Portfolio Match</span>
                  <span className="mock-val mock-green">+15.2% YTD</span>
                </div>
                <div className="mock-metric-row">
                  <div className="mock-metric-col">
                    <span className="mock-label">TSLA</span>
                    <span className="mock-val">$215.10</span>
                  </div>
                </div>
                <div className="mock-chart-large" style={{height: '60px'}}>
                  <div className="bg-buy" style={{height: '40%'}}></div>
                  <div className="bg-buy" style={{height: '80%'}}></div>
                  <div className="bg-buy" style={{height: '60%'}}></div>
                  <div className="bg-buy" style={{height: '100%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="floating-elements">
          <div className="float-card card-1">
            <div className="card-header-mini">
              <span className="mock-text-sm">Portfolio Value</span>
              <div className="mock-logo">
                <div className="mock-bar"></div><div className="mock-bar"></div><div className="mock-bar"></div>
              </div>
            </div>
            <div className="mock-value">$ 124,532.50</div>
            <div className="mock-change">↑ +$1,240 (1.01%)</div>
          </div>
          
          <div className="float-card card-2">
            <div className="card-header-mini">
              <span className="mock-text-sm">NVDA</span>
              <span className="mock-text-sm" style={{color: 'var(--color-buy)'}}>BUY</span>
            </div>
            <div className="mock-value">$ 135.80</div>
            <div className="mock-chart">
              <div className="mock-chart-bar" style={{height: '30%'}}></div>
              <div className="mock-chart-bar" style={{height: '50%'}}></div>
              <div className="mock-chart-bar" style={{height: '40%'}}></div>
              <div className="mock-chart-bar" style={{height: '70%'}}></div>
              <div className="mock-chart-bar" style={{height: '60%'}}></div>
              <div className="mock-chart-bar" style={{height: '90%'}}></div>
              <div className="mock-chart-bar" style={{height: '100%', background: 'var(--accent)'}}></div>
            </div>
          </div>

          <div className="float-card card-3">
             <div className="card-header-mini">
              <span className="mock-text-sm">AAPL</span>
              <span className="mock-text-sm" style={{color: 'var(--color-buy)'}}>BUY</span>
            </div>
            <div className="mock-value">$ 150.25</div>
          </div>
        </div>
      </div>

      {/* Credentials Right Side */}
      <div className="auth-credentials-side">
        <div className="auth-form-container animate-fade-in">
          <div className="auth-logo">
            <BullLogo size={48} className="auth-logo-icon" />
            <h1 className="auth-logo-text">
              Synthetic<span className="logo-accent">Bull</span>
            </h1>
            <p className="auth-logo-sub">Trading Terminal</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to your trading account</p>

            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              id="btn-login"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="auth-footer">
              Don&apos;t have an account? <Link href="/register">Create account</Link>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}
