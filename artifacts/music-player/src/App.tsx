import React, { useEffect, useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SpectrumAnalyzer } from './components/SpectrumAnalyzer';
import { Playlist } from './components/Playlist';
import { TransportControls } from './components/TransportControls';
import { Settings } from './components/Settings';
import { AnimatePresence, motion } from 'framer-motion';
import { Repeat, Shuffle, Repeat1, Copy, Activity, Minus, Square, X, ImagePlus, Trash2 } from 'lucide-react';

function formatTime(s: number) {
  if (isNaN(s) || !isFinite(s)) return '00:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function colorToRgb(hex: string) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ].join(', ');
}

function AppContent() {
  const [currentSkin, setCurrentSkin] = useState<'default' | 'cyberpunk' | 'phonk' | 'retro-silver'>('default');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [abStart, setAbStart] = useState<number | null>(null);
  const [abEnd, setAbEnd] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const { audioState, audioActions, playlist, currentTrackId, isShuffle, repeatMode, actions, bookmarkResume } = usePlayer();
  const { settings, sleepSecondsLeft, updateSettings } = useSettings();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId);
  const activeSkin = settings.customSkin.enabled ? 'custom' : currentSkin;
  const customSkinVars = settings.customSkin.enabled ? {
    '--custom-bg': settings.customSkin.backgroundColor,
    '--custom-panel': settings.customSkin.panelColor,
    '--custom-accent': settings.customSkin.accentColor,
    '--custom-text': settings.customSkin.textColor,
    '--accent': settings.customSkin.accentColor,
    '--accent-rgb': colorToRgb(settings.customSkin.accentColor),
  } as React.CSSProperties : undefined;

  useEffect(() => {
    if (abStart === null || abEnd === null || abEnd <= abStart) return;
    if (audioState.currentTime >= abEnd) audioActions.seek(abStart);
  }, [audioState.currentTime, abStart, abEnd, audioActions]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleAB = () => {
    if (audioState.duration <= 0) {
      setToast('Сначала запусти трек');
    } else if (abStart === null) {
      setAbStart(audioState.currentTime);
      setToast('Точка A установлена');
    } else if (abEnd === null && audioState.currentTime > abStart) {
      setAbEnd(audioState.currentTime);
      setToast('Повтор A–B включён');
    } else {
      setAbStart(null);
      setAbEnd(null);
      setToast('Повтор A–B выключен');
    }
  };

  const copyTrackInfo = async () => {
    if (!currentTrack) {
      setToast('Нет активного трека');
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `${currentTrack.artist} — ${currentTrack.name}\n${formatTime(currentTrack.duration)}`
      );
      setToast('Информация скопирована');
    } catch (_) {
      setToast('Копирование недоступно');
    }
  };

  const chooseCover = () => {
    if (!currentTrack) {
      setToast('Сначала выберите трек');
      return;
    }
    coverInputRef.current?.click();
  };

  const onCoverSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentTrackId) return;
    if (!file.type.startsWith('image/')) {
      setToast('Выберите файл изображения');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        actions.setTrackCover(currentTrackId, reader.result);
        setToast('Обложка установлена');
      }
    };
    reader.onerror = () => setToast('Не удалось открыть изображение');
    reader.readAsDataURL(file);
  };

  const resetCover = () => {
    if (!currentTrackId || !currentTrack?.coverArt) return;
    actions.setTrackCover(currentTrackId, undefined);
    setToast('Обложка сброшена');
  };

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
      data-skin={activeSkin}
      
      className="aemp-shell w-full flex flex-col shadow-[0_10px_60px_rgba(0,0,0,0.6)] overflow-hidden h-full relative"
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      style={{ backgroundColor: 'var(--player-bg)', ...customSkinVars }}
    >
      {settings.customSkin.enabled && (
        <div className="aemp-custom-skin-layer" aria-hidden="true">
          {settings.customSkin.textureDataUrl && (
            <div className="aemp-custom-skin-texture" style={{
              backgroundImage: `url(${settings.customSkin.textureDataUrl})`,
              opacity: settings.customSkin.textureOpacity,
            }} />
          )}
          <div className="aemp-custom-skin-logo" style={{
            left: `${settings.customSkin.logoX}%`,
            top: `${settings.customSkin.logoY}%`,
            transform: `translate(-50%, -50%) scale(${settings.customSkin.logoScale})`,
            color: settings.customSkin.textColor,
          }}>AE</div>
          <div className="aemp-custom-skin-title" style={{
            left: `${settings.customSkin.titleX}%`,
            top: `${settings.customSkin.titleY}%`,
            color: settings.customSkin.textColor,
          }}>AEMP</div>
        </div>
      )}
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
              value={activeSkin}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'custom') {
                  updateSettings({ customSkin: { ...settings.customSkin, enabled: true } });
                } else {
                  setCurrentSkin(value as typeof currentSkin);
                  updateSettings({ customSkin: { ...settings.customSkin, enabled: false } });
                }
              }}
              className="bg-[var(--darkest)] text-[var(--text-main)] border border-[var(--border)] text-[9px] px-1 py-0.5 rounded cursor-pointer mr-2 outline-none font-sans"
            >
              <option value="default">Стандартный</option>
              <option value="cyberpunk">Киберпанк</option>
              <option value="phonk">Дрифт Фонк</option>
              <option value="retro-silver">Ретро Серебро</option>
              <option value="custom">Мой скин</option>
            </select>

            <button
              onClick={() => setIsFullscreen(value => !value)}
              className="hover:text-white"
              title={isFullscreen ? 'Восстановить размер' : 'Развернуть'}
            ><Minus size={12} /></button>
            <button
              onClick={() => setIsFullscreen(value => !value)}
              className="hover:text-white mt-[1px]"
              title={isFullscreen ? 'Восстановить размер' : 'Развернуть'}
            ><Square size={10} /></button>
            <button
              onClick={() => { audioActions.stop(); setToast('Воспроизведение остановлено'); }}
              className="hover:text-[var(--accent)]"
              title="Остановить воспроизведение"
            ><X size={12} /></button>
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
              <button
                onClick={handleAB}
                className="p-1 text-[10px] font-bold transition-colors"
                style={{ color: abStart !== null ? 'var(--accent)' : 'var(--text-sec)' }}
                title={abEnd !== null ? 'Сбросить повтор A–B' : abStart !== null ? 'Установить точку B' : 'Установить точку A'}
              >A-B</button>
              <button
                onClick={() => updateSettings({ showSpectrum: !settings.showSpectrum })}
                className="p-1 transition-colors"
                style={{ color: settings.showSpectrum ? 'var(--accent)' : 'var(--text-sec)' }}
                title={settings.showSpectrum ? 'Скрыть спектр' : 'Показать спектр'}
              ><Activity size={12}/></button>
              <button
                onClick={copyTrackInfo}
                className="p-1 transition-colors"
                style={{ color: 'var(--text-sec)' }}
                title="Скопировать информацию о треке"
              ><Copy size={12}/></button>
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
                <div className="flex flex-col items-center gap-2">
                  <div className="aemp-ae-logo-placeholder">AE</div>
                  <span className="text-[9px]" style={{ color: 'var(--text-sec)' }}>НЕТ ОБЛОЖКИ</span>
                </div>
              )}
              <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                <button
                  onClick={chooseCover}
                  disabled={!currentTrack}
                  className="flex items-center gap-1 px-1.5 py-1 text-[9px] rounded-sm border backdrop-blur-sm transition-colors disabled:opacity-40"
                  style={{ color: 'var(--text-main)', borderColor: 'var(--border)', backgroundColor: 'rgba(0,0,0,0.55)' }}
                  title="Выбрать обложку"
                >
                  <ImagePlus size={11} /> Обложка
                </button>
                {currentTrack?.coverArt && (
                  <button
                    onClick={resetCover}
                    className="p-1 rounded-sm border backdrop-blur-sm transition-colors hover:text-red-300"
                    style={{ color: 'var(--text-main)', borderColor: 'var(--border)', backgroundColor: 'rgba(0,0,0,0.55)' }}
                    title="Сбросить обложку к ID3"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
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
      <TransportControls />

      {/* ── Playlist + overlays ────────────────────────────────────────── */}
      <div className="aemp-playlist-area flex-1 relative min-h-0">
        <Playlist />

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
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onCoverSelected}
      />
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
