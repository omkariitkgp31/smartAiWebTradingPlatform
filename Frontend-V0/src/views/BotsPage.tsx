'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, Brain, Pencil } from 'lucide-react';
import * as api from '../services/api';
import './BotsPage.css';

export default function BotsPage() {
  const [bots, setBots] = useState([]);
  const [editingBot, setEditingBot] = useState(null);
  const [editConfig, setEditConfig] = useState('');

  useEffect(() => {
    api.getBots().then(setBots).catch(() => { });
    const interval = setInterval(() => api.getBots().then(setBots).catch(() => { }), 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleBot = async (bot) => {
    if (bot.is_active) {
      await api.stopBot(bot.id);
    } else {
      await api.startBot(bot.id);
    }
    setBots(prev => prev.map(b =>
      b.id === bot.id ? { ...b, is_active: !b.is_active } : b
    ));
  };

  const startEditConfig = (bot) => {
    setEditingBot(bot.id);
    try {
      setEditConfig(JSON.stringify(JSON.parse(bot.config), null, 2));
    } catch {
      setEditConfig(bot.config);
    }
  };

  const saveConfig = async (botId) => {
    try {
      const parsed = JSON.parse(editConfig);
      await api.updateBotConfig(botId, parsed);
      setBots(prev => prev.map(b =>
        b.id === botId ? { ...b, config: JSON.stringify(parsed) } : b
      ));
      setEditingBot(null);
    } catch {
      alert('Invalid JSON configuration');
    }
  };

  const parseConfig = (configStr) => {
    try {
      return JSON.parse(configStr);
    } catch {
      return {};
    }
  };

  return (
    <div className="bots-page animate-fade-in" id="bots-page">
      <div className="page-header">
        <h1>Trading Bots</h1>
        <p>Monitor and control automated trading strategies</p>
      </div>

      <div className="bots-grid">
        {bots.map(bot => {
          const config = parseConfig(bot.config);
          return (
            <div className={`bot-card card ${bot.is_active ? 'bot-active' : ''}`} key={bot.id} id={`bot-${bot.id.slice(0, 8)}`}>
              <div className="bot-card-header">
                <div className="bot-info">
                  <div className="bot-type-icon">
                    {bot.bot_type === 'market_maker' ? <Landmark size={24} /> : <Brain size={24} />}
                  </div>
                  <div>
                    <h3 className="bot-name">{bot.name}</h3>
                    <span className="badge badge-accent">
                      {bot.bot_type === 'market_maker' ? 'Market Maker' : 'Alpha Bot'}
                    </span>
                  </div>
                </div>
                <div className="bot-status-toggle">
                  <button
                    className={`toggle-switch ${bot.is_active ? 'active' : ''}`}
                    onClick={() => toggleBot(bot)}
                    id={`toggle-bot-${bot.id.slice(0, 8)}`}
                  >
                    <span className="toggle-knob"></span>
                  </button>
                  <span className={`bot-status-text ${bot.is_active ? 'active' : ''}`}>
                    {bot.is_active ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              <div className="bot-status-bar">
                <span className={`status-dot ${bot.is_active ? 'active' : 'inactive'}`}></span>
                <span className="bot-status-label">
                  {bot.is_active ? 'Actively trading' : 'Inactive'}
                </span>
              </div>

              <div className="bot-config">
                <div className="bot-config-header">
                  <h4>Configuration</h4>
                  {editingBot !== bot.id ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => startEditConfig(bot)}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  ) : (
                    <div className="config-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => saveConfig(bot.id)}>Save</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditingBot(null)}>Cancel</button>
                    </div>
                  )}
                </div>

                {editingBot === bot.id ? (
                  <textarea
                    className="config-editor mono"
                    value={editConfig}
                    onChange={e => setEditConfig(e.target.value)}
                    rows={6}
                  />
                ) : (
                  <div className="config-grid">
                    {Object.entries(config).map(([key, value]) => (
                      <div className="config-item" key={key}>
                        <span className="config-key">{key.replace(/_/g, ' ')}</span>
                        <span className="config-value mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
