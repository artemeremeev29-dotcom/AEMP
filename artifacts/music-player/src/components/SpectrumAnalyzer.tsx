import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useSettings } from '../context/SettingsContext';

export function SpectrumAnalyzer() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { audioActions, audioState } = usePlayer();
  const { settings } = useSettings();
  const animRef  = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);
  const styleRef = useRef(settings.visualizerStyle);

  useEffect(() => { styleRef.current = settings.visualizerStyle; }, [settings.visualizerStyle]);

  useEffect(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) { canvas.width = e.contentRect.width; canvas.height = e.contentRect.height; }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const analyser = audioActions.getAnalyserNode();
    if (!analyser) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const freqData  = new Uint8Array(analyser.frequencyBinCount);
    const timeData  = new Uint8Array(analyser.frequencyBinCount);
    const numBars   = 50;
    peaksRef.current = new Array(numBars).fill(0);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8c00';
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--vis-bg').trim() || '#141414';

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const style = styleRef.current;

      if (style === 'wave') {
        // ── WAVE ──────────────────────────────────────────────────────────
        analyser.getByteTimeDomainData(timeData);
        ctx.strokeStyle = accent;
        ctx.lineWidth   = 2;
        ctx.shadowColor = accent;
        ctx.shadowBlur  = 4;
        ctx.beginPath();
        for (let i = 0; i < timeData.length; i++) {
          const x = (i / timeData.length) * W;
          const y = (timeData[i] / 128) * (H / 2);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (style === 'circle') {
        // ── CIRCLE ────────────────────────────────────────────────────────
        analyser.getByteFrequencyData(freqData);
        const cx = W / 2, cy = H / 2;
        const R  = Math.min(W, H) * 0.28;
        const step = Math.max(1, Math.floor(freqData.length * 0.5 / numBars));
        ctx.strokeStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur  = 3;
        for (let i = 0; i < numBars; i++) {
          const angle  = (i / numBars) * Math.PI * 2 - Math.PI / 2;
          const val    = freqData[i * step] / 255;
          const bLen   = val * R * 0.9;
          const x1 = cx + Math.cos(angle) * R;
          const y1 = cy + Math.sin(angle) * R;
          const x2 = cx + Math.cos(angle) * (R + bLen);
          const y2 = cy + Math.sin(angle) * (R + bLen);
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.5 + val * 0.5;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;

      } else {
        // ── BARS (default) ────────────────────────────────────────────────
        analyser.getByteFrequencyData(freqData);
        const displayBins = Math.floor(freqData.length * 0.4);
        const barW = W / numBars;
        const step = Math.max(1, Math.floor(displayBins / numBars));

        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            const idx = i * step + j;
            if (idx < freqData.length) sum += freqData[idx];
          }
          const avg    = sum / step;
          const target = (avg / 255) * H;

          if (target > peaksRef.current[i]) {
            peaksRef.current[i] = target;
          } else {
            peaksRef.current[i] -= 1.5;
            if (peaksRef.current[i] < 0) peaksRef.current[i] = 0;
          }

          ctx.fillStyle = accent;
          ctx.fillRect(i * barW + 1, H - target, barW - 2, target);
          ctx.globalAlpha = 0.6;
          ctx.fillRect(i * barW + 1, H - peaksRef.current[i] - 2, barW - 2, 2);
          ctx.globalAlpha = 1;
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [audioActions, audioState.isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0" style={{ backgroundColor: 'var(--vis-bg, #141414)' }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
