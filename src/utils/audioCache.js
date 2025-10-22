const DB_NAME = 'freetify-audio-cache';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

function openDatabase() {
  if (!isBrowser) {
    return Promise.reject(new Error('IndexedDB no está disponible'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const canUseAudioCache = isBrowser;

export async function saveTrackBlob(cacheKey, blob, contentType) {
  if (!isBrowser) return;

  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ blob, contentType, updatedAt: Date.now() }, cacheKey);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      const { error } = tx;
      db.close();
      reject(error);
    };
  });
}

export async function getTrackRecord(cacheKey) {
  if (!isBrowser) return null;

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(cacheKey);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };

    tx.onerror = () => {
      const { error } = tx;
      db.close();
      reject(error);
    };
  });
}

export async function deleteTrack(cacheKey) {
  if (!isBrowser) return;

  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(cacheKey);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      const { error } = tx;
      db.close();
      reject(error);
    };
  });
}

export async function clearAudioCache() {
  if (!isBrowser) return;

  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      const { error } = tx;
      db.close();
      reject(error);
    };
  });
}
