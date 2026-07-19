import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useAudioEngine, AudioEngineState } from '../hooks/useAudioEngine';
import { useSettings } from './SettingsContext';

export interface Track {
  id: string;
  file: File;
  name: string;
  artist: string;
  duration: number;
  coverArt?: string;
}

interface PlayerContextType {
  audioState: AudioEngineState;
  audioActions: ReturnType<typeof useAudioEngine>['actions'];
  playlist: Track[];
  currentTrackId: string | null;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  bookmarkResume: { track: Track; time: number } | null;
  actions: {
    addTracks: (tracks: Track[]) => void;
    removeTrack: (id: string) => void;
    playTrack: (id: string) => void;
    playNext: () => void;
    playPrev: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    reorderPlaylist: (from: number, to: number) => void;
    queueNext: (id: string) => void;
    confirmResume: () => void;
    dismissResume: () => void;
  };
}

const PlayerContext = createContext<PlayerContextType | null>(null);

// ── Bookmark helpers ──────────────────────────────────────────────────────────
const bmKey = (t: Track) => `aemp-bm-${t.name}_${t.file.size}`;
const saveBookmark = (t: Track, time: number) => {
  if (time > 10) localStorage.setItem(bmKey(t), String(Math.floor(time)));
};
const loadBookmark = (t: Track): number | null => {
  const v = localStorage.getItem(bmKey(t));
  return v ? parseFloat(v) : null;
};
const clearBookmark = (t: Track) => localStorage.removeItem(bmKey(t));

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { state: audioState, actions: audioActions } = useAudioEngine();
  const { settings, sleepTimerEnd } = useSettings();

  const [playlist, setPlaylist]           = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isShuffle, setIsShuffle]         = useState(false);
  const [repeatMode, setRepeatMode]       = useState<'off' | 'all' | 'one'>('off');
  const [bookmarkResume, setBookmarkResume] = useState<{ track: Track; time: number } | null>(null);

  const currentTrackRef = useRef<Track | null>(null);
  const bookmarkSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync fade/crossfade settings → audio engine
  useEffect(() => { audioActions.setFadeIn(settings.fadeInMs); }, [settings.fadeInMs]);
  useEffect(() => { audioActions.setFadeOut(settings.fadeOutMs); }, [settings.fadeOutMs]);
  useEffect(() => { audioActions.setCrossfade(settings.crossfadeMs); }, [settings.crossfadeMs]);

  // ── Sleep timer execution ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sleepTimerEnd) return;
    const checkInterval = setInterval(() => {
      const left = sleepTimerEnd - Date.now();
      if (left <= 0) {
        // Stop playback
        if (audioState.isPlaying) audioActions.togglePlayPause();
        clearInterval(checkInterval);
      } else if (left <= 30_000) {
        // Fade out in last 30 s via gain node
        audioActions.setFadeOut(30_000);
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [sleepTimerEnd, audioState.isPlaying, audioActions]);

  // ── Auto-save bookmark every 5 s ─────────────────────────────────────────
  useEffect(() => {
    if (bookmarkSaveTimerRef.current) clearInterval(bookmarkSaveTimerRef.current);
    if (!audioState.isPlaying || !currentTrackRef.current) return;
    bookmarkSaveTimerRef.current = setInterval(() => {
      const track = currentTrackRef.current;
      const time  = audioState.currentTime;
      if (track && time > 10) saveBookmark(track, time);
    }, 5000);
    return () => { if (bookmarkSaveTimerRef.current) clearInterval(bookmarkSaveTimerRef.current); };
  }, [audioState.isPlaying, audioState.currentTime]);

  const playTrack = useCallback(async (id: string) => {
    const track = playlist.find(t => t.id === id);
    if (!track) return;
    // Save bookmark for previous track before switching
    if (currentTrackRef.current && audioState.currentTime > 10) {
      saveBookmark(currentTrackRef.current, audioState.currentTime);
    }
    setCurrentTrackId(id);
    currentTrackRef.current = track;
    await audioActions.loadFile(track.file);

    // Check bookmark
    const bm = loadBookmark(track);
    if (bm && bm > 10 && bm < (track.duration - 10)) {
      setBookmarkResume({ track, time: bm });
    }
  }, [playlist, audioActions, audioState.currentTime]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    if (repeatMode === 'one' && currentTrackId) { playTrack(currentTrackId); return; }
    let next = 0;
    if (isShuffle) {
      next = Math.floor(Math.random() * playlist.length);
    } else {
      const idx = playlist.findIndex(t => t.id === currentTrackId);
      next = idx >= 0 ? idx + 1 : 0;
      if (next >= playlist.length) {
        if (repeatMode === 'all') next = 0; else return;
      }
    }
    playTrack(playlist[next].id);
  }, [playlist, currentTrackId, isShuffle, repeatMode, playTrack]);

  const playPrev = useCallback(() => {
    if (playlist.length === 0) return;
    if (audioState.currentTime > 3) { audioActions.seek(0); return; }
    const idx  = playlist.findIndex(t => t.id === currentTrackId);
    const prev = idx > 0 ? idx - 1 : playlist.length - 1;
    playTrack(playlist[prev].id);
  }, [playlist, currentTrackId, audioState.currentTime, audioActions, playTrack]);

  useEffect(() => {
    audioActions.setOnTrackEnd(() => playNext());
  }, [audioActions, playNext]);

  const value: PlayerContextType = {
    audioState, audioActions, playlist, currentTrackId, isShuffle, repeatMode, bookmarkResume,
    actions: {
      addTracks: (newTracks) => setPlaylist(prev => [...prev, ...newTracks]),
      removeTrack: (id) => {
        setPlaylist(prev => prev.filter(t => t.id !== id));
        if (currentTrackId === id) {
          if (audioState.isPlaying) audioActions.togglePlayPause();
          setCurrentTrackId(null);
          currentTrackRef.current = null;
        }
      },
      playTrack,
      playNext,
      playPrev,
      toggleShuffle: () => setIsShuffle(p => !p),
      toggleRepeat: () => setRepeatMode(p => p === 'off' ? 'all' : p === 'all' ? 'one' : 'off'),
      reorderPlaylist: (from, to) => {
        setPlaylist(prev => {
          const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return arr;
        });
      },
      queueNext: (id) => {
        setPlaylist(prev => {
          const idx = prev.findIndex(t => t.id === currentTrackId);
          const arr = prev.filter(t => t.id !== id);
          const target = prev.find(t => t.id === id);
          if (!target) return prev;
          const insertAt = idx >= 0 ? idx + 1 : 0;
          arr.splice(insertAt, 0, target);
          return arr;
        });
      },
      confirmResume: () => {
        if (bookmarkResume) {
          audioActions.seek(bookmarkResume.time);
          clearBookmark(bookmarkResume.track);
          setBookmarkResume(null);
        }
      },
      dismissResume: () => {
        if (bookmarkResume) {
          clearBookmark(bookmarkResume.track);
          setBookmarkResume(null);
        }
      },
    }
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
