import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAudioEngine, AudioEngineState } from '../hooks/useAudioEngine';
import { useSettings } from './SettingsContext';

export interface Track {
  id: string;
  file: File;
  name: string;
  artist: string;
  duration: number;
  coverArt?: string; // data URL from ID3 tags
}

interface PlayerContextType {
  audioState: AudioEngineState;
  audioActions: ReturnType<typeof useAudioEngine>['actions'];
  playlist: Track[];
  currentTrackId: string | null;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  actions: {
    addTracks: (tracks: Track[]) => void;
    removeTrack: (id: string) => void;
    playTrack: (id: string) => void;
    playNext: () => void;
    playPrev: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    reorderPlaylist: (from: number, to: number) => void;
  };
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { state: audioState, actions: audioActions } = useAudioEngine();
  const { settings } = useSettings();
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Sync fade/crossfade settings → audio engine
  useEffect(() => {
    audioActions.setFadeIn(settings.fadeInMs);
  }, [settings.fadeInMs, audioActions]);

  useEffect(() => {
    audioActions.setFadeOut(settings.fadeOutMs);
  }, [settings.fadeOutMs, audioActions]);

  useEffect(() => {
    audioActions.setCrossfade(settings.crossfadeMs);
  }, [settings.crossfadeMs, audioActions]);

  const playTrack = useCallback(async (id: string) => {
    const track = playlist.find(t => t.id === id);
    if (!track) return;
    setCurrentTrackId(id);
    await audioActions.loadFile(track.file);
  }, [playlist, audioActions]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    if (repeatMode === 'one' && currentTrackId) {
      playTrack(currentTrackId);
      return;
    }

    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      const currentIndex = playlist.findIndex(t => t.id === currentTrackId);
      nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      if (nextIndex >= playlist.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else return;
      }
    }
    playTrack(playlist[nextIndex].id);
  }, [playlist, currentTrackId, isShuffle, repeatMode, playTrack]);

  const playPrev = useCallback(() => {
    if (playlist.length === 0) return;
    if (audioState.currentTime > 3) {
      audioActions.seek(0);
      return;
    }

    const currentIndex = playlist.findIndex(t => t.id === currentTrackId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    playTrack(playlist[prevIndex].id);
  }, [playlist, currentTrackId, audioState.currentTime, audioActions, playTrack]);

  useEffect(() => {
    audioActions.setOnTrackEnd(() => playNext());
  }, [audioActions, playNext]);

  const value: PlayerContextType = {
    audioState,
    audioActions,
    playlist,
    currentTrackId,
    isShuffle,
    repeatMode,
    actions: {
      addTracks: (newTracks) => {
        setPlaylist(prev => [...prev, ...newTracks]);
      },
      removeTrack: (id) => {
        setPlaylist(prev => prev.filter(t => t.id !== id));
        if (currentTrackId === id) {
          if (audioState.isPlaying) audioActions.togglePlayPause();
          setCurrentTrackId(null);
        }
      },
      playTrack,
      playNext,
      playPrev,
      toggleShuffle: () => setIsShuffle(p => !p),
      toggleRepeat: () => {
        setRepeatMode(p => p === 'off' ? 'all' : p === 'all' ? 'one' : 'off');
      },
      reorderPlaylist: (from, to) => {
        setPlaylist(prev => {
          const arr = [...prev];
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          return arr;
        });
      }
    }
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
