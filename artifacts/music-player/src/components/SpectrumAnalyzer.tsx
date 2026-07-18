import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export function SpectrumAnalyzer() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { audioActions, audioState } = usePlayer();
  const animationRef = useRef<number>(0);
  const peaksRef     = useRef<number[]>([]);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        canvas.width  = e.contentRect.width;
        canvas.height = e.contentRect.height;
      }
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

    const bufferLength = analyser.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);
    const displayBins  = Math.floor(bufferLength * 0.4);
    const numBars      = 50;

    if (peaksRef.current.length !== numBars) {
      peaksRef.current = new Array(numBars).fill(0);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;

      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, W, H);

      // Read accent color from CSS variable
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent').trim() || '#ff8c00';

      const barWidth = W / numBars;
      const step     = Math.max(1, Math.floor(displayBins / numBars));

      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          const idx = i * step + j;
          if (idx < bufferLength) sum += dataArray[idx];
        }
        const avg    = sum / step;
        const target = (avg / 255) * H;

        if (target > peaksRef.current[i]) {
          peaksRef.current[i] = target;
        } else {
          peaksRef.current[i] -= 1.5;
          if (peaksRef.current[i] < 0) peaksRef.current[i] = 0;
        }

        const x = i * barWidth;
        ctx.fillStyle = accent;
        ctx.fillRect(x + 1, H - target, barWidth - 2, target);

        // Peak dot — slightly lighter
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x + 1, H - peaksRef.current[i] - 2, barWidth - 2, 2);
        ctx.globalAlpha = 1;
      }
    };

    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [audioActions, audioState.isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#141414] absolute inset-0">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
