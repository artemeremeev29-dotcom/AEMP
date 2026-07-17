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
    
    if (!analyser) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const displayBins = Math.floor(bufferLength * 0.4);
    const numBars = 50;
    
    if (peaksRef.current.length !== numBars) {
      peaksRef.current = new Array(numBars).fill(0);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, width, height);
      
      const barWidth = width / numBars;
      const step = Math.floor(displayBins / numBars);
      
      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        let average = sum / step;
        
        const targetHeight = (average / 255) * height;
        
        if (targetHeight > peaksRef.current[i]) {
          peaksRef.current[i] = targetHeight;
        } else {
          peaksRef.current[i] -= 1.5;
          if (peaksRef.current[i] < 0) peaksRef.current[i] = 0;
        }
        
        const x = i * barWidth;
        const barHeight = targetHeight;
        const y = height - barHeight;
        
        ctx.fillStyle = '#ff8c00';
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
        
        // Peak dots
        ctx.fillStyle = '#ffa500';
        ctx.fillRect(x + 1, height - peaksRef.current[i] - 2, barWidth - 2, 2);
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
