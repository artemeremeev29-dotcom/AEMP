import { useState, useRef, useEffect, useCallback } from 'react';

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  eqGains: number[];
}

export function useAudioEngine() {
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const audioElRef       = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef   = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef      = useRef<GainNode | null>(null);
  const analyserNodeRef  = useRef<AnalyserNode | null>(null);
  const eqNodesRef       = useRef<BiquadFilterNode[]>([]);
  const objectUrlRef     = useRef<string | null>(null);
  const rafRef           = useRef<number>(0);

  // Refs for values that need to be read inside callbacks without stale closures
  const volumeRef        = useRef<number>(0.8);
  const isMutedRef       = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));

  const onTrackEndRef = useRef<(() => void) | undefined>(undefined);

  // ─── Audio context init (runs once on first user interaction) ───────────────
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserNodeRef.current = analyser;

    const gain = ctx.createGain();
    gain.gain.value = volumeRef.current;
    gainNodeRef.current = gain;

    const savedEq = localStorage.getItem('volt-eq');
    let initialEq: number[] = new Array(10).fill(0);
    if (savedEq) {
      try { initialEq = JSON.parse(savedEq); } catch (_) {}
    }
    setEqGains(initialEq);

    const eqNodes = EQ_BANDS.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.4;
      f.gain.value = initialEq[i] ?? 0;
      return f;
    });
    eqNodesRef.current = eqNodes;

    // Chain: source → eq[0]→…→eq[9] → analyser → gain → destination
    for (let i = 0; i < eqNodes.length - 1; i++) {
      eqNodes[i].connect(eqNodes[i + 1]);
    }
    eqNodes[eqNodes.length - 1].connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);
  }, []);

  // ─── RAF progress loop ───────────────────────────────────────────────────────
  const tickProgress = useCallback(() => {
    const audio = audioElRef.current;
    if (audio && !audio.paused && !audio.ended) {
      setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tickProgress);
    }
  }, []);

  // ─── Load a File and start playback ─────────────────────────────────────────
  // Uses HTMLAudioElement + MediaElementSourceNode — NO arrayBuffer/decodeAudioData.
  // The browser streams the file; no crash on large files.
  const loadFile = useCallback(async (file: File) => {
    initAudioContext();
    const ctx = audioCtxRef.current!;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Stop and disconnect previous element
    cancelAnimationFrame(rafRef.current);
    const prevAudio = audioElRef.current;
    if (prevAudio) {
      prevAudio.onended  = null;
      prevAudio.onerror  = null;
      prevAudio.pause();
      prevAudio.src = '';
    }
    if (mediaSourceRef.current) {
      try { mediaSourceRef.current.disconnect(); } catch (_) {}
      mediaSourceRef.current = null;
    }

    // Revoke previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Create a new Audio element (each element can only be captured by MediaElementSource once)
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    audio.src = url;
    audioElRef.current = audio;

    // Wire into Web Audio graph
    const source = ctx.createMediaElementSource(audio);
    source.connect(eqNodesRef.current[0] ?? gainNodeRef.current!);
    mediaSourceRef.current = source;

    // Events
    audio.onloadedmetadata = () => setDuration(audio.duration > 0 ? audio.duration : 0);
    audio.onended = () => {
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      onTrackEndRef.current?.();
    };
    audio.onerror = () => {
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
    };

    try {
      await audio.play();
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(isFinite(audio.duration) ? audio.duration : 0);
      rafRef.current = requestAnimationFrame(tickProgress);
    } catch (err) {
      // Autoplay blocked — user can press play manually
      console.warn('Autoplay blocked:', err);
      setIsPlaying(false);
    }
  }, [initAudioContext, tickProgress]);

  // ─── Play / Pause toggle ─────────────────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    const audio = audioElRef.current;
    if (!audio) return;

    const ctx = audioCtxRef.current;
    if (audio.paused || audio.ended) {
      if (ctx?.state === 'suspended') ctx.resume();
      audio.play()
        .then(() => {
          setIsPlaying(true);
          rafRef.current = requestAnimationFrame(tickProgress);
        })
        .catch(console.warn);
    } else {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
    }
  }, [tickProgress]);

  // ─── Seek ────────────────────────────────────────────────────────────────────
  const seek = useCallback((time: number) => {
    const audio = audioElRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
    setCurrentTime(audio.currentTime);
  }, []);

  // ─── Volume ──────────────────────────────────────────────────────────────────
  const setVolumeValue = useCallback((val: number) => {
    volumeRef.current = val;
    setVolume(val);
    if (gainNodeRef.current && !isMutedRef.current) {
      gainNodeRef.current.gain.value = val;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = next ? 0 : volumeRef.current;
    }
  }, []);

  // ─── EQ ─────────────────────────────────────────────────────────────────────
  const setEqBand = useCallback((index: number, gainValue: number) => {
    if (eqNodesRef.current[index]) {
      eqNodesRef.current[index].gain.value = gainValue;
    }
    setEqGains(prev => {
      const next = [...prev];
      next[index] = gainValue;
      localStorage.setItem('volt-eq', JSON.stringify(next));
      return next;
    });
  }, []);

  const setAllEq = useCallback((gains: number[]) => {
    gains.forEach((g, i) => {
      if (eqNodesRef.current[i]) eqNodesRef.current[i].gain.value = g;
    });
    setEqGains(gains);
    localStorage.setItem('volt-eq', JSON.stringify(gains));
  }, []);

  const getAnalyserNode = useCallback(() => analyserNodeRef.current, []);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      const audio = audioElRef.current;
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    state: { isPlaying, currentTime, duration, volume, isMuted, eqGains },
    actions: {
      loadFile,
      togglePlayPause,
      seek,
      setVolume: setVolumeValue,
      toggleMute,
      setEqBand,
      setAllEq,
      setOnTrackEnd: (cb: () => void) => { onTrackEndRef.current = cb; },
      getAnalyserNode,
      initAudioContext,
    }
  };
}
