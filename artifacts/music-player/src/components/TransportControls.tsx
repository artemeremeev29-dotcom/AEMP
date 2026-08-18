import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useSettings } from '../context/SettingsContext';
import { Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX, Menu } from 'lucide-react';

export function TransportControls({ onToggleEQ, isEQActive }: { onToggleEQ: () => void; isEQActive: boolean }) {
  const { audioState, audioActions, actions, playlist, currentTrackId } = usePlayer();
  const { setOpenSettings } = useSettings();

  const handleStop = () => {
    if (audioState.isPlaying) audioActions.togglePlayPause();
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
    <div
      className="aemp-transport h-[40px] shrink-0 flex items-center px-4 gap-4 text-[#1e1e1e]"
      style={{ backgroundColor: 'var(--accent)' }}
    >
      {/* Transport */}
      <div className="aemp-transport-buttons flex items-center gap-1">
        <button onClick={actions.playPrev} className="p-1.5 hover:bg-black/15 rounded-sm transition-colors" title="Предыдущий">
          <SkipBack size={18} className="fill-current" />
        </button>
        <button onClick={handlePlayPause} className="p-1.5 hover:bg-black/15 rounded-sm transition-colors" title="Воспроизведение/Пауза">
          {audioState.isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
        </button>
        <button onClick={actions.playNext} className="p-1.5 hover:bg-black/15 rounded-sm transition-colors" title="Следующий">
          <SkipForward size={18} className="fill-current" />
        </button>
        <button onClick={handleStop} className="p-1.5 hover:bg-black/15 rounded-sm ml-2 transition-colors" title="Стоп">
          <Square size={16} className="fill-current" />
        </button>
      </div>

      {/* Volume */}
      <div className="aemp-transport-volume flex items-center gap-2 w-[120px] ml-4">
        <button onClick={audioActions.toggleMute} className="p-1 hover:bg-black/15 rounded-sm">
          {audioState.isMuted || audioState.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div className="flex-1 flex items-center">
          <input
            type="range" min="0" max="1" step="0.01"
            value={audioState.isMuted ? 0 : audioState.volume}
            onChange={e => audioActions.setVolume(parseFloat(e.target.value))}
            className="w-full h-[4px] bg-[#1e1e1e] appearance-none cursor-pointer slider-thumb-dark"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* EQ toggle */}
      <button
        onClick={onToggleEQ}
        className="px-2 py-0.5 text-xs font-bold border border-[#1e1e1e] rounded-sm transition-colors"
        style={isEQActive ? { backgroundColor: '#1e1e1e', color: 'var(--accent)' } : {}}
      >
        EQ
      </button>

      {/* Settings */}
      <button
        onClick={() => setOpenSettings(true)}
        className="p-1.5 hover:bg-black/15 rounded-sm transition-colors"
        title="Настройки"
      >
        <Menu size={16} />
      </button>
    </div>
  );
}
