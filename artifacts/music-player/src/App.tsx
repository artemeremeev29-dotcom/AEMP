import React, { useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { SpectrumAnalyzer } from './components/SpectrumAnalyzer';
import { Equalizer } from './components/Equalizer';
import { Playlist } from './components/Playlist';
import { TransportControls } from './components/TransportControls';
import { AnimatePresence, motion } from 'framer-motion';
import { Repeat, Shuffle, Repeat1, Copy, Activity, Minus, Square, X } from 'lucide-react';

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function AppContent() {
  const [showEQ, setShowEQ] = useState(false);
  const { audioState, audioActions, playlist, currentTrackId, isShuffle, repeatMode, actions } = usePlayer();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || audioState.duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioActions.seek(percent * audioState.duration);
  };

  return (
    <div className="w-full max-w-[520px] flex flex-col shadow-[0_10px_60px_rgba(0,0,0,0.8)] bg-[#2a2a2a] overflow-hidden h-[90vh] max-h-[800px]">
      {/* BLOCK 1: Status Bar */}
      <div className="h-[28px] shrink-0 bg-[#1e1e1e] flex justify-between items-center px-2 border-b border-[#3a3a3a] text-[#999] text-[11px] font-mono select-none">
        <div className="truncate pr-4">
          {currentTrack ? (
            `:: ${formatTime(audioState.currentTime)} :: ${currentTrack.artist} - ${currentTrack.name} :: MP3 :: 44.1 kHz, 320 kbps,`
          ) : (
            `:: Вольт Плеер :: AIMP3 4X Skin ::`
          )}
        </div>
        <div className="flex gap-2 text-[#888] shrink-0">
          <Minus size={12} className="cursor-pointer hover:text-white" />
          <Square size={10} className="cursor-pointer hover:text-white mt-[1px]" />
          <X size={12} className="cursor-pointer hover:text-[#ff8c00]" />
        </div>
      </div>

      {/* BLOCK 2: Player Body */}
      <div className="h-[120px] shrink-0 bg-[#2a2a2a] flex flex-col relative">
        <div className="flex flex-1">
          {/* Left: Album Cover */}
          <div className="w-[170px] flex flex-col border-r border-[#3a3a3a] shrink-0">
            {/* Tiny buttons row */}
            <div className="h-[24px] bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center justify-around px-2">
               <button onClick={actions.toggleShuffle} className={`p-1 ${isShuffle ? 'text-[#ff8c00]' : 'text-[#888] hover:text-[#ff8c00]'}`} title="Случайный порядок"><Shuffle size={12}/></button>
               <button onClick={actions.toggleRepeat} className={`p-1 ${repeatMode !== 'off' ? 'text-[#ff8c00]' : 'text-[#888] hover:text-[#ff8c00]'}`} title="Повтор">{repeatMode === 'one' ? <Repeat1 size={12}/> : <Repeat size={12}/>}</button>
               <button className="p-1 text-[#888] hover:text-[#ff8c00] text-[10px] font-bold" title="Повтор A-B">A-B</button>
               <button className="p-1 text-[#888] hover:text-[#ff8c00]" title="Эффекты"><Activity size={12}/></button>
               <button className="p-1 text-[#888] hover:text-[#ff8c00]" title="Копировать инфо"><Copy size={12}/></button>
            </div>
            {/* Cover */}
            <div className="flex-1 bg-[#1e1e1e] m-2 flex items-center justify-center relative border border-[#141414] shadow-inner">
               <div style={{ width: 0, height: 0, borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderBottom: '34px solid #ff8c00', opacity: 0.8 }} />
            </div>
          </div>

          {/* Right: Visualizer + Time */}
          <div className="flex-1 flex flex-col relative min-w-0">
            <div className="absolute top-2 right-4 flex flex-col items-end z-10 pointer-events-none">
               <div className="text-[#ff8c00] text-4xl font-bold tracking-tighter drop-shadow-[0_0_5px_rgba(255,140,0,0.4)]" style={{ fontFamily: 'Consolas, monospace', fontVariantNumeric: 'tabular-nums' }}>
                 {formatTime(audioState.currentTime)}
               </div>
               <div className="text-[#ff8c00] text-[10px] opacity-80" style={{ fontFamily: 'Consolas, monospace', fontVariantNumeric: 'tabular-nums' }}>
                 {formatTime(audioState.duration)}
               </div>
            </div>
            {/* Spectrum Analyzer */}
            <div className="flex-1 bg-[#141414] mt-2 ml-2 mr-2 mb-2 border border-[#3a3a3a] relative overflow-hidden">
               <SpectrumAnalyzer />
            </div>
          </div>
        </div>

        {/* Seekbar */}
        <div className="h-[12px] bg-[#141414] flex items-center relative group cursor-pointer border-t border-[#3a3a3a]" onClick={handleSeek} ref={progressBarRef}>
           {(() => {
             const pct = audioState.duration > 0
               ? Math.min(100, Math.max(0, (audioState.currentTime / audioState.duration) * 100))
               : 0;
             return <>
               <div className="h-[4px] bg-[#ff8c00] absolute left-0 top-[4px] pointer-events-none" style={{ width: `${pct}%` }} />
               <div className="w-[12px] h-[12px] bg-[#ff8c00] rounded-full absolute top-0 shadow-[0_0_5px_#ff8c00] pointer-events-none" style={{ left: `clamp(0px, calc(${pct}% - 6px), calc(100% - 12px))` }} />
             </>;
           })()}
        </div>
      </div>

      {/* BLOCK 3: Transport Panel */}
      <TransportControls onToggleEQ={() => setShowEQ(!showEQ)} isEQActive={showEQ} />

      {/* BLOCK 8: Equalizer */}
      <AnimatePresence initial={false}>
        {showEQ && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 150, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="shrink-0 bg-[#2a2a2a] border-b border-[#3a3a3a] overflow-hidden z-10"
          >
            <Equalizer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BLOCKS 4-7: Playlist */}
      <Playlist />
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}

export default App;
