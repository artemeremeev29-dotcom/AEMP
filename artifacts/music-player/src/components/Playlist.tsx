import React, { useEffect, useState } from 'react';

// === 1. Вспомогательные функции для работы с IndexedDB ===
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AEMP_Database', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveTrackToIDB = async (track: { id: string; name: string; file: File }) => {
  const db = await openDB();
  const tx = db.transaction('tracks', 'readwrite');
  const store = tx.objectStore('tracks');
  store.put(track);
};

const loadTracksFromIDB = async () => {
  const db = await openDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// === 2. Основной компонент Плейлиста ===
export const Playlist = () => {
  const [playlist, setPlaylist] = useState<any[]>([]);

  // Загружаем сохраненные треки из локальной памяти при старте
  useEffect(() => {
    loadTracksFromIDB().then((savedTracks) => {
      if (savedTracks && savedTracks.length > 0) {
        setPlaylist(savedTracks);
      }
    });
  }, []);

  // Функция добавления файлов с устройства
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newTracks = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      file: file,
    }));

    for (const track of newTracks) {
      await saveTrackToIDB(track);
    }

    setPlaylist((prev) => [...prev, ...newTracks]);
  };

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#1a1a1a' }}>
      <h2>Плейлист AEMP</h2>
      <input type="file" multiple accept="audio/*" onChange={handleFileUpload} />
      <ul>
        {playlist.map((track) => (
          <li key={track.id} style={{ margin: '8px 0', color: '#FF8C00' }}>
            🎵 {track.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
