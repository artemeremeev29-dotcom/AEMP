import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Settings {
  fadeInMs: number;
  fadeOutMs: number;
  crossfadeMs: number;
  accentColor: string;
  showSpectrum: boolean;
  showCoverArt: boolean;
  showStatusBar: boolean;
}

const DEFAULTS: Settings = {
  fadeInMs: 0,
  fadeOutMs: 0,
  crossfadeMs: 0,
  accentColor: '#ff8c00',
  showSpectrum: true,
  showCoverArt: true,
  showStatusBar: true,
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  openSettings: boolean;
  setOpenSettings: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem('aemp-settings');
      if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULTS;
  });
  const [openSettings, setOpenSettings] = useState(false);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('aemp-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  // Sync accent color to CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    const hex = settings.accentColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 255;
    const g = parseInt(hex.slice(2, 4), 16) || 140;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
  }, [settings.accentColor]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, openSettings, setOpenSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
