import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX, Menu } from 'lucide-react';

export function TransportControls({ onToggleEQ, isEQActive }: { onToggleEQ: () => void, isEQActive: boolean }) {
  const { audioState, audioActions, actions, playlist, currentTrackId } = usePlayer();

  const handleStop = () => {
    if (audioState.isPlaying) {
       audioActions.togglePlayPause();
    }
    audioActions.seek(0);
  };

  const handlePlayPause = () => {
    if (currentTrackId) {
      audioActions.togglePlayPause();
    } else if (playlist.length > 0) {
      actions.playTrack(playlist[0].id);
    }
  };

  return (
    <div className="h-[40px] shrink-0 bg-[#ff8c00] flex items-center px-4 gap-4 text-[#1e1e1e]">
      
      {/* Transport Buttons */}
      <div className="flex items-center gap-1">
        <button onClick={actions.playPrev} className="p-1.5 hover:bg-black/15 transition-colors rounded-sm" title="Предыдущий">
          <SkipBack size={18} className="fill-current" />
        </button>
        <button onClick={handlePlayPause} className="p-1.5 hover:bg-black/15 transition-colors rounded-sm" title="Пауза/Воспроизведение">
          {audioState.isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
        </button>
        <button onClick={actions.playNext} className="p-1.5 hover:bg-black/15 transition-colors rounded-sm" title="Следующий">
          <SkipForward size={18} className="fill-current" />
        </button>
        <button onClick={handleStop} className="p-1.5 hover:bg-black/15 transition-colors rounded-sm ml-2" title="Стоп">
          <Square size={16} className="fill-current" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-[120px] ml-4">
        <button onClick={audioActions.toggleMute} className="p-1 hover:bg-black/15 rounded-sm">
          {audioState.isMuted || audioState.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div className="flex-1 flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={audioState.isMuted ? 0 : audioState.volume}
            onChange={(e) => audioActions.setVolume(parseFloat(e.target.value))}
            className="w-full h-[4px] bg-[#1e1e1e] appearance-none cursor-pointer slider-thumb-dark"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Right Controls */}
      <button 
        onClick={onToggleEQ}
        className={`px-2 py-0.5 text-xs font-bold border border-[#1e1e1e] rounded-sm transition-colors ${isEQActive ? 'bg-[#1e1e1e] text-[#ff8c00]' : 'hover:bg-black/15'}`}
      >
        EQ
      </button>

      <button className="p-1.5 hover:bg-black/15 transition-colors rounded-sm">
        <Menu size={16} />
      </button>
    </div>
  );
}
