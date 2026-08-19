import React, { useRef, useState, DragEvent } from 'react';
import { usePlayer, Track } from '../context/PlayerContext';
import { useSettings } from '../context/SettingsContext';
import { Play, Plus, Search, FileText, Minus, ArrowUp, ArrowDown, LayoutGrid, ChevronsRight, MoreVertical, ChevronLeft, Star, Settings } from 'lucide-react';

// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

function formatDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const timeout = setTimeout(() => { audio.src = ''; URL.revokeObjectURL(url); resolve(0); }, 4000);
    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      audio.src = ''; URL.revokeObjectURL(url); resolve(dur);
    };
    audio.onerror = () => { clearTimeout(timeout); audio.src = ''; URL.revokeObjectURL(url); resolve(0); };
    audio.src = url;
  });
}

function getMetadata(file: File): Promise<{ name: string; artist: string; coverArt?: string }> {
  return new Promise((resolve) => {
    const fallback = {
      name: file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' '),
      artist: 'Неизвестный исполнитель',
    };
    try {
      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          const tags = tag.tags || {};
          const name = tags.title || fallback.name;
          const artist = tags.artist || fallback.artist;
          let coverArt: string | undefined;
          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              const bytes = new Uint8Array(data);
              let binary = '';
              bytes.forEach(b => { binary += String.fromCharCode(b); });
              coverArt = `data:${format};base64,${btoa(binary)}`;
            } catch (_) {}
          }
          resolve({ name, artist, coverArt });
        },
        onError: () => resolve(fallback),
      });
    } catch (_) {
      resolve(fallback);
    }
  });
}

