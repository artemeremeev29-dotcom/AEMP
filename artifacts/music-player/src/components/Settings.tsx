import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Smartphone, AlignJustify, Circle, Activity, Square, Disc, Layers, Save, RotateCcw, Upload, GripVertical } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { CoverStyle, VisualizerStyle, ThemeMode, CustomSkin } from '../context/SettingsContext';

const PRESET_COLORS = ['#ff8c00','#ff4444','#ff44aa','#aa44ff','#4488ff','#44ccff','#44dd88','#cccc00'];
const SLEEP_OPTIONS = [15, 30, 45, 60, 90];

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-[11px] text-[var(--s-text)]">{label}</span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-[3px] cursor-pointer appearance-none"
        style={{ accentColor: 'var(--accent)', background: 'var(--s-track)' } as React.CSSProperties}
      />
      <div className="flex justify-between text-[9px]" style={{ color: 'var(--s-muted)' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, sub }: { label: string; value: boolean; onChange: (v: boolean) => void; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--s-divider)' }}>
      <div>
        <p className="text-[11px]" style={{ color: 'var(--s-text)' }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--s-muted)' }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className="w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0"
        style={{ backgroundColor: value ? 'var(--accent)' : 'var(--s-track)' }}
      >
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: value ? '22px' : '2px' }} />
      </button>
    </div>
  );
}

