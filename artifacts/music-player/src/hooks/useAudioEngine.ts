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

  // Fade / crossfade settings refs
  const fadeInMsRef      = useRef<number>(0);
  const fadeOutMsRef     = useRef<number>(0);
  const crossfadeMsRef   = useRef<number>(0);

  // Timers for fade/crossfade
  const fadeOutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Previous audio element kept alive during crossfade
  const prevCrossfadeGainRef = useRef<GainNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));

  const onTrackEndRef = useRef<(() => void) | undefined>(undefined);

  // ─── Audio context init ──────────────────────────────────────────────────────
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
  const loadFile = useCallback(async (file: File) => {
    initAudioContext();
    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') await ctx.resume();

    cancelAnimationFrame(rafRef.current);

    // Clear pending fade/crossfade timers
    if (fadeOutTimerRef.current) { clearTimeout(fadeOutTimerRef.current); fadeOutTimerRef.current = null; }
    if (crossfadeTimerRef.current) { clearTimeout(crossfadeTimerRef.current); crossfadeTimerRef.current = null; }

    const crossMs = crossfadeMsRef.current;
    const prevAudio = audioElRef.current;

    if (crossMs > 0 && prevAudio && !prevAudio.paused && !prevAudio.ended) {
      // ── CROSSFADE: reroute previous source through a fading gain ──
      const crossGain = ctx.createGain();
      const targetVol = isMutedRef.current ? 0 : volumeRef.current;
      crossGain.gain.setValueAtTime(targetVol, ctx.currentTime);
      crossGain.gain.linearRampToValueAtTime(0, ctx.currentTime + crossMs / 1000);
      crossGain.connect(ctx.destination);

      if (mediaSourceRef.current) {
        try { mediaSourceRef.current.disconnect(); } catch (_) {}
        mediaSourceRef.current.connect(crossGain);
        mediaSourceRef.current = null;
      }

      // Disconnect any previous crossfade gain
      if (prevCrossfadeGainRef.current) {
        try { prevCrossfadeGainRef.current.disconnect(); } catch (_) {}
      }
      prevCrossfadeGainRef.current = crossGain;

      const capturedPrev = prevAudio;
      setTimeout(() => {
        capturedPrev.pause();
        capturedPrev.src = '';
        try { crossGain.disconnect(); } catch (_) {}
        if (prevCrossfadeGainRef.current === crossGain) prevCrossfadeGainRef.current = null;
      }, crossMs + 300);

      // Don't stop prev audio — it's fading out through crossGain
      audioElRef.current = null;
    } else {
      // Normal stop of previous track
      if (prevAudio) {
        prevAudio.onended = null;
        prevAudio.onerror = null;
        prevAudio.pause();
        prevAudio.src = '';
      }
      if (mediaSourceRef.current) {
        try { mediaSourceRef.current.disconnect(); } catch (_) {}
        mediaSourceRef.current = null;
      }
    }

    // Revoke previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // ── Apply fade-in (or crossfade-in) on main gain ──
    const fadeInMs = fadeInMsRef.current;
    const effectiveFadeIn = Math.max(fadeInMs, crossMs);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
      if (effectiveFadeIn > 0) {
        gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(
          isMutedRef.current ? 0 : volumeRef.current,
          ctx.currentTime + effectiveFadeIn / 1000
        );
      } else {
        gainNodeRef.current.gain.setValueAtTime(
          isMutedRef.current ? 0 : volumeRef.current,
          ctx.currentTime
        );
      }
    }

    // ── Create new Audio element ──
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    audio.src = url;
    audioElRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    source.connect(eqNodesRef.current[0] ?? gainNodeRef.current!);
    mediaSourceRef.current = source;

    let crossfadeTriggered = false;

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      setDuration(dur > 0 ? dur : 0);

      // Schedule crossfade trigger (fires early, before track ends)
      const cMs = crossfadeMsRef.current;
      if (cMs > 0 && isFinite(dur) && dur > cMs / 1000 + 1) {
        const triggerAt = (dur - cMs / 1000) * 1000;
        crossfadeTimerRef.current = setTimeout(() => {
          if (!crossfadeTriggered) {
            crossfadeTriggered = true;
            onTrackEndRef.current?.();
          }
        }, triggerAt);
      }

      // Schedule fade-out
      const fMs = fadeOutMsRef.current;
      if (fMs > 0 && isFinite(dur) && dur > fMs / 1000 + 0.5) {
        const triggerAt = (dur - fMs / 1000 - 0.05) * 1000;
        fadeOutTimerRef.current = setTimeout(() => {
          if (gainNodeRef.current && audioCtxRef.current && !crossfadeTriggered) {
            const now = audioCtxRef.current.currentTime;
            gainNodeRef.current.gain.cancelScheduledValues(now);
            gainNodeRef.current.gain.setValueAtTime(
              isMutedRef.current ? 0 : volumeRef.current, now
            );
            gainNodeRef.current.gain.linearRampToValueAtTime(0, now + fMs / 1000);
          }
        }, Math.max(0, triggerAt));
      }
    };

    audio.onended = () => {
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      if (!crossfadeTriggered) {
        onTrackEndRef.current?.();
      }
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

  // ─── Stop ─────────────────────────────────────────────────────────────────────
  // Unlike pause, stop always returns the current track to its beginning.
  const stop = useCallback(() => {
    const audio = audioElRef.current;
    cancelAnimationFrame(rafRef.current);
    if (audio) {
      audio.pause();
      try { audio.currentTime = 0; } catch (_) {}
    }
    setCurrentTime(0);
    setIsPlaying(false);
    if (gainNodeRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      gainNodeRef.current.gain.cancelScheduledValues(now);
      gainNodeRef.current.gain.setValueAtTime(
        isMutedRef.current ? 0 : volumeRef.current,
        now
      );
    }
  }, []);

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
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      const audio = audioElRef.current;
      if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); audio.src = ''; }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    state: { isPlaying, currentTime, duration, volume, isMuted, eqGains },
    actions: {
      loadFile,
      togglePlayPause,
      stop,
      seek,
      setVolume: setVolumeValue,
      toggleMute,
      setEqBand,
      setAllEq,
      setOnTrackEnd: (cb: () => void) => { onTrackEndRef.current = cb; },
      getAnalyserNode,
      initAudioContext,
      // Fade / crossfade setters — call when settings change
      setFadeIn:   (ms: number) => { fadeInMsRef.current = ms; },
      setFadeOut:  (ms: number) => { fadeOutMsRef.current = ms; },
      setCrossfade:(ms: number) => { crossfadeMsRef.current = ms; },
    }
  };
}