export function Playlist() {
  const { playlist, currentTrackId, queueIds, actions } = usePlayer();
  const { setOpenSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [contextTrackId, setContextTrackId] = useState<string | null>(null);
  const [compactRows, setCompactRows] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('aemp-favorites') || '[]'));
    } catch (_) {
      return new Set();
    }
  });

  const processFiles = async (fileList: File[]) => {
    const allowedTypes = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a'];
    const validFiles = fileList.filter(f =>
      allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)) || f.type.startsWith('audio/')
    );
    if (validFiles.length === 0) return;

    const newTracks: Track[] = [];
    for (const file of validFiles) {
      try {
        const [duration, meta] = await Promise.all([getDuration(file), getMetadata(file)]);
        newTracks.push({
          id: crypto.randomUUID(),
          file,
          name: meta.name,
          artist: meta.artist,
          duration,
          coverArt: meta.coverArt,
          embeddedCoverArt: meta.coverArt,
        });
      } catch {}
    }
    if (newTracks.length > 0) actions.addTracks(newTracks);
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const filteredPlaylist = playlist.filter(track => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${track.artist} ${track.name}`.toLowerCase().includes(query);
  });

  const toggleFavorite = () => {
    if (!currentTrackId) return;
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(currentTrackId)) next.delete(currentTrackId);
      else next.add(currentTrackId);
      localStorage.setItem('aemp-favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const exportPlaylist = () => {
    if (playlist.length === 0) return;
    const content = playlist
      .map(track => `${track.artist !== 'Неизвестный исполнитель' ? `${track.artist} — ` : ''}${track.name}`)
      .join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AEMP-плейлист.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setContextTrackId(null);
  };

  const totalDuration = playlist.reduce((a, t) => a + (t.duration || 0), 0);
  const totalMb = playlist.reduce((a, t) => a + t.file.size, 0) / (1024 * 1024);
  const contextTrack = playlist.find(track => track.id === contextTrackId);
  const queuedTracks = queueIds
    .map(id => playlist.find(track => track.id === id))
    .filter((track): track is Track => Boolean(track));

  return (
    <div className="aemp-playlist relative flex flex-col h-full bg-[#222] select-none">
      {/* Playlist header */}
      <div className="aemp-playlist-header h-[30px] shrink-0 bg-[#1e1e1e] border-b border-[#333] flex items-center px-2 gap-2">
        <button
          onClick={() => setShowMenu(value => !value)}
          className="text-[#666] hover:text-[#ccc] transition-colors"
          title="Меню плейлиста"
        ><MoreVertical size={13} /></button>
        <button
          onClick={clearSearch}
          className="text-[#666] hover:text-[#ccc] transition-colors"
          title="Сбросить поиск"
        ><ChevronLeft size={13} /></button>
        <span className="flex-1 text-center text-[11px] text-[#999] truncate">ПО УМОЛЧАНИЮ</span>
        <button
          onClick={() => setShowMenu(value => !value)}
          className="text-[11px] font-bold px-2 py-0.5 rounded-sm text-[#1e1e1e]"
          style={{ backgroundColor: 'var(--accent)' }}
          title="Меню плейлиста"
        >Default ▶</button>
      </div>

      {showMenu && (
        <div className="absolute top-[30px] left-1 z-30 min-w-[170px] bg-[#181818] border border-[#444] shadow-xl py-1 text-[11px]">
          <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="aemp-menu-item">Добавить файлы</button>
          <button onClick={() => { setShowQueue(true); setShowMenu(false); }} className="aemp-menu-item">Открыть очередь ({queueIds.length})</button>
          <button onClick={() => { setCompactRows(value => !value); setShowMenu(false); }} className="aemp-menu-item">
            {compactRows ? 'Обычный размер строк' : 'Компактный размер строк'}
          </button>
          <button onClick={() => { exportPlaylist(); setShowMenu(false); }} className="aemp-menu-item">Экспортировать список</button>
          <button
            onClick={() => { actions.clearPlaylist(); setShowMenu(false); }}
            className="aemp-menu-item text-red-400"
            disabled={playlist.length === 0}
          >Очистить плейлист</button>
        </div>
      )}

      {/* Stats */}
      <div className="aemp-playlist-stats h-[24px] shrink-0 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center px-3 justify-between">
        <span className="text-[10px] text-[#666] font-mono">
          {formatDuration(totalDuration)} | {playlist.length} {playlist.length === 1 ? 'трек' : playlist.length < 5 ? 'трека' : 'треков'} | ~{totalMb.toFixed(1)} МБ
        </span>
        <div className="flex gap-2">
          <button
            onClick={toggleFavorite}
            className="transition-colors"
            style={{ color: currentTrackId && favoriteIds.has(currentTrackId) ? 'var(--accent)' : '#555' }}
            title="Добавить текущий трек в избранное"
          ><Star size={11} className={currentTrackId && favoriteIds.has(currentTrackId) ? 'fill-current' : ''} /></button>
          <button onClick={() => setOpenSettings(true)} className="text-[#555] hover:text-[#999]" title="Настройки">
            <Settings size={11} />
          </button>
        </div>
      </div>

      {/* Track list */}
      <div
        className={`relative flex-1 overflow-y-auto overflow-x-hidden min-h-0 transition-colors ${isDragging ? 'bg-[#2a2a2a]' : ''}`}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      >
        {playlist.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center opacity-50 p-8 text-center text-[#888]">
            <p>Перетащите аудиофайлы сюда или нажмите "+" внизу</p>
          </div>
        ) : filteredPlaylist.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-center text-[#666] text-[11px]">
            Ничего не найдено
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredPlaylist.map((track, i) => {
              const isActive = track.id === currentTrackId;
              const bgClass = i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#252525]';
              return (
                <div
                  key={track.id}
                  onClick={() => actions.playTrack(track.id)}
                  onContextMenu={event => {
                    event.preventDefault();
                    setContextTrackId(track.id);
                  }}
                  className={`aemp-track-row flex items-center ${compactRows ? 'h-[20px]' : 'h-[24px]'} px-2 cursor-pointer hover:bg-[#2f2f2f] ${bgClass}`}
                >
                  <div className="w-5 flex justify-center shrink-0">
                    {isActive
                      ? <Play size={9} style={{ color: 'var(--accent)' }} className="fill-current" />
                      : <span className="text-[10px] text-[#555] font-mono">{i + 1}</span>
                    }
                  </div>
                  {/* Mini cover art thumbnail */}
                  {track.coverArt ? (
                    <img src={track.coverArt} className="w-4 h-4 object-cover shrink-0 mr-1.5 opacity-90" alt="" />
                  ) : (
                    <div className="w-4 h-4 bg-[#333] shrink-0 mr-1.5" />
                  )}
                  <div
                    className="flex-1 truncate pr-2 text-[11px]"
                    style={isActive ? { color: 'var(--accent)' } : {}}
                  >
                    {track.artist !== 'Неизвестный исполнитель'
                      ? <><span className="font-semibold">{track.artist}</span>{' — '}{track.name}</>
                      : track.name
                    }
                  </div>
                  <div
                    className="w-10 text-right font-mono text-[10px] shrink-0"
                    style={isActive ? { color: 'var(--accent)' } : { color: '#555' }}
                  >
                    {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {contextTrack && (
          <div className="absolute top-1 right-1 z-20 min-w-[190px] bg-[#181818] border border-[#444] shadow-xl py-1 text-[11px]">
            <div className="px-3 py-1 text-[#777] truncate border-b border-[#333]">{contextTrack.name}</div>
            <button onClick={() => { actions.queueNext(contextTrack.id); setContextTrackId(null); }} className="aemp-menu-item">Слушать следующим</button>
            <button onClick={() => { actions.playTrack(contextTrack.id); setContextTrackId(null); }} className="aemp-menu-item">Воспроизвести сейчас</button>
            <button onClick={() => { actions.removeTrack(contextTrack.id); setContextTrackId(null); }} className="aemp-menu-item text-red-400">Удалить из плейлиста</button>
            <button onClick={() => setContextTrackId(null)} className="aemp-menu-item">Закрыть</button>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="aemp-playlist-toolbar h-[30px] shrink-0 bg-[#1a1a1a] border-t border-[#333] flex items-center px-2 gap-1">
        <button onClick={() => fileInputRef.current?.click()} className="text-[#666] hover:text-[#ccc] p-1 transition-colors" title="Добавить файлы">
          <Plus size={14} />
        </button>
        <button onClick={() => { const t = playlist.find(t => t.id === currentTrackId); if (t) actions.removeTrack(t.id); }} className="text-[#666] hover:text-[#ccc] p-1 transition-colors" title="Удалить выбранный">
          <Minus size={14} />
        </button>
        <button onClick={() => { const i = playlist.findIndex(t => t.id === currentTrackId); if (i > 0) actions.reorderPlaylist(i, i - 1); }} className="text-[#666] hover:text-[#ccc] p-1 transition-colors">
          <ArrowUp size={14} />
        </button>
        <button onClick={() => { const i = playlist.findIndex(t => t.id === currentTrackId); if (i >= 0 && i < playlist.length - 1) actions.reorderPlaylist(i, i + 1); }} className="text-[#666] hover:text-[#ccc] p-1 transition-colors">
          <ArrowDown size={14} />
        </button>
        <button
          onClick={() => setCompactRows(value => !value)}
          className="aemp-optional-tool text-[#666] hover:text-[#ccc] p-1 transition-colors"
          title="Размер строк"
        ><LayoutGrid size={14} /></button>
        <div className="flex-1 flex items-center gap-1 mx-1">
          <Search size={11} className="text-[#444]" />
          <input
            type="text" placeholder="Быстрый поиск..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="flex-1 bg-transparent text-[10px] text-[#aaa] placeholder-[#444] outline-none"
          />
        </div>
        <button
          onClick={() => setShowQueue(value => !value)}
          className="aemp-optional-tool text-[#666] hover:text-[#ccc] p-1 transition-colors"
          style={{ color: showQueue || queueIds.length > 0 ? 'var(--accent)' : undefined }}
          title="Очередь"
        ><ChevronsRight size={14} /></button>
        <button onClick={exportPlaylist} className="aemp-optional-tool text-[#666] hover:text-[#ccc] p-1 transition-colors" title="Экспортировать плейлист">
          <FileText size={14} />
        </button>
      </div>

      {showQueue && (
        <div className="absolute bottom-[30px] right-1 z-30 w-[min(270px,calc(100%-8px))] bg-[#181818] border border-[#444] shadow-xl text-[11px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#333]">
            <span className="font-bold" style={{ color: 'var(--accent)' }}>ОЧЕРЕДЬ ({queuedTracks.length})</span>
            <div className="flex gap-2">
              <button onClick={actions.clearQueue} className="text-[#777] hover:text-white">Очистить</button>
              <button onClick={() => setShowQueue(false)} className="text-[#777] hover:text-white">×</button>
            </div>
          </div>
          {queuedTracks.length === 0 ? (
            <div className="p-3 text-[#666]">Очередь пуста. Нажми правой кнопкой на трек.</div>
          ) : (
            queuedTracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#292929]">
                <span className="text-[#666]">{index + 1}</span>
                <span className="flex-1 truncate">{track.artist !== 'Неизвестный исполнитель' ? `${track.artist} — ` : ''}{track.name}</span>
                <button onClick={() => actions.removeFromQueue(track.id)} className="text-[#777] hover:text-red-400" title="Убрать из очереди">×</button>
              </div>
            ))
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept="audio/*" className="hidden" onChange={onFileInput} />
    </div>
  );
}
