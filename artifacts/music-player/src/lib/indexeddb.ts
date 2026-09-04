const DB_NAME = 'AEMP_DB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }
    };
  });
}

export interface StoredAudioFile {
  id: string;
  name: string;
  artist: string;
  duration: number;
  coverArt?: string;
  embeddedCoverArt?: string;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  fileSize: number;
  timestamp: number;
}

export async function saveAudioFile(
  id: string,
  file: File,
  metadata: { name: string; artist: string; duration: number; coverArt?: string; embeddedCoverArt?: string }
): Promise<void> {
  const db = await initDB();
  const arrayBuffer = await file.arrayBuffer();

  const storedFile: StoredAudioFile = {
    id,
    name: metadata.name,
    artist: metadata.artist,
    duration: metadata.duration,
    coverArt: metadata.coverArt,
    embeddedCoverArt: metadata.embeddedCoverArt,
    fileData: arrayBuffer,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(storedFile);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAudioFile(id: string): Promise<StoredAudioFile | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllAudioFiles(): Promise<StoredAudioFile[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteAudioFile(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearAllAudioFiles(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function arrayBufferToFile(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  fileType: string
): File {
  const blob = new Blob([arrayBuffer], { type: fileType });
  return new File([blob], fileName, { type: fileType });
}
