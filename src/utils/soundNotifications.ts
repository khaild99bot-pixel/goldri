/**
 * GOLDRIX Cash & Money Sound Notifications Utility & Hook
 * - Synthesizes a realistic Cash Register & Metallic Coins ("Cha-Ching") sound via Web Audio API
 * - Enabled by default; persists preference in localStorage ('goldrix_sound_notifications_enabled')
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'goldrix_sound_notifications_enabled';
const EVENT_NAME = 'goldrix:sound-notifications-change';

export function isSoundNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // Enabled by default
    return raw === 'true' || raw === '1';
  } catch {
    return true;
  }
}

export function setSoundNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));
  } catch {
    // ignore storage errors
  }
}

/**
 * Plays a crisp, realistic Cash / Metallic Coins ("Cha-Ching") sound using Web Audio API.
 * @param variant 'default' | 'success' | 'alert'
 * @param force Play even if user is testing the toggle
 */
export function playNotificationSound(
  variant: 'default' | 'success' | 'alert' = 'default',
  force = false
): void {
  if (typeof window === 'undefined') return;
  if (!force && !isSoundNotificationsEnabled()) return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Helper for metallic coin/bell strike with realistic harmonic overtones
    const playMetallicCoinBell = (
      startTime: number,
      baseFreq: number,
      duration: number,
      peakGain: number
    ) => {
      const ratios = [1, 2.0, 2.76, 4.07];
      const weights = [1, 0.55, 0.35, 0.2];

      ratios.forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseFreq * ratio, startTime);

        const partGain = peakGain * weights[i];
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(partGain, startTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + duration * (i === 0 ? 1 : 0.65)
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);
      });
    };

    // 1. "Cha" — Crisp mechanical cash drawer / coin drop transient
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3200, now);
    bandpass.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // 2. "Ching!" — Double metallic gold coin & cash register bell ring
    if (variant === 'alert') {
      playMetallicCoinBell(now + 0.03, 987.77, 0.22, 0.16); // B5
      playMetallicCoinBell(now + 0.12, 1318.51, 0.45, 0.2); // E6
    } else {
      // Classic Cash Register "Cha-Ching" + Coin Clink
      playMetallicCoinBell(now + 0.02, 1174.66, 0.14, 0.15); // D6 coin clink
      playMetallicCoinBell(now + 0.085, 1567.98, 0.2, 0.18); // G6 coin clink
      playMetallicCoinBell(now + 0.16, 2093.0, 0.62, 0.22); // C7 bright cash bell
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 950);
  } catch {
    // Ignore audio context autoplay restrictions if user hasn't interacted yet
  }
}

export function useSoundNotifications() {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() =>
    isSoundNotificationsEnabled()
  );

  useEffect(() => {
    const handleSync = () => {
      setSoundEnabledState(isSoundNotificationsEnabled());
    };
    window.addEventListener(EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const toggleSound = useCallback((nextValue?: boolean) => {
    const current = isSoundNotificationsEnabled();
    const target = typeof nextValue === 'boolean' ? nextValue : !current;
    setSoundNotificationsEnabled(target);
    setSoundEnabledState(target);
    if (target) {
      playNotificationSound('success', true);
    }
  }, []);

  return {
    soundEnabled,
    toggleSound,
    playNotificationSound,
  };
}
