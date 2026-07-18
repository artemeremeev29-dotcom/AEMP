import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const PRESET_COLORS = [
  '#ff8c00', '#ff4444', '#ff44aa', '#aa44ff',
  '#4488ff', '#44ccff', '#44dd88', '#cccc00',
];

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[#ccc]">{label}</span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-[3px] rounded-none cursor-pointer appearance-none bg-[#333]"
        style={{ accentColor: 'var(--accent)' } as React.CSSProperties}
      />
      <div className="flex justify-between text-[9px] text-[#555]">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#2a2a2a]">
      <span className="text-[11px] text-[#ccc]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-10 h-5 rounded-full relative transition-colors duration-200"
        style={{ backgroundColor: value ? 'var(--accent)' : '#333' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: value ? '22px' : '2px' }}
        />
      </button>
    </div>
  );
}

type Tab = 'playback' | 'appearance' | 'interface';
const TABS: { id: Tab; label: string }[] = [
  { id: 'playback', label: 'ВОСПРОИЗВ.' },
  { id: 'appearance', label: 'ВНЕШНИЙ ВИД' },
  { id: 'interface', label: 'ИНТЕРФЕЙС' },
];

export function Settings() {
  const { settings, updateSettings, openSettings, setOpenSettings } = useSettings();
  const [tab, setTab] = useState<Tab>('playback');

  return (
    <AnimatePresence>
      {openSettings && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/50 z-30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpenSettings(false)}
          />
          <motion.div
            className="absolute inset-0 bg-[#1a1a1a] z-40 flex flex-col"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-[28px] bg-[#141414] border-b border-[#333] shrink-0">
              <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                НАСТРОЙКИ — AEMP
              </span>
              <button onClick={() => setOpenSettings(false)} className="text-[#666] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#333]">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 py-2 text-[9px] font-bold tracking-wider transition-colors border-b-2"
                  style={{
                    borderBottomColor: tab === t.id ? 'var(--accent)' : 'transparent',
                    color: tab === t.id ? '#fff' : '#555',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {tab === 'playback' && (
                <>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider">Затухание</p>
                  <SliderRow
                    label="Затухание в начале трека"
                    value={settings.fadeInMs} min={0} max={5000} step={100} unit=" мс"
                    onChange={v => updateSettings({ fadeInMs: v })}
                  />
                  <SliderRow
                    label="Затухание в конце трека"
                    value={settings.fadeOutMs} min={0} max={5000} step={100} unit=" мс"
                    onChange={v => updateSettings({ fadeOutMs: v })}
                  />
                  <p className="text-[10px] text-[#555] uppercase tracking-wider pt-2">Сведение</p>
                  <SliderRow
                    label="Сведение треков (кроссфейд)"
                    value={settings.crossfadeMs} min={0} max={10000} step={250} unit=" мс"
                    onChange={v => updateSettings({ crossfadeMs: v })}
                  />
                  {settings.crossfadeMs > 0 && (
                    <p className="text-[10px] text-[#555]">
                      Следующий трек начнётся за {(settings.crossfadeMs / 1000).toFixed(1)} сек до конца текущего
                    </p>
                  )}
                </>
              )}

              {tab === 'appearance' && (
                <>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider">Цвет акцента</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={e => updateSettings({ accentColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                      style={{ padding: 0 }}
                    />
                    <div className="flex-1">
                      <p className="text-[11px] text-[#ccc]">Выбрать произвольный цвет</p>
                      <p className="text-[10px] text-[#555] font-mono">{settings.accentColor.toUpperCase()}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#555] uppercase tracking-wider pt-1">Пресеты</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateSettings({ accentColor: color })}
                        className="w-8 h-8 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: color,
                          borderColor: settings.accentColor === color ? '#fff' : 'transparent',
                          transform: settings.accentColor === color ? 'scale(1.15)' : 'scale(1)',
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-[#222] border border-[#333] rounded-sm">
                    <p className="text-[10px] text-[#888] mb-2">Предпросмотр</p>
                    <div className="flex gap-2 items-center">
                      <div className="h-6 w-16 rounded-sm" style={{ backgroundColor: 'var(--accent)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>00:42</span>
                      <div className="flex-1 h-[3px] bg-[#333] rounded-full overflow-hidden">
                        <div className="h-full w-2/3" style={{ backgroundColor: 'var(--accent)' }} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === 'interface' && (
                <>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider">Видимость элементов</p>
                  <Toggle
                    label="Спектроанализатор"
                    value={settings.showSpectrum}
                    onChange={v => updateSettings({ showSpectrum: v })}
                  />
                  <Toggle
                    label="Обложка трека"
                    value={settings.showCoverArt}
                    onChange={v => updateSettings({ showCoverArt: v })}
                  />
                  <Toggle
                    label="Строка состояния"
                    value={settings.showStatusBar}
                    onChange={v => updateSettings({ showStatusBar: v })}
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
