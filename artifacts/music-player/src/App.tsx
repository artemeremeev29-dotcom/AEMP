import React, { useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SpectrumAnalyzer } from './components/SpectrumAnalyzer';
import { Equalizer } from './components/Equalizer';
import { Playlist } from './components/Playlist';
import { TransportControls } from './components/TransportControls';
import { Settings } from './components/Settings';
import { AnimatePresence, motion } from 'framer-motion';
import { Repeat, Shuffle, Repeat1, Copy, Activity, Minus, Square, X } from 'lucide-react';

function formatTime(s: number) {
  if (isNaN(s) || !isFinite(s)) return '00:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function AppContent() {
  const [showEQ, setShowEQ] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<'default' | 'cyberpunk' | 'phonk' | 'retro-silver'>('default');
  
  const { audioState, audioActions, playlist, currentTrackId, isShuffle, repeatMode, actions, bookmarkResume } = usePlayer();
  const { settings, sleepSecondsLeft } = useSettings();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || audioState.duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    audioActions.seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audioState.duration);
  };

  const pct = audioState.duration > 0
    ? Math.min(100, Math.max(0, (audioState.currentTime / audioState.duration) * 100)) : 0;

  const hasCover  = settings.showCoverArt && !!currentTrack?.coverArt;
  const coverStyle = settings.coverStyle;

  return (
    <div
      data-skin={currentSkin}
      
      className="aemp-shell w-full flex flex-col shadow-[0_10px_60px_rgba(0,0,0,0.6)] overflow-hidden h-full relative"
      style={{ backgroundColor: 'var(--player-bg)' }}
    >
      {/* ── Status bar ─────────────────────────────────────────────────── */}
      {settings.showStatusBar && (
        <div className="aemp-status-bar h-[28px] shrink-0 flex justify-between items-center px-2 border-b text-[11px] font-mono select-none"
          style={{ backgroundColor: 'var(--darker)', borderColor: 'var(--border)', color: 'var(--text-sec)' }}>
          <div className="truncate pr-4">
            {sleepSecondsLeft !== null
              ? `💤 Стоп через ${Math.floor(sleepSecondsLeft/60)}:${String(sleepSecondsLeft%60).padStart(2,'0')}`
              : currentTrack
                ? `:: ${formatTime(audioState.currentTime)} :: ${currentTrack.artist} — ${currentTrack.name} ::`
                : ':: AEMP ::'}
          </div>
          <div className="aemp-window-controls flex gap-2 items-center shrink-0" style={{ color: 'var(--text-sec)' }}>
            <select 
              value={currentSkin} 
              onChange={(e) => setCurrentSkin(e.target.value as any)}
              className="bg-[var(--darkest)] text-[var(--text-main)] border border-[var(--border)] text-[9px] px-1 py-0.5 rounded cursor-pointer mr-2 outline-none font-sans"
            >
              <option value="default">Стандартный</option>
              <option value="cyberpunk">Киберпанк</option>
              <option value="phonk">Дрифт Фонк</option>
              <option value="retro-silver">Ретро Серебро</option>
            </select>

            <Minus size={12} className="cursor-pointer hover:text-white" />
            <Square size={10} className="cursor-pointer hover:text-white mt-[1px]" />
            <X size={12} className="cursor-pointer" style={{ color: 'inherit' }} />
          </div>

        </div>
      )}

      {/* ── Player body ────────────────────────────────────────────────── */}
      <div className="aemp-player-body h-[120px] shrink-0 flex flex-col relative" style={{ backgroundColor: 'var(--player-bg)' }}>

        {/* Blur background (cover style = blur) */}
        {hasCover && coverStyle === 'blur' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img src={currentTrack!.coverArt} className="w-full h-full object-cover" alt=""
              style={{ filter: 'blur(18px) brightness(0.35)', transform: 'scale(1.15)' }} />
          </div>
        )}

        <div className="flex flex-1 min-h-0 relative z-10">
          {/* Left: controls + cover */}
          <div className="aemp-cover-column w-[170px] flex flex-col border-r shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="h-[24px] border-b flex items-center justify-around px-2"
              style={{ backgroundColor: 'var(--player-bg)', borderColor: 'var(--border)' }}>
              <button onClick={actions.toggleShuffle} className="p-1 transition-colors"
                style={{ color: isShuffle ? 'var(--accent)' : 'var(--text-sec)' }} title="Случайный порядок"><Shuffle size={12}/></button>
              <button onClick={actions.toggleRepeat} className="p-1 transition-colors"
                style={{ color: repeatMode !== 'off' ? 'var(--accent)' : 'var(--text-sec)' }} title="Повтор">
                {repeatMode === 'one' ? <Repeat1 size={12}/> : <Repeat size={12}/>}
              </button>
              <button className="p-1 text-[10px] font-bold transition-colors" style={{ color: 'var(--text-sec)' }}>A-B</button>
              <button className="p-1 transition-colors" style={{ color: 'var(--text-sec)' }}><Activity size={12}/></button>
              <button className="p-1 transition-colors" style={{ color: 'var(--text-sec)' }}><Copy size={12}/></button>
            </div>

            {/* Cover art */}
            <div className="flex-1 m-2 flex items-center justify-center relative border overflow-hidden"
              style={{ borderColor: 'var(--darkest)', backgroundColor: 'var(--darker)' }}>
              {hasCover && coverStyle === 'vinyl' ? (
                <div className={`w-full h-full flex items-center justify-center`}>
                  <img src={currentTrack!.coverArt} alt="Обложка"
                    className={`w-[90%] h-[90%] object-cover rounded-full shadow-lg vinyl-spin ${audioState.isPlaying ? '' : 'paused'}`}
                    style={{ boxShadow: `0 0 0 4px #111, 0 0 0 6px #333, 0 0 12px rgba(0,0,0,0.8)` }}
                  />
                  {/* Vinyl center dot */}
                  <div className="absolute w-3 h-3 rounded-full bg-[#111] border-2" style={{ borderColor: 'var(--accent)' }} />
                </div>
              ) : hasCover ? (
                <img src={currentTrack!.coverArt} className="w-full h-full object-cover" alt="Обложка" />
              ) : (
                <div style={{ width: 0, height: 0,
                  borderLeft: '20px solid transparent', borderRight: '20px solid transparent',
                  borderBottom: `34px solid var(--accent)`, opacity: 0.7 }} />
              )}
            </div>
          </div>

          {/* Right: timer + spectrum */}
          <div className="aemp-display-column flex-1 flex flex-col min-w-0 py-2 pr-2 pl-1 gap-1">
            <div className="flex flex-col items-end shrink-0">
              <div className="text-3xl font-bold leading-none"
                style={{ color: 'var(--accent)', fontFamily: 'Consolas, monospace', fontVariantNumeric: 'tabular-nums',
                  textShadow: `0 0 8px rgba(var(--accent-rgb),0.5)` }}>
                {formatTime(audioState.currentTime)}
              </div>
              <div className="text-[10px] opacity-70 mt-0.5"
                style={{ color: 'var(--accent)', fontFamily: 'Consolas, monospace' }}>
                {formatTime(audioState.duration)}
              </div>
            </div>

            {settings.showSpectrum ? (
              <div className="border relative overflow-hidden" style={{ height: 48, borderColor: 'var(--border)' }}>
                <SpectrumAnalyzer />
              </div>
            ) : (
              <div className="border flex items-center justify-center" style={{ height: 48, borderColor: 'var(--border)', backgroundColor: 'var(--darkest)' }}>
                <span className="text-[9px]" style={{ color: 'var(--text-sec)' }}>SPECTRUM OFF</span>
              </div>
            )}
          </div>
        </div>

        {/* Seekbar */}
        <div className="h-[12px] flex items-center relative cursor-pointer border-t z-10"
          style={{ backgroundColor: 'var(--darkest)', borderColor: 'var(--border)' }}
          onClick={handleSeek} ref={progressBarRef}>
          <div className="h-[4px] absolute left-0 top-[4px] pointer-events-none"
            style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
          <div className="w-[12px] h-[12px] rounded-full absolute top-0 pointer-events-none"
            style={{ left: `clamp(0px, calc(${pct}% - 6px), calc(100% - 12px))`,
              backgroundColor: 'var(--accent)', boxShadow: `0 0 5px rgba(var(--accent-rgb),0.8)` }} />
        </div>
      </div>

      {/* ── Transport ──────────────────────────────────────────────────── */}
      <TransportControls onToggleEQ={() => setShowEQ(!showEQ)} isEQActive={showEQ} />

      {/* ── Playlist + overlays ────────────────────────────────────────── */}
      <div className="aemp-playlist-area flex-1 relative min-h-0">
        <Playlist />

        {/* EQ overlay */}
        <AnimatePresence initial={false}>
          {showEQ && (
            <motion.div
              initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.2 }}
              className="absolute inset-x-0 top-0 border-b z-20 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
              style={{ height: 140, borderColor: 'var(--border)', backgroundColor: 'var(--player-bg)' }}
            >
              <Equalizer />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bookmark resume banner */}
        <AnimatePresence>
          {bookmarkResume && (
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="absolute bottom-[30px] inset-x-0 mx-2 p-2 rounded border z-20 flex items-center justify-between"
              style={{ backgroundColor: 'var(--darker)', borderColor: 'var(--accent)' }}
            >
              <div>
                <p className="text-[11px]" style={{ color: 'var(--text-main)' }}>Продолжить с {formatTime(bookmarkResume.time)}?</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-sec)' }}>{bookmarkResume.track.name}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <button onClick={actions.confirmResume}
                  className="text-[10px] font-bold px-2 py-1 rounded"
                  style={{ backgroundColor: 'var(--accent)', color: '#1a1a1a' }}>ДА</button>
                <button onClick={actions.dismissResume}
                  className="text-[10px] px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}>НЕТ</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Settings panel covers the complete player, including the header. */}
      <Settings />
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
