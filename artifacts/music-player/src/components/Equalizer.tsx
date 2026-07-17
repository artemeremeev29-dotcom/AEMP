import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { EQ_BANDS } from '../hooks/useAudioEngine';

const PRESETS = {
  'ПЛОСКИЙ': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'БАС': [9, 7, 5, 2, 0, 0, 0, 0, 0, 0],
  'ВЫСОКИЕ': [0, 0, 0, 0, 0, 0, 3, 5, 7, 9],
  'ВОКАЛ': [-2, -1, 0, 3, 5, 4, 2, 0, -1, -2]
};

function formatFreq(freq: number) {
  if (freq >= 1000) return `${freq / 1000}K`;
  return freq.toString();
}

export function Equalizer() {
  const { audioState, audioActions } = usePlayer();

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a] text-[#cccccc]">
      {/* Компактный заголовок */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#3a3a3a] shrink-0">
        <span className="text-[10px] font-bold text-[#ff8c00] tracking-widest">ЭКВАЛАЙЗЕР</span>
        <div className="flex items-center gap-1">
          <select
            className="bg-[#1e1e1e] border border-[#3a3a3a] text-[#cccccc] text-[10px] py-0.5 px-1.5 focus:outline-none focus:border-[#ff8c00] cursor-pointer"
            onChange={(e) => {
              const preset = PRESETS[e.target.value as keyof typeof PRESETS];
              if (preset) audioActions.setAllEq(preset);
            }}
            defaultValue="ПЛОСКИЙ"
          >
            {Object.keys(PRESETS).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={() => audioActions.setAllEq(PRESETS['ПЛОСКИЙ'])}
            className="text-[10px] border border-[#3a3a3a] bg-[#1e1e1e] px-1.5 py-0.5 hover:text-[#ff8c00] hover:border-[#ff8c00] transition-colors"
          >
            СБРОС
          </button>
        </div>
      </div>

      <div className="flex-1 flex justify-between items-stretch px-2 py-1">
        {EQ_BANDS.map((freq, index) => {
          const gain = audioState.eqGains[index] || 0;
          return (
            <div key={freq} className="flex flex-col items-center gap-1 group">
              <div className="text-[9px] text-[#ff8c00] font-mono h-3">
                {gain > 0 ? '+' : ''}{Math.round(gain)}
              </div>
              <div className="relative flex-1 flex justify-center py-1">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-[#3a3a3a] z-0" />
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.1"
                  value={gain}
                  onChange={(e) => audioActions.setEqBand(index, parseFloat(e.target.value))}
                  className="eq-slider h-full z-10 bg-transparent"
                  style={{ accentColor: '#ff8c00' } as any}
                />
              </div>
              <div className="text-[9px] text-[#888] font-mono group-hover:text-[#ccc]">
                {formatFreq(freq)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
