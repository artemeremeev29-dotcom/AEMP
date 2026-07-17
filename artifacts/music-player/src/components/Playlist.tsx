import React, { useRef, useState, DragEvent } from 'react';
import { usePlayer, Track } from '../context/PlayerContext';
import { Play, MoreVertical, ChevronLeft, Star, Settings, Plus, Search, FileText, Minus, ArrowUp, ArrowDown, LayoutGrid, ChevronsRight } from 'lucide-react';

function formatDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function Playlist() {
  const { playlist, currentTrackId, actions } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata'; // без этого метаданные не загружаются в некоторых браузерах
      const timeout = setTimeout(() => {
        audio.src = '';
        URL.revokeObjectURL(url);
        resolve(0);
      }, 4000);
      audio.onloadedmetadata = () => {
        clearTimeout(timeout);
        const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        audio.src = '';
        URL.revokeObjectURL(url);
        resolve(dur);
      };
      audio.onerror = () => {
        clearTimeout(timeout);
        audio.src = '';
        URL.revokeObjectURL(url);
        resolve(0);
      };
      audio.src = url;
    });
  };

  const processFiles = async (fileList: File[]) => {
    const allowedTypes = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a'];
    const validFiles = fileList.filter(f =>
      allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)) || f.type.startsWith('audio/')
    );

    if (validFiles.length === 0) return;

    const newTracks: Track[] = [];

    for (const file of validFiles) {
      try {
        const duration = await getDuration(file);
        const name = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");
        newTracks.push({
          id: crypto.randomUUID(),
          file,
          name,
          artist: "Неизвестный исполнитель",
          duration
        });
      } catch {}
    }

    if (newTracks.length > 0) {
      actions.addTracks(newTracks);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const totalTime = playlist.reduce((acc, t) => acc + t.duration, 0);

  return (
    <div 
      className={`flex-1 flex flex-col min-h-0 bg-[#2a2a2a] ${isDragging ? 'border-2 border-[#ff8c00]' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* BLOCK 4: Playlist Navigation */}
      <div className="h-[32px] shrink-0 bg-[#1e1e1e] flex items-center px-2 border-b border-[#3a3a3a] text-[#999] justify-between">
        <div className="flex items-center gap-2">
           <MoreVertical size={14} className="cursor-pointer hover:text-white" />
           <ChevronLeft size={16} className="cursor-pointer hover:text-white" />
        </div>
        <div className="text-[11px] uppercase tracking-wider font-bold text-[#888]">По умолчанию</div>
        <div className="bg-[#ff8c00] text-[#1e1e1e] text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-[#ffa500] shadow-sm">
           Default <Play size={8} className="fill-current" />
        </div>
      </div>

      {/* BLOCK 5: Playlist Info */}
      <div className="h-[28px] shrink-0 bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center justify-between px-3 text-[10px] text-[#888]">
        <div>
           {formatDuration(totalTime)} | {playlist.length} треков | ~{(playlist.length * 4.2).toFixed(1)} MB
        </div>
        <div className="flex gap-3">
           <Star size={12} className="cursor-pointer hover:text-[#ff8c00]" />
           <Settings size={12} className="cursor-pointer hover:text-[#ff8c00]" />
        </div>
      </div>

      {/* BLOCK 6: Playlist Items */}
      <div className="flex-1 overflow-y-auto bg-[#1e1e1e] text-[#ccc] text-xs">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept=".mp3,.flac,.wav,.ogg,.aac,.m4a,audio/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const files = Array.from(e.target.files);
              e.target.value = '';
              processFiles(files);
            }
          }}
        />

        {playlist.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50 p-8 text-center text-[#888]">
            <p>Перетащите аудиофайлы сюда или нажмите "+" внизу</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {playlist.map((track, i) => {
              const isPlaying = track.id === currentTrackId;
              const bgClass = i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#252525]';
              return (
                <div 
                  key={track.id}
                  onDoubleClick={() => actions.playTrack(track.id)}
                  className={`flex items-center h-[24px] px-2 cursor-pointer hover:bg-[#2f2f2f] select-none ${bgClass}`}
                >
                  <div className="w-6 flex justify-center shrink-0">
                    <input type="checkbox" className="accent-[#ff8c00] w-3 h-3 cursor-pointer" />
                  </div>
                  <div className="w-8 text-right pr-3 text-[#888] font-mono text-[10px] shrink-0">
                    {isPlaying ? <Play size={10} className="text-[#ff8c00] fill-current ml-auto" /> : i + 1}
                  </div>
                  <div className={`flex-1 truncate pr-2 ${isPlaying ? 'text-[#ff8c00]' : ''}`}>
                    {track.artist !== "Неизвестный исполнитель" ? <span className="font-bold">{track.artist} - </span> : ''}{track.name}
                  </div>
                  <div className={`w-12 text-right font-mono text-[10px] shrink-0 ${isPlaying ? 'text-[#ff8c00]' : 'text-[#888]'}`}>
                    {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCK 7: Bottom Panel */}
      <div className="h-[32px] shrink-0 bg-[#1e1e1e] border-t border-[#3a3a3a] flex items-center px-2 justify-between">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-[#cccccc] hover:text-[#ff8c00] p-1 border border-transparent hover:border-[#3a3a3a] bg-[#2a2a2a] flex items-center justify-center w-[24px] h-[24px] rounded-sm transition-colors"
          title="Добавить файлы"
        >
          <Plus size={16} />
        </button>
        <div className="flex gap-1.5 text-[#888] items-center">
           <button className="p-1 hover:text-[#cccccc]"><Minus size={14}/></button>
           <button className="p-1 hover:text-[#cccccc]"><ArrowUp size={14}/></button>
           <button className="p-1 hover:text-[#cccccc]"><ArrowDown size={14}/></button>
           <button className="p-1 hover:text-[#cccccc]"><LayoutGrid size={14}/></button>
           <div className="w-[1px] h-4 bg-[#3a3a3a] mx-1" />
           <div className="flex items-center gap-1 bg-[#141414] border border-[#3a3a3a] px-2 w-[120px] h-[22px]">
             <Search size={10} />
             <span className="text-[10px] opacity-50 truncate">Быстрый поиск...</span>
           </div>
           <button className="p-1 hover:text-[#cccccc]"><ChevronsRight size={14}/></button>
           <button className="p-1 hover:text-[#cccccc]"><FileText size={14}/></button>
        </div>
      </div>
    </div>
  );
}
