import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { EQ_BANDS } from '../hooks/useAudioEngine';
import { RotateCcw } from 'lucide-react';

const PRESETS = {
  'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [9, 7, 5, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 0, 3, 5, 7, 9],
  'Vocal Boost': [-2, -1, 0, 3, 5, 4, 2, 0, -1, -2],
  'Electronic': [6, 5, 1, 0, -2, 2, 1, 3, 5, 6],
  'Classical': [4, 3, 0, 0, 0, 0, 0, 2, 3, 4]
};

function formatFreq(freq: number) {
  if (freq >= 1000) return `${freq / 1000}k`;
  return freq.toString();
}

export function Equalizer() {
  const { audioState, audioActions } = usePlayer();

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg p-6 shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-sm font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Equalizer
        </h2>
        <div className="flex gap-2">
          <select 
            className="bg-background border border-border text-xs text-foreground py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-accent appearance-none font-mono"
            onChange={(e) => {
              const preset = PRESETS[e.target.value as keyof typeof PRESETS];
              if (preset) audioActions.setAllEq(preset);
            }}
            defaultValue="Flat"
          >
            {Object.keys(PRESETS).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button 
            onClick={() => audioActions.setAllEq(PRESETS['Flat'])}
            className="text-muted-foreground hover:text-accent transition-colors p-1"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex justify-between items-stretch">
        {EQ_BANDS.map((freq, index) => {
          const gain = audioState.eqGains[index] || 0;
          return (
            <div key={freq} className="flex flex-col items-center gap-3">
              <div className="text-[10px] text-accent font-mono w-6 text-center">
                {gain > 0 ? '+' : ''}{Math.round(gain)}
              </div>
              <div className="relative flex-1 flex justify-center py-2">
                {/* Zero line indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-muted-foreground z-0 opacity-50" />
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.1"
                  value={gain}
                  onChange={(e) => audioActions.setEqBand(index, parseFloat(e.target.value))}
                  className="h-full z-10"
                  {...{ orient: "vertical" }}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                {formatFreq(freq)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
