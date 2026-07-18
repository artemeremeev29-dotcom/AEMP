import React, { useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { SettingsProvider } from './context/SettingsContext';
import { useSettings } from './context/SettingsContext';
import { SpectrumAnalyzer } from './components/SpectrumAnalyzer';
import { Equalizer } from './components/Equalizer';
import { Playlist } from './components/Playlist';
import { TransportControls } from './components/TransportControls';
import { Settings } from './components/Settings';
import { AnimatePresence, motion } from 'framer-motion';
import { Repeat, Shuffle, Repeat1, Copy, Activity, Minus, Square, X } from 'lucide-react';

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function AppContent() {
  const [showEQ, setShowEQ] = useState(false);
  const { audioState, audioActions, playlist, currentTrackId, isShuffle, repeatMode, actions } = usePlayer();
  const { settings } = useSettings();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || audioState.duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioActions.seek(percent * audioState.duration);
  };

  const pct = audioState.duration > 0
    ? Math.min(100, Math.max(0, (audioState.currentTime / audioState.duration) * 100))
    : 0;

  return (
    <div className="w-full max-w-[520px] flex flex-col shadow-[0_10px_60px_rgba(0,0,0,0.8)] bg-[#2a2a2a] overflow-hidden h-[90vh] max-h-[800px] relative">

      {/* BLOCK 1: Status Bar */}
      {settings.showStatusBar && (
        <div className="h-[28px] shrink-0 bg-[#1e1e1e] flex justify-between items-center px-2 border-b border-[#3a3a3a] text-[#999] text-[11px] font-mono select-none">
          <div className="truncate pr-4">
            {currentTrack
              ? `:: ${formatTime(audioState.currentTime)} :: ${currentTrack.artist} — ${currentTrack.name} ::`
              : ':: AEMP ::'}
          </div>
          <div className="flex gap-2 text-[#888] shrink-0">
            <Minus size={12} className="cursor-pointer hover:text-white" />
            <Square size={10} className="cursor-pointer hover:text-white mt-[1px]" />
            <X size={12} className="cursor-pointer hover:text-[--accent]" style={{ '--accent': 'var(--accent)' } as React.CSSProperties} />
          </div>
        </div>
      )}

      {/* BLOCK 2: Player Body */}
      <div className="h-[120px] shrink-0 bg-[#2a2a2a] flex flex-col relative">
        <div className="flex flex-1 min-h-0">

          {/* Left: Cover Art */}
          <div className="w-[170px] flex flex-col border-r border-[#3a3a3a] shrink-0">
            {/* Mini control row */}
            <div className="h-[24px] bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center justify-around px-2">
              <button
                onClick={actions.toggleShuffle}
                className="p-1 transition-colors"
                style={{ color: isShuffle ? 'var(--accent)' : '#888' }}
                title="Случайный порядок"
              ><Shuffle size={12} /></button>
              <button
                onClick={actions.toggleRepeat}
                className="p-1 transition-colors"
                style={{ color: repeatMode !== 'off' ? 'var(--accent)' : '#888' }}
                title="Повтор"
              >{repeatMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}</button>
              <button className="p-1 text-[#888] hover:text-[#ccc] text-[10px] font-bold" title="Повтор A-B">A-B</button>
              <button className="p-1 text-[#888] hover:text-[#ccc]" title="Эффекты"><Activity size={12} /></button>
              <button className="p-1 text-[#888] hover:text-[#ccc]" title="Копировать"><Copy size={12} /></button>
            </div>

            {/* Cover image or placeholder */}
            <div className="flex-1 bg-[#1e1e1e] m-2 flex items-center justify-center relative border border-[#141414] shadow-inner overflow-hidden">
              {settings.showCoverArt && currentTrack?.coverArt ? (
                <img
                  src={currentTrack.coverArt}
                  className="w-full h-full object-cover"
                  alt="Обложка"
                />
              ) : (
                <div
                  style={{
                    width: 0, height: 0,
                    borderLeft: '20px solid transparent',
                    borderRight: '20px solid transparent',
                    borderBottom: `34px solid var(--accent)`,
                    opacity: 0.7,
                  }}
                />
              )}
            </div>
          </div>

          {/* Right: Timer + Spectrum */}
          <div className="flex-1 flex flex-col min-w-0 py-2 pr-2 pl-1 gap-1">
            {/* Timer */}
            <div className="flex flex-col items-end shrink-0">
              <div
                className="text-3xl font-bold leading-none"
                style={{
                  color: 'var(--accent)',
                  fontFamily: 'Consolas, monospace',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: `0 0 8px rgba(var(--accent-rgb),0.5)`,
                }}
              >
                {formatTime(audioState.currentTime)}
              </div>
              <div
                className="text-[10px] opacity-70 mt-0.5"
                style={{ color: 'var(--accent)', fontFamily: 'Consolas, monospace', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatTime(audioState.duration)}
              </div>
            </div>

            {/* Spectrum */}
            {settings.showSpectrum ? (
              <div className="bg-[#141414] border border-[#3a3a3a] relative overflow-hidden" style={{ height: 48 }}>
                <SpectrumAnalyzer />
              </div>
            ) : (
              <div className="bg-[#141414] border border-[#3a3a3a] flex items-center justify-center" style={{ height: 48 }}>
                <span className="text-[9px] text-[#444]">SPECTRUM OFF</span>
              </div>
            )}
          </div>
        </div>

        {/* Seekbar */}
        <div
          className="h-[12px] bg-[#141414] flex items-center relative cursor-pointer border-t border-[#3a3a3a]"
          onClick={handleSeek}
          ref={progressBarRef}
        >
          <div
            className="h-[4px] absolute left-0 top-[4px] pointer-events-none"
            style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
          />
          <div
            className="w-[12px] h-[12px] rounded-full absolute top-0 pointer-events-none"
            style={{
              left: `clamp(0px, calc(${pct}% - 6px), calc(100% - 12px))`,
              backgroundColor: 'var(--accent)',
              boxShadow: `0 0 5px rgba(var(--accent-rgb),0.8)`,
            }}
          />
        </div>
      </div>

      {/* BLOCK 3: Transport */}
      <TransportControls onToggleEQ={() => setShowEQ(!showEQ)} isEQActive={showEQ} />

      {/* BLOCK 4: Playlist + overlays */}
      <div className="flex-1 relative min-h-0">
        <Playlist />

        {/* EQ overlay */}
        <AnimatePresence initial={false}>
          {showEQ && (
            <motion.div
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="absolute inset-x-0 top-0 bg-[#2a2a2a] border-b border-[#3a3a3a] z-20 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
              style={{ height: 140 }}
            >
              <Equalizer />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings overlay */}
        <Settings />
      </div>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </SettingsProvider>
  );
}

export default App;
