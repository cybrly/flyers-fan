// SharePanel — a button that copies a shareable OG image URL to clipboard.
// The OG endpoint at /api/og renders server-side PNG cards for social
// sharing. This component generates the correct URL and provides
// copy-to-clipboard + preview feedback.

import React, { useState, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { cx } from '../config.js';
import { Chip } from './primitives.jsx';

/**
 * @param {object} props
 * @param {'game'|'standings'|'player'|'brand'} props.type
 * @param {string} [props.gameId]
 * @param {string} [props.playerId]
 * @param {string} [props.label] - button label
 */
export function ShareButton({ type = 'brand', gameId, playerId, label = 'Share' }) {
  const [copied, setCopied] = useState(false);

  const getUrl = useCallback(() => {
    const base = `${window.location.origin}/api/og`;
    const params = new URLSearchParams();
    if (type === 'game' && gameId) params.set('game', gameId);
    if (type === 'standings') params.set('panel', 'standings');
    if (type === 'player' && playerId) { params.set('panel', 'player'); params.set('player', playerId); }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }, [type, gameId, playerId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement('textarea');
      ta.value = getUrl();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cx(
        'inline-flex items-center gap-1.5 px-2.5 h-7 border rounded-md text-[11px] font-medium transition-colors',
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white hover:border-white/20',
      )}
      title={`Copy shareable ${type} image URL`}
    >
      <ExternalLink size={11} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

/**
 * ShareChip — inline chip variant for embedding in Section actions.
 */
export function ShareChip({ type, gameId, playerId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const base = `${window.location.origin}/api/og`;
    const params = new URLSearchParams();
    if (type === 'game' && gameId) params.set('game', gameId);
    if (type === 'standings') params.set('panel', 'standings');
    if (type === 'player' && playerId) { params.set('panel', 'player'); params.set('player', playerId); }
    const url = params.toString() ? `${base}?${params}` : base;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button type="button" onClick={handleCopy}>
      <Chip tone={copied ? 'green' : 'muted'}>
        {copied ? 'Copied!' : 'Share'}
      </Chip>
    </button>
  );
}
