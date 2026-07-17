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
        artist: "Unknown Artist",
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
      className={`flex flex-col h-full bg-card border border-border rounded-lg shadow-xl overflow-hidden transition-colors ${isDragging ? 'border-accent bg-accent/5' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex justify-between items-center p-4 border-b border-border bg-background/50">
        <h2 className="text-sm font-bold text-foreground tracking-widest uppercase">Playlist</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-accent transition-colors"
        >
          <Plus size={14} /> Add Files
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
            <p className="text-sm">Drag and drop audio files here<br/>or click "Add Files"</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left border-spacing-0 border-collapse">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="p-2 w-8"></th>
                <th className="p-2">Title</th>
                <th className="p-2">Artist</th>
                <th className="p-2 text-right font-mono">Time</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {playlist.map((track, i) => {
                const isPlaying = track.id === currentTrackId;
                return (
                  <tr 
                    key={track.id}
                    onDoubleClick={() => actions.playTrack(track.id)}
                    className={`group border-b border-border/50 hover:bg-background/80 transition-colors select-none ${isPlaying ? 'bg-accent/10 text-accent' : 'text-foreground'}`}
                  >
                    <td className="p-2 text-center text-muted-foreground w-8">
                      {isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-3">
                          <div className={`w-1 bg-accent ${audioState.isPlaying ? 'animate-[bounce_0.8s_infinite]' : ''} h-full`}></div>
                          <div className={`w-1 bg-accent ${audioState.isPlaying ? 'animate-[bounce_1.2s_infinite]' : ''} h-2/3`}></div>
                          <div className={`w-1 bg-accent ${audioState.isPlaying ? 'animate-[bounce_1s_infinite]' : ''} h-full`}></div>
                        </div>
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
