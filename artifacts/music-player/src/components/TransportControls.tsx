import React, { useRef, useState } from 'react';
import { usePlayer, Track } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX } from 'lucide-react';

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TransportControls() {
  const { audioState, audioActions, actions, isShuffle, repeatMode, currentTrackId, playlist } = usePlayer();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || audioState.duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioActions.seek(percent * audioState.duration);
  };

  return (
    <div className="bg-card border-t border-border p-6 flex flex-col gap-4">
      {/* Progress Bar */}
      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
        <span className="w-12 text-right">{formatTime(audioState.currentTime)}</span>
        <div 
          ref={progressBarRef}
          className="flex-1 h-2 bg-background rounded-full cursor-pointer relative overflow-hidden group border border-border/50"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-accent transition-all duration-100 ease-linear"
            style={{ width: `${(audioState.currentTime / (audioState.duration || 1)) * 100}%` }}
          />
          {/* Hover indicator (could add logic later) */}
        </div>
        <span className="w-12">{formatTime(audioState.duration)}</span>
      </div>

      <div className="flex items-center justify-between">
        {/* Now Playing Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-0">
          <div className="w-12 h-12 bg-background border border-border rounded flex items-center justify-center shrink-0 shadow-inner">
            <div className="w-4 h-4 rounded-full bg-accent/20 border border-accent/40" />
          </div>
          <div className="truncate min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {currentTrack ? currentTrack.name : 'No track loaded'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {currentTrack ? currentTrack.artist : 'Add some files to begin'}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-6 w-1/3 justify-center">
          <button 
            onClick={actions.toggleShuffle}
            className={`transition-colors ${isShuffle ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Shuffle size={18} />
          </button>
          
          <button onClick={actions.playPrev} className="text-foreground hover:text-accent transition-colors">
            <SkipBack size={24} />
          </button>
          
          <button 
            onClick={() => {
              if (currentTrackId) {
                audioActions.togglePlayPause();
              } else if (playlist.length > 0) {
                actions.playTrack(playlist[0].id);
              }
            }}
            className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_30px_rgba(204,255,0,0.4)]"
          >
            {audioState.isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current translate-x-[2px]" />}
          </button>
          
          <button onClick={actions.playNext} className="text-foreground hover:text-accent transition-colors">
            <SkipForward size={24} />
          </button>
          
          <button 
            onClick={actions.toggleRepeat}
            className={`transition-colors ${repeatMode !== 'off' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 w-1/3 justify-end group">
          <button onClick={audioActions.toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
            {audioState.isMuted || audioState.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={audioState.isMuted ? 0 : audioState.volume}
            onChange={(e) => audioActions.setVolume(parseFloat(e.target.value))}
            className="w-24 h-1 bg-background rounded-full appearance-none cursor-pointer accent-accent"
          />
        </div>
      </div>
    </div>
  );
}
