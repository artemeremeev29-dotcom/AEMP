import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export function SpectrumAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { audioActions, audioState } = usePlayer();
  const animationRef = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const analyser = audioActions.getAnalyserNode();
    
    // Fallback drawing if no analyser
    if (!analyser) {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // We only use the lower 1/3 of the frequencies for a better look
    const displayBins = Math.floor(bufferLength * 0.3);
    const numBars = 100;
    
    // Initialize peaks array if needed
    if (peaksRef.current.length !== numBars) {
      peaksRef.current = new Array(numBars).fill(0);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);
      
      const barWidth = width / numBars;
      const step = Math.floor(displayBins / numBars);
      
      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        let average = sum / step;
        
        // Exponential decay for smoothing
        const targetHeight = (average / 255) * height;
        
        // Update peak
        if (targetHeight > peaksRef.current[i]) {
          peaksRef.current[i] = targetHeight;
        } else {
          peaksRef.current[i] -= 2; // peak drop speed
          if (peaksRef.current[i] < 0) peaksRef.current[i] = 0;
        }
        
        const x = i * barWidth;
        const barHeight = targetHeight;
        const y = height - barHeight;
        
        // Draw bar
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#ccff00'); // Vivid volt accent
        gradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
        
        // Draw peak
        ctx.fillStyle = 'rgba(204, 255, 0, 0.8)';
        ctx.fillRect(x + 1, height - peaksRef.current[i] - 2, barWidth - 2, 2);
      }
      
      // Inner glow overlay
      const glowGrad = ctx.createLinearGradient(0, 0, 0, height);
      glowGrad.addColorStop(0, 'rgba(9, 9, 11, 0.5)');
      glowGrad.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [audioActions, audioState.isPlaying]); // Re-bind if play state changes because analyser might be created on play

  return (
    <div ref={containerRef} className="w-full h-full min-h-[180px] bg-background relative border-y border-border">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