function OptionChip<T extends string>({ value, current, label, icon, onChange }: {
  value: T; current: T; label: string; icon?: React.ReactNode; onChange: (v: T) => void;
}) {
  const active = value === current;
  return (
    <button onClick={() => onChange(value)}
      className="flex flex-col items-center gap-1 px-3 py-2 rounded border transition-all text-[10px] font-bold"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--s-track)',
        color: active ? 'var(--accent)' : 'var(--s-muted)',
        backgroundColor: active ? 'rgba(var(--accent-rgb),0.08)' : 'transparent',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

type Tab = 'playback' | 'appearance' | 'skin' | 'interface';
const TABS: { id: Tab; label: string }[] = [
  { id: 'playback', label: 'ВОСПРОИЗВ.' },
  { id: 'appearance', label: 'ВИД' },
  { id: 'skin', label: 'СКИН' },
  { id: 'interface', label: 'ИНТЕРФЕЙС' },
];

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function Settings() {
  const { settings, updateSettings, openSettings, setOpenSettings, sleepSecondsLeft, setSleepTimer } = useSettings();
  const [tab, setTab] = useState<Tab>('playback');
  const [customDraft, setCustomDraft] = useState<CustomSkin>(settings.customSkin);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragTarget = useRef<'logo' | 'title' | null>(null);

  useEffect(() => {
    if (openSettings) setCustomDraft(settings.customSkin);
  }, [openSettings, settings.customSkin]);

  const updateDraft = (partial: Partial<CustomSkin>) => {
    setCustomDraft(prev => ({ ...prev, ...partial }));
  };

  const beginDrag = (target: 'logo' | 'title', event: React.PointerEvent<HTMLDivElement>) => {
    dragTarget.current = target;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDraggedItem = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragTarget.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(7, Math.min(93, ((event.clientY - rect.top) / rect.height) * 100));
    updateDraft(dragTarget.current === 'logo' ? { logoX: x, logoY: y } : { titleX: x, titleY: y });
  };

  const readTexture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        updateDraft({ textureDataUrl: canvas.toDataURL('image/jpeg', 0.78) });
      };
      if (typeof reader.result === 'string') image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const saveCustomSkin = () => {
    const saved = { ...customDraft, enabled: true };
    setCustomDraft(saved);
    updateSettings({ customSkin: saved, accentColor: saved.accentColor });
  };

  const resetCustomSkin = () => {
    const reset = { ...customDraft, enabled: false, textureDataUrl: '' };
    setCustomDraft(reset);
    updateSettings({ customSkin: reset });
  };

  return (
    <AnimatePresence>
      {openSettings && (
        <>
          <motion.div className="absolute inset-0 bg-black/50 z-30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpenSettings(false)} />

          <motion.div
            className="absolute inset-0 z-40 flex flex-col"
            style={{ backgroundColor: 'var(--s-bg)' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-[28px] border-b shrink-0"
              style={{ backgroundColor: 'var(--s-header)', borderColor: 'var(--s-divider)' }}>
              <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                НАСТРОЙКИ — AEMP
              </span>
              <button onClick={() => setOpenSettings(false)} style={{ color: 'var(--s-muted)' }} className="hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--s-divider)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 py-2 text-[9px] font-bold tracking-wider transition-colors border-b-2"
                  style={{
                    borderBottomColor: tab === t.id ? 'var(--accent)' : 'transparent',
                    color: tab === t.id ? 'var(--s-text)' : 'var(--s-muted)',
                  }}>{t.label}</button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* ── PLAYBACK ─────────────────────────────────────────── */}
              {tab === 'playback' && (<>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--s-muted)' }}>Затухание</p>
                <SliderRow label="Затухание в начале" value={settings.fadeInMs} min={0} max={5000} step={100} unit=" мс" onChange={v => updateSettings({ fadeInMs: v })} />
                <SliderRow label="Затухание в конце" value={settings.fadeOutMs} min={0} max={5000} step={100} unit=" мс" onChange={v => updateSettings({ fadeOutMs: v })} />
                <p className="text-[10px] uppercase tracking-wider pt-2" style={{ color: 'var(--s-muted)' }}>Сведение треков</p>
                <SliderRow label="Кроссфейд" value={settings.crossfadeMs} min={0} max={10000} step={250} unit=" мс" onChange={v => updateSettings({ crossfadeMs: v })} />

                {/* Sleep timer */}
                <p className="text-[10px] uppercase tracking-wider pt-2" style={{ color: 'var(--s-muted)' }}>Таймер сна</p>
                {sleepSecondsLeft !== null ? (
                  <div className="flex items-center justify-between p-3 rounded border" style={{ borderColor: 'var(--accent)', backgroundColor: 'rgba(var(--accent-rgb),0.08)' }}>
                    <div>
                      <p className="text-[11px]" style={{ color: 'var(--s-text)' }}>Музыка остановится через</p>
                      <p className="text-xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{formatSeconds(sleepSecondsLeft)}</p>
                    </div>
                    <button onClick={() => setSleepTimer(null)}
                      className="text-[10px] px-3 py-1 rounded border transition-colors"
                      style={{ borderColor: 'var(--s-track)', color: 'var(--s-muted)' }}>Отмена</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {SLEEP_OPTIONS.map(m => (
                      <button key={m} onClick={() => setSleepTimer(m)}
                        className="px-3 py-1.5 text-[11px] rounded border transition-colors"
                        style={{ borderColor: 'var(--s-track)', color: 'var(--s-text)', backgroundColor: 'var(--s-header)' }}>
                        {m} мин
                      </button>
                    ))}
                  </div>
                )}
              </>)}

              {/* ── APPEARANCE ──────────────────────────────────────── */}
              {tab === 'appearance' && (<>
                {/* Theme */}
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--s-muted)' }}>Тема</p>
                <div className="flex gap-2">
                  {([['dark','Тёмная',<Moon size={14}/>],['light','Светлая',<Sun size={14}/>],['auto','Авто',<Smartphone size={14}/>]] as [ThemeMode,string,React.ReactNode][]).map(([v,l,ic])=>(
                    <OptionChip key={v} value={v} current={settings.theme} label={l} icon={ic} onChange={v => updateSettings({ theme: v })} />
                  ))}
                </div>

                {/* Accent color */}
                <p className="text-[10px] uppercase tracking-wider pt-2" style={{ color: 'var(--s-muted)' }}>Цвет акцента</p>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.accentColor} onChange={e => updateSettings({ accentColor: e.target.value })}
                    className="w-10 h-10 cursor-pointer border-0 bg-transparent rounded" style={{ padding: 0 }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--s-muted)' }}>{settings.accentColor.toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => updateSettings({ accentColor: c })}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: settings.accentColor === c ? '#fff' : 'transparent', transform: settings.accentColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                  ))}
                </div>

                {/* Visualizer style */}
                <p className="text-[10px] uppercase tracking-wider pt-2" style={{ color: 'var(--s-muted)' }}>Стиль визуализатора</p>
                <div className="flex gap-2">
                  {([['bars','Столбики',<AlignJustify size={14}/>],['circle','Круг',<Circle size={14}/>],['wave','Волна',<Activity size={14}/>]] as [VisualizerStyle,string,React.ReactNode][]).map(([v,l,ic])=>(
                    <OptionChip key={v} value={v} current={settings.visualizerStyle} label={l} icon={ic} onChange={v => updateSettings({ visualizerStyle: v })} />
                  ))}
                </div>

                {/* Cover art style */}
                <p className="text-[10px] uppercase tracking-wider pt-2" style={{ color: 'var(--s-muted)' }}>Стиль обложки</p>
                <div className="flex gap-2">
                  {([['square','Квадрат',<Square size={14}/>],['vinyl','Винил',<Disc size={14}/>],['blur','Размытый фон',<Layers size={14}/>]] as [CoverStyle,string,React.ReactNode][]).map(([v,l,ic])=>(
                    <OptionChip key={v} value={v} current={settings.coverStyle} label={l} icon={ic} onChange={v => updateSettings({ coverStyle: v })} />
                  ))}
                </div>

                {/* Preview */}
                <div className="p-3 rounded border mt-2" style={{ backgroundColor: 'var(--s-header)', borderColor: 'var(--s-divider)' }}>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--s-muted)' }}>Предпросмотр акцента</p>
                  <div className="flex gap-2 items-center">
                    <div className="h-6 w-14 rounded-sm" style={{ backgroundColor: 'var(--accent)' }} />
                    <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>00:42</span>
                    <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--s-track)' }}>
                      <div className="h-full w-2/3" style={{ backgroundColor: 'var(--accent)' }} />
                    </div>
                  </div>
                </div>
              </>)}

              {/* ── CUSTOM SKIN ───────────────────────────────────────── */}
              {tab === 'skin' && (<>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--s-muted)' }}>Редактор скина AEMP</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--s-muted)' }}>Перетаскивайте AE и заголовок прямо в макете.</p>
                  </div>
                  <span className="text-[9px] px-2 py-1 rounded border" style={{
                    color: customDraft.enabled ? 'var(--accent)' : 'var(--s-muted)',
                    borderColor: customDraft.enabled ? 'var(--accent)' : 'var(--s-track)',
                  }}>{customDraft.enabled ? 'АКТИВЕН' : 'ЧЕРНОВИК'}</span>
                </div>

                <input
                  value={customDraft.name}
                  onChange={e => updateDraft({ name: e.target.value })}
                  className="w-full px-2 py-2 rounded border bg-transparent text-[11px] outline-none"
                  style={{ color: 'var(--s-text)', borderColor: 'var(--s-track)' }}
                  placeholder="Название скина"
                />

                <div
                  ref={stageRef}
                  className="aemp-skin-editor-stage"
                  style={{
                    backgroundColor: customDraft.backgroundColor,
                    backgroundImage: customDraft.textureDataUrl ? `url(${customDraft.textureDataUrl})` : undefined,
                    backgroundSize: 'cover',
                  }}
                  onPointerMove={moveDraggedItem}
                  onPointerUp={() => { dragTarget.current = null; }}
                  onPointerCancel={() => { dragTarget.current = null; }}
                >
                  <div
                    className="aemp-skin-editor-item px-2 py-1 rounded border-2 text-3xl"
                    style={{
                      left: `${customDraft.logoX}%`,
                      top: `${customDraft.logoY}%`,
                      transform: `translate(-50%, -50%) scale(${customDraft.logoScale})`,
                      color: customDraft.textColor,
                      borderColor: customDraft.accentColor,
                      textShadow: '0 2px 8px rgba(0,0,0,.6)',
                    }}
                    onPointerDown={e => beginDrag('logo', e)}
                    onPointerMove={moveDraggedItem}
                    title="Перетащить AE"
                  >
                    <span className="font-black tracking-[-0.16em]">AE</span>
                    <GripVertical size={11} className="inline-block ml-1 opacity-60" />
                  </div>
                  <div
                    className="aemp-skin-editor-item text-[10px] font-bold tracking-[0.35em]"
                    style={{ left: `${customDraft.titleX}%`, top: `${customDraft.titleY}%`, color: customDraft.textColor }}
                    onPointerDown={e => beginDrag('title', e)}
                    onPointerMove={moveDraggedItem}
                    title="Перетащить заголовок"
                  >AEMP PLAYER</div>
                  <div className="absolute bottom-3 left-4 right-4 h-1 rounded-full" style={{ backgroundColor: customDraft.accentColor, opacity: 0.8 }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Фон', 'backgroundColor'],
                    ['Панели', 'panelColor'],
                    ['Акцент', 'accentColor'],
                    ['Текст', 'textColor'],
                  ] as [string, keyof CustomSkin][]).map(([label, key]) => (
                    <label key={key} className="flex items-center justify-between gap-2 text-[10px]" style={{ color: 'var(--s-text)' }}>
                      {label}
                      <input
                        type="color"
                        value={customDraft[key] as string}
                        onChange={e => updateDraft({ [key]: e.target.value } as Partial<CustomSkin>)}
                        className="w-8 h-7 cursor-pointer border-0 bg-transparent p-0"
                      />
                    </label>
                  ))}
                </div>

                <SliderRow label="Размер AE" value={customDraft.logoScale} min={0.5} max={2} step={0.05} unit="×"
                  onChange={value => updateDraft({ logoScale: value })} />
                <SliderRow label="Прозрачность текстуры" value={Math.round(customDraft.textureOpacity * 100)} min={0} max={100} step={1} unit="%"
                  onChange={value => updateDraft({ textureOpacity: value / 100 })} />

                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border cursor-pointer text-[10px]"
                    style={{ color: 'var(--s-text)', borderColor: 'var(--s-track)' }}>
                    <Upload size={13} /> Загрузить текстуру
                    <input type="file" accept="image/*" className="hidden" onChange={readTexture} />
                  </label>
                  {customDraft.textureDataUrl && (
                    <button onClick={() => updateDraft({ textureDataUrl: '' })} className="p-2 rounded border text-[var(--s-muted)]"
                      style={{ borderColor: 'var(--s-track)' }} title="Убрать текстуру"><X size={13} /></button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={saveCustomSkin}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-[10px] font-bold"
                    style={{ backgroundColor: customDraft.accentColor, color: '#171717' }}>
                    <Save size={13} /> Сохранить в память телефона
                  </button>
                  <button onClick={resetCustomSkin}
                    className="px-3 py-2 rounded border text-[10px]"
                    style={{ borderColor: 'var(--s-track)', color: 'var(--s-muted)' }} title="Отключить пользовательский скин">
                    <RotateCcw size={13} />
                  </button>
                </div>
              </>)}

              {/* ── INTERFACE ───────────────────────────────────────── */}
              {tab === 'interface' && (<>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--s-muted)' }}>Видимость элементов</p>
                <Toggle label="Спектроанализатор" value={settings.showSpectrum} onChange={v => updateSettings({ showSpectrum: v })} />
                <Toggle label="Обложка трека" value={settings.showCoverArt} onChange={v => updateSettings({ showCoverArt: v })} />
                <Toggle label="Строка состояния" value={settings.showStatusBar} onChange={v => updateSettings({ showStatusBar: v })} />
              </>)}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
