import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type CoverStyle     = 'square' | 'vinyl' | 'blur';
export type VisualizerStyle = 'bars' | 'circle' | 'wave';
export type ThemeMode       = 'dark' | 'light' | 'auto';

export interface CustomSkin {
  enabled: boolean;
  name: string;
  backgroundColor: string;
  panelColor: string;
  accentColor: string;
  textColor: string;
  textureDataUrl: string;
  textureOpacity: number;
  logoX: number;
  logoY: number;
  logoScale: number;
  titleX: number;
  titleY: number;
}

export interface Settings {
  fadeInMs: number;
  fadeOutMs: number;
  crossfadeMs: number;
  accentColor: string;
  showSpectrum: boolean;
  showCoverArt: boolean;
  showStatusBar: boolean;
  coverStyle: CoverStyle;
  visualizerStyle: VisualizerStyle;
  theme: ThemeMode;
  customSkin: CustomSkin;
}

const DEFAULTS: Settings = {
  fadeInMs: 0,
  fadeOutMs: 0,
  crossfadeMs: 0,
  accentColor: '#ff8c00',
  showSpectrum: true,
  showCoverArt: true,
  showStatusBar: true,
  coverStyle: 'square',
  visualizerStyle: 'bars',
  theme: 'dark',
  customSkin: {
    enabled: false,
    name: 'Мой AEMP',
    backgroundColor: '#1a1a1a',
    panelColor: '#2a2a2a',
    accentColor: '#ff8c00',
    textColor: '#cccccc',
    textureDataUrl: '',
    textureOpacity: 0.22,
    logoX: 50,
    logoY: 42,
    logoScale: 1,
    titleX: 50,
    titleY: 12,
  },
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  openSettings: boolean;
  setOpenSettings: (v: boolean) => void;
  // Sleep timer (runtime, not persisted)
  sleepTimerEnd: number | null;
  setSleepTimer: (minutes: number | null) => void;
  sleepSecondsLeft: number | null;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem('aemp-settings');
      if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULTS;
  });
  const [openSettings, setOpenSettings] = useState(false);
  const [sleepTimerEnd, setSleepTimerEndState] = useState<number | null>(null);
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('aemp-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  // Accent color → CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    const hex = settings.accentColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 255;
    const g = parseInt(hex.slice(2, 4), 16) || 140;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
  }, [settings.accentColor]);

  // Theme → data-theme attribute
  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(settings.theme);
      document.documentElement.setAttribute('data-theme', resolved);
    };
    apply();
    if (settings.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [settings.theme]);

  // Sleep timer countdown
  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerEndState(null);
      setSleepSecondsLeft(null);
    } else {
      setSleepTimerEndState(Date.now() + minutes * 60 * 1000);
    }
  }, []);

  useEffect(() => {
    if (!sleepTimerEnd) { setSleepSecondsLeft(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 1000));
      setSleepSecondsLeft(left);
      if (left === 0) setSleepTimerEndState(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepTimerEnd]);

  return (
    <SettingsContext.Provider value={{
      settings, updateSettings,
      openSettings, setOpenSettings,
      sleepTimerEnd, setSleepTimer, sleepSecondsLeft,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
