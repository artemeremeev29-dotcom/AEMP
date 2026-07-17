import React, { useRef, useState, DragEvent } from 'react';
import { usePlayer, Track } from '../context/PlayerContext';
import { Plus, X, Music2, Play } from 'lucide-react';

function formatDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function Playlist() {
  const { playlist, currentTrackId, audioState, actions, audioActions } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
      audio.onerror = () => resolve(0);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    // ensure interaction gesture triggers AudioContext init
    audioActions.initAudioContext();

    const allowedTypes = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a'];
    const validFiles = Array.from(files).filter(f => 
      allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)) || f.type.startsWith('audio/')
    );

    if (validFiles.length === 0) return;

    const newTracks: Track[] = [];
    
    for (const file of validFiles) {
      const duration = await getDuration(file);
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");

      newTracks.push({
        id: crypto.randomUUID(),
        file,
        name,
        artist: "Неизвестный исполнитель",
        duration
      });
    }

    actions.addTracks(newTracks);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`flex flex-col h-full bg-[#0d0d0d] border border-[#333] rounded-none overflow-hidden transition-colors ${isDragging ? 'border-accent bg-accent/5' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex justify-between items-center p-4 border-b border-[#333] bg-[#111]">
        <h2 className="text-sm font-bold text-accent tracking-widest uppercase">ПЛЕЙЛИСТ</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-xs font-bold bg-[#ff6a00] text-black border border-[#ff8c00] px-3 py-1.5 rounded-none hover:bg-[#ff8c00] uppercase transition-colors"
        >
          <Plus size={14} /> ДОБАВИТЬ ФАЙЛЫ
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept=".mp3,.flac,.wav,.ogg,.aac,.m4a,audio/*"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            // Reset input so same files can be added again if needed
            e.target.value = '';
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {playlist.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 p-8 text-center">
            <Music2 size={48} className="opacity-20" />
            <p className="text-sm">Перетащите аудиофайлы сюда<br/>или нажмите «ДОБАВИТЬ ФАЙЛЫ»</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left border-spacing-0 border-collapse">
            <thead>
              <tr className="text-xs text-accent uppercase tracking-wider border-b border-[#333]">
                <th className="p-2 w-8"></th>
                <th className="p-2">НАЗВАНИЕ</th>
                <th className="p-2">ИСПОЛНИТЕЛЬ</th>
                <th className="p-2 text-right font-mono">ВРЕМЯ</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {playlist.map((track, i) => {
                const isPlaying = track.id === currentTrackId;
                const rowBg = i % 2 === 0 ? 'bg-[#111]' : 'bg-[#0d0d0d]';
                return (
                  <tr 
                    key={track.id}
                    onDoubleClick={() => actions.playTrack(track.id)}
                    className={`group border-b border-[#333] hover:bg-[#1a1a1a] transition-colors select-none ${rowBg} ${isPlaying ? 'text-accent' : 'text-foreground'}`}
                  >
                    <td className="p-2 text-center text-muted-foreground w-8">
                      {isPlaying ? (
                        <span className="text-accent">▶</span>
                      ) : (
                        <span className="group-hover:hidden text-xs">{i + 1}</span>
                      )}
                      <Play 
                        size={12} 
                        className={`hidden ${!isPlaying ? 'group-hover:inline-block cursor-pointer text-muted-foreground hover:text-foreground' : ''}`}
                        onClick={() => actions.playTrack(track.id)}
                      />
                    </td>
                    <td className="p-2 font-medium truncate max-w-[200px]" title={track.name}>
                      {track.name}
                    </td>
                    <td className="p-2 text-muted-foreground truncate max-w-[150px]" title={track.artist}>
                      {track.artist}
                    </td>
                    <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="p-2 text-right w-8">
                      <button 
                        onClick={(e) => { e.stopPropagation(); actions.removeTrack(track.id); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
