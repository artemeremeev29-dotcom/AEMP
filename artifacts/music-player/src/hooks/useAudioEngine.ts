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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));
  
  const playbackStartTimeRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  
  // Handlers for outside events
  const onTrackEndRef = useRef<(() => void) | undefined>(undefined);

  // Init context
  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new window.AudioContext();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserNodeRef.current = analyser;
      
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gainNodeRef.current = gain;
      
      const savedEq = localStorage.getItem('volt-eq');
      let initialEq = new Array(10).fill(0);
      if (savedEq) {
        try {
          initialEq = JSON.parse(savedEq);
        } catch(e) {}
      }
      setEqGains(initialEq);
      
      const eqNodes = EQ_BANDS.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = initialEq[i] || 0;
        return filter;
      });
      eqNodesRef.current = eqNodes;
      
      // Chain: eq[0] -> eq[1] -> ... -> eq[9] -> analyser -> gain -> destination
      for (let i = 0; i < eqNodes.length - 1; i++) {
        eqNodes[i].connect(eqNodes[i + 1]);
      }
      eqNodes[eqNodes.length - 1].connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
    }
  }, [volume]);

  const updateProgress = useCallback(() => {
    if (isPlaying && audioCtxRef.current) {
      const time = audioCtxRef.current.currentTime - playbackStartTimeRef.current + playbackOffsetRef.current;
      setCurrentTime(Math.min(time, duration));
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, updateProgress]);

  const stopCurrentSource = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  };

  const playBuffer = useCallback((buffer: AudioBuffer, offset: number = 0) => {
    initAudioContext();
    const ctx = audioCtxRef.current!;
    stopCurrentSource();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(eqNodesRef.current[0]);
    
    source.onended = () => {
      setIsPlaying(false);
      setCurrentTime(buffer.duration);
      if (onTrackEndRef.current) onTrackEndRef.current();
    };
    
    sourceNodeRef.current = source;
    source.start(0, offset);
    
    playbackStartTimeRef.current = ctx.currentTime;
    playbackOffsetRef.current = offset;
    
    setDuration(buffer.duration);
    setIsPlaying(true);
  }, [initAudioContext]);

  const loadFile = useCallback(async (file: File) => {
    initAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
    audioBufferRef.current = audioBuffer;
    playBuffer(audioBuffer, 0);
  }, [initAudioContext, playBuffer]);

  const togglePlayPause = useCallback(() => {
    if (!audioBufferRef.current) return;
    
    if (isPlaying) {
      stopCurrentSource();
      playbackOffsetRef.current = currentTime;
      setIsPlaying(false);
    } else {
      playBuffer(audioBufferRef.current, currentTime);
    }
  }, [isPlaying, currentTime, playBuffer]);

  const seek = useCallback((time: number) => {
    if (!audioBufferRef.current) return;
    setCurrentTime(time);
    if (isPlaying) {
      playBuffer(audioBufferRef.current, time);
    } else {
      playbackOffsetRef.current = time;
    }
  }, [isPlaying, playBuffer]);

  const setVolumeValue = useCallback((val: number) => {
    setVolume(val);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : val;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

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
    gains.forEach((gain, i) => {
      if (eqNodesRef.current[i]) {
        eqNodesRef.current[i].gain.value = gain;
      }
    });
    setEqGains(gains);
    localStorage.setItem('volt-eq', JSON.stringify(gains));
  }, []);

  const getAnalyserNode = useCallback(() => analyserNodeRef.current, []);

  return {
    state: {
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      eqGains
    },
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
      initAudioContext
    }
  };
}
