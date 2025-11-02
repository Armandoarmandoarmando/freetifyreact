/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { requestTrackStream, fetchCachedTrack, fetchRecommendations } from '../api';
import { canUseAudioCache, getTrackRecord, saveTrackBlob } from '../utils/audioCache';

const PlayerContext = createContext(null);

const CACHE_MAP_STORAGE_KEY = 'freetify_track_cache_map';
const VOLUME_STORAGE_KEY = 'freetify_player_volume';
const MAX_PREFETCH_AHEAD = 3;

const loadCacheMap = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_MAP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('No se pudo cargar el mapa de cache local', error);
    return {};
  }
};

const persistCacheMap = (map) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_MAP_STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('No se pudo guardar el mapa de cache local', error);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const API_URL = import.meta.env.VITE_API_URL;

const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const trackKey = (track) => (
  track?.spotify_track_id
  || track?.spotifyTrackId
  || track?.id
  || track?.nombre
  || track?.title
  || null
);

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const objectUrlRef = useRef(null);
  const playSessionRef = useRef(0);
  const playNextRef = useRef(() => {});
  const queueRef = useRef([]);
  const originalQueueRef = useRef([]);
  const queueIndexRef = useRef(-1);
  const cacheMapRef = useRef({});
  const prefetchingRef = useRef(new Set());
  const lastRecommendationSeedRef = useRef(null);
  const repeatModeRef = useRef('off');

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [cacheMap, setCacheMap] = useState(() => loadCacheMap());
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, updateRepeatMode] = useState('off');
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    const parsed = stored !== null ? Number.parseFloat(stored) : Number.NaN;
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed));
    }
    return 1;
  });

  useEffect(() => {
    cacheMapRef.current = cacheMap;
  }, [cacheMap]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
    const audio = audioRef.current;
    if (audio) {
      audio.loop = repeatMode === 'track';
    }
  }, [repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  const updateCacheMap = useCallback((spotifyTrackId, cacheKey) => {
    if (!spotifyTrackId || !cacheKey) return;
    setCacheMap((prev) => {
      if (prev[spotifyTrackId] === cacheKey) {
        return prev;
      }
      const next = { ...prev, [spotifyTrackId]: cacheKey };
      persistCacheMap(next);
      return next;
    });
  }, []);

  const updateQueueState = useCallback((updater) => {
    setQueue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater || [];
      queueRef.current = next;
      return next;
    });
  }, []);

  const updateQueueIndex = useCallback((value) => {
    setQueueIndex((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      queueIndexRef.current = next;
      return next;
    });
  }, []);

  const refreshOriginalQueueSnapshot = useCallback(() => {
    originalQueueRef.current = queueRef.current.map((item) => ({ ...item }));
  }, []);

  const normalizeTrack = useCallback((track) => {
    if (!track) return null;

    const nombre = track.nombre || track.title || track.name || '';
    const rawArtists = track.artistas || track.artists || (track.artista ? [track.artista] : track.artist ? [track.artist] : []);
    const artistas = Array.isArray(rawArtists)
      ? rawArtists.filter(Boolean)
      : rawArtists
        ? [rawArtists].filter(Boolean)
        : [];
    const album = track.album || track.albumName || (track.album && track.album.name) || null;
    const albumImages = track.album && track.album.images ? track.album.images : [];
    const imagen = track.imagen || track.image || (albumImages[0] && albumImages[0].url) || track.cover || null;
    const spotifyTrackId = track.spotify_track_id || track.spotifyTrackId || track.id || null;
    const durationMs = track.duration_ms ?? (
      typeof track.duracion === 'number'
        ? Math.round(track.duracion * 1000)
        : typeof track.duration === 'number'
          ? Math.round(track.duration * 1000)
          : undefined
    );

    return {
      nombre,
      artistas,
      album,
      imagen,
      spotify_track_id: spotifyTrackId,
      duration_ms: durationMs,
      duracion: typeof durationMs === 'number' ? durationMs / 1000 : track.duracion,
      url: track.url || null,
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    const handlePlay = () => setStatus('playing');
    const handlePause = () => {
      setStatus((prev) => (prev === 'loading' ? 'loading' : 'paused'));
    };
    const handleEnded = () => {
      const mode = repeatModeRef.current;
      if (mode === 'track') {
        setStatus('loading');
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.warn('No se pudo repetir la canción automáticamente', err);
          setStatus('error');
        });
        return;
      }
      playNextRef.current?.();
    };
    const handleTimeUpdate = () => {
      setProgress({
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
    const handleLoadedMetadata = () => {
      setProgress({
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
    const handleError = () => {
      setError('No se pudo reproducir la canción');
      setStatus('error');
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const startPlaybackWithBlob = useCallback(async ({ blob, contentType, trackMeta }) => {
    const audio = audioRef.current;
    if (!audio) throw new Error('Reproductor no disponible');

    const objectUrl = URL.createObjectURL(blob);
    revokeObjectUrl();
    objectUrlRef.current = objectUrl;
    audio.pause();
    audio.src = '';
    audio.load();
    audio.src = objectUrl;
    if (contentType) {
      audio.type = contentType;
    }

    setCurrentTrack(trackMeta);
    setStatus('loading');
    setError(null);
    setProgress({ currentTime: 0, duration: 0 });

    try {
      await audio.play();
    } catch (playError) {
      setError('Necesitas interactuar para reproducir audio');
      setStatus('error');
      throw playError;
    }
  }, [revokeObjectUrl]);

  const waitForCachedBlob = useCallback(async (cacheKey, fallbackContentType) => {
    if (!cacheKey) return null;

    const maxAttempts = 8;
    const baseDelay = 600;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetchCachedTrack(cacheKey);
        if (response) {
          const blob = await response.blob();
          const contentType = response.headers.get('Content-Type') || fallbackContentType;
          await saveTrackBlob(cacheKey, blob, contentType);
          return { blob, contentType };
        }
      } catch (err) {
        console.warn('Error consultando caché remota', err);
      }

      await sleep(baseDelay + attempt * 350);
    }

    return null;
  }, []);

  const prefetchTrack = useCallback(async (track) => {
    const normalized = normalizeTrack(track);
    if (!normalized) return;

    const uniqueKey = trackKey(normalized);
    if (!uniqueKey || prefetchingRef.current.has(uniqueKey)) {
      return;
    }

    prefetchingRef.current.add(uniqueKey);
    try {
      const response = await requestTrackStream({
        trackName: normalized.nombre,
        artists: normalized.artistas,
        album: normalized.album,
        spotifyTrackId: normalized.spotify_track_id,
        durationMs: normalized.duration_ms,
      });

      if (response?.cache_key && normalized.spotify_track_id) {
        updateCacheMap(normalized.spotify_track_id, response.cache_key);
      }

      if (response?.cache_key) {
        await waitForCachedBlob(response.cache_key, response.content_type);
      }
    } catch (err) {
      console.warn('No se pudo predescargar la canción', err);
    } finally {
      prefetchingRef.current.delete(uniqueKey);
    }
  }, [normalizeTrack, updateCacheMap, waitForCachedBlob]);

  const prefetchUpcomingTracks = useCallback((startIndex = 0) => {
    const snapshot = queueRef.current;
    if (!snapshot.length) return;

    for (let idx = startIndex; idx < snapshot.length && idx < startIndex + MAX_PREFETCH_AHEAD; idx += 1) {
      const candidate = snapshot[idx];
      if (!candidate) continue;
      prefetchTrack(candidate);
    }
  }, [prefetchTrack]);

  const setQueueTracks = useCallback((tracks, startAt = 0) => {
    const normalized = [];
    (tracks || []).forEach((item) => {
      const normalizedItem = normalizeTrack(item);
      if (normalizedItem) {
        normalized.push({ ...item, ...normalizedItem });
      }
    });

    if (!normalized.length) {
      updateQueueState([]);
      updateQueueIndex(-1);
      originalQueueRef.current = [];
      lastRecommendationSeedRef.current = null;
      return;
    }

    const safeIndex = Math.max(0, Math.min(startAt, normalized.length - 1));
    updateQueueState(normalized);
    updateQueueIndex(safeIndex);
    refreshOriginalQueueSnapshot();
    lastRecommendationSeedRef.current = null;
    prefetchUpcomingTracks(safeIndex + 1);
  }, [normalizeTrack, prefetchUpcomingTracks, refreshOriginalQueueSnapshot, updateQueueIndex, updateQueueState]);

  const enqueueRecommendations = useCallback(async (seedTrack, { limit = 10 } = {}) => {
    if (!seedTrack?.spotify_track_id) {
      return;
    }

    if (lastRecommendationSeedRef.current === seedTrack.spotify_track_id) {
      return;
    }

    try {
      const response = await fetchRecommendations(seedTrack.spotify_track_id, limit);
      const rawList = Array.isArray(response?.body) ? response.body : Array.isArray(response?.tracks) ? response.tracks : [];
      if (!rawList.length) {
        lastRecommendationSeedRef.current = seedTrack.spotify_track_id;
        return;
      }

      const normalizedList = rawList
        .map((item) => normalizeTrack(item))
        .filter(Boolean)
        .map((item, index) => ({ ...rawList[index], ...item }));

      const existingQueue = queueRef.current.length ? [...queueRef.current] : [seedTrack];
      const currentIdx = Math.max(0, Math.min(queueIndexRef.current, existingQueue.length - 1));

      if (existingQueue[currentIdx]) {
        existingQueue[currentIdx] = { ...existingQueue[currentIdx], ...seedTrack };
      }

      const existingKeys = new Set(
        existingQueue.map((item) => trackKey(item)).filter(Boolean),
      );

      const freshItems = [];
      normalizedList.forEach((item) => {
        const key = trackKey(item);
        if (!key || existingKeys.has(key)) {
          return;
        }
        existingKeys.add(key);
        freshItems.push(item);
      });

      if (!freshItems.length) {
        lastRecommendationSeedRef.current = seedTrack.spotify_track_id;
        return;
      }

      const itemsToInsert = isShuffle ? shuffleArray(freshItems) : freshItems;
      const before = existingQueue.slice(0, currentIdx + 1);
      const after = existingQueue.slice(currentIdx + 1);
      const nextQueue = [...before, ...itemsToInsert, ...after];

      updateQueueState(nextQueue);
      itemsToInsert.forEach((item) => prefetchTrack(item));
      refreshOriginalQueueSnapshot();
      lastRecommendationSeedRef.current = seedTrack.spotify_track_id;
    } catch (error) {
      console.warn('No se pudieron obtener recomendaciones', error);
    }
  }, [isShuffle, normalizeTrack, prefetchTrack, refreshOriginalQueueSnapshot, updateQueueState]);

  const playTrack = useCallback(async (track, options = {}) => {
    const audio = audioRef.current;
    if (!track || !audio) return;

    const {
      maintainQueue = false,
      queueIndexOverride = null,
      autoEnqueue = true,
    } = options;

    const normalized = normalizeTrack(track);
    if (!normalized) {
      console.warn('Track inválido para la reproducción');
      return;
    }

    const preparedTrack = { ...track, ...normalized };
    const sessionId = playSessionRef.current + 1;
    playSessionRef.current = sessionId;
    const ensureActive = () => playSessionRef.current === sessionId;

    const artists = preparedTrack.artistas || [];
    const metadata = {
      title: preparedTrack.nombre,
      artists,
      album: preparedTrack.album,
      image: preparedTrack.imagen,
      spotifyTrackId: preparedTrack.spotify_track_id,
      cacheKey: null,
      source: 'unknown',
      contentType: null,
    };

    if (maintainQueue) {
      const targetIndex = queueIndexOverride !== null && queueIndexOverride !== undefined
        ? queueIndexOverride
        : queueIndexRef.current >= 0
          ? queueIndexRef.current
          : 0;

      if (queueIndexOverride !== null && queueIndexOverride !== undefined) {
        updateQueueIndex(queueIndexOverride);
      } else if (queueRef.current.length === 0) {
        updateQueueIndex(0);
      }

      updateQueueState((prev) => {
        if (!prev.length) {
          return [preparedTrack];
        }
        const next = [...prev];
        if (targetIndex >= 0 && targetIndex < next.length) {
          next[targetIndex] = { ...next[targetIndex], ...preparedTrack };
        }
        return next;
      });
      refreshOriginalQueueSnapshot();
    } else {
      updateQueueState([preparedTrack]);
      updateQueueIndex(0);
      refreshOriginalQueueSnapshot();
      lastRecommendationSeedRef.current = null;
    }

    setStatus('loading');
    setError(null);
    setCurrentTrack({ ...metadata });
    setProgress({ currentTime: 0, duration: 0 });

    audio.pause();

    const cacheMapSnapshot = cacheMapRef.current;
    const localCacheKey = preparedTrack.spotify_track_id ? cacheMapSnapshot[preparedTrack.spotify_track_id] : null;
    if (localCacheKey && canUseAudioCache) {
      try {
        const record = await getTrackRecord(localCacheKey);
        if (!ensureActive()) {
          return;
        }
        if (record?.blob) {
          metadata.cacheKey = localCacheKey;
          metadata.source = 'local-cache';
          metadata.contentType = record.contentType;
          await startPlaybackWithBlob({ blob: record.blob, contentType: record.contentType, trackMeta: metadata });
          return;
        }
      } catch (cacheError) {
        console.warn('No se pudo cargar cache local, se solicitará al backend', cacheError);
      }
    }

    let response;
    try {
      response = await requestTrackStream({
        trackName: preparedTrack.nombre,
        artists,
        album: preparedTrack.album,
        spotifyTrackId: preparedTrack.spotify_track_id,
        durationMs: preparedTrack.duration_ms,
      });
    } catch (requestError) {
      if (ensureActive()) {
        setError('No se pudo obtener el stream');
        setStatus('error');
      }
      throw requestError;
    }

    if (!ensureActive()) {
      return;
    }

    const cacheKey = response.cache_key;
    metadata.cacheKey = cacheKey;
    metadata.source = response.source;
    metadata.contentType = response.content_type;

    if (preparedTrack.spotify_track_id && cacheKey) {
      updateCacheMap(preparedTrack.spotify_track_id, cacheKey);
    }

    setCurrentTrack({ ...metadata });

    if (response.is_cached) {
      try {
        const cachedResponse = await fetchCachedTrack(cacheKey);
        if (!ensureActive()) {
          return;
        }
        if (!cachedResponse) {
          throw new Error('cache_missing');
        }
        const blob = await cachedResponse.blob();
        const contentType = cachedResponse.headers.get('Content-Type') || response.content_type;
        metadata.source = 'cache';
        metadata.contentType = contentType;
        await saveTrackBlob(cacheKey, blob, contentType);
        await startPlaybackWithBlob({ blob, contentType, trackMeta: metadata });
        return;
      } catch (cachedError) {
        console.warn('No se pudo usar caché inmediata, se reproducirá streaming', cachedError);
      }
    }

    const proxyEndpoint = response.proxy_endpoint || null;
    const directUrl = proxyEndpoint ? `${API_URL}${proxyEndpoint}` : response.stream_url;

    if (!directUrl) {
      if (cacheKey) {
        const cachedResult = await waitForCachedBlob(cacheKey, response.content_type);
        if (!ensureActive()) {
          return;
        }
        if (cachedResult) {
          metadata.source = 'cache';
          metadata.contentType = cachedResult.contentType;
          await startPlaybackWithBlob({
            blob: cachedResult.blob,
            contentType: cachedResult.contentType,
            trackMeta: metadata,
          });
          return;
        }
      }

      setError('No se pudo obtener el stream');
      setStatus('error');
      throw new Error('missing_stream');
    }

    revokeObjectUrl();
    audio.pause();
    audio.src = directUrl;
    audio.type = response.content_type || 'audio/mp4';
    audio.load();
    metadata.source = response.source || 'stream';
    metadata.contentType = response.content_type;
    setCurrentTrack({ ...metadata });

    try {
      await audio.play();
    } catch (streamError) {
      console.warn('Error al iniciar streaming directo, intentando esperar caché', streamError);
      if (cacheKey) {
        const cachedResult = await waitForCachedBlob(cacheKey, response.content_type);
        if (!ensureActive()) {
          return;
        }
        if (cachedResult) {
          metadata.source = 'cache';
          metadata.contentType = cachedResult.contentType;
          await startPlaybackWithBlob({
            blob: cachedResult.blob,
            contentType: cachedResult.contentType,
            trackMeta: metadata,
          });
          return;
        }
      }

      if (ensureActive()) {
        setError('No se pudo iniciar la reproducción');
        setStatus('error');
      }
      throw streamError;
    }

    prefetchUpcomingTracks(queueIndexRef.current + 1);

    const remainingAhead = queueRef.current.length - (queueIndexRef.current + 1);
    if ((autoEnqueue || remainingAhead <= 3) && preparedTrack.spotify_track_id) {
      enqueueRecommendations(preparedTrack);
    }
  }, [enqueueRecommendations, normalizeTrack, prefetchUpcomingTracks, refreshOriginalQueueSnapshot, revokeObjectUrl, startPlaybackWithBlob, updateCacheMap, updateQueueIndex, updateQueueState, waitForCachedBlob]);

  const enqueueTracks = useCallback(
    (tracks, { insertAfterCurrent = true, playIfIdle = false } = {}) => {
      const payload = Array.isArray(tracks) ? tracks : [tracks];
      const normalizedList = payload
        .map((item) => normalizeTrack(item))
        .filter(Boolean);

      if (!normalizedList.length) {
        return;
      }

      const additions = (isShuffle ? shuffleArray([...normalizedList]) : normalizedList).map((item) => ({ ...item }));
      let insertedIndex = null;

      updateQueueState((prev) => {
        const base = prev.length ? [...prev] : [];

        if (!base.length) {
          insertedIndex = 0;
          originalQueueRef.current = additions.map((item) => ({ ...item }));
          return additions;
        }

        let nextQueue;
        if (insertAfterCurrent) {
          const currentIdx = Math.max(0, Math.min(queueIndexRef.current, base.length - 1));
          const before = base.slice(0, currentIdx + 1);
          const after = base.slice(currentIdx + 1);
          insertedIndex = before.length;
          nextQueue = [...before, ...additions.map((item) => ({ ...item })), ...after];
        } else {
          insertedIndex = base.length;
          nextQueue = [...base, ...additions.map((item) => ({ ...item }))];
        }

        originalQueueRef.current = nextQueue.map((item) => ({ ...item }));
        return nextQueue;
      });

      additions.forEach(prefetchTrack);

      if (queueIndexRef.current === -1 && insertedIndex !== null) {
        updateQueueIndex(insertedIndex);
      }

      if (playIfIdle && insertedIndex !== null && (status === 'idle' || status === 'ended' || !currentTrack)) {
        const target = queueRef.current[insertedIndex];
        if (target) {
          playTrack(target, { maintainQueue: true, queueIndexOverride: insertedIndex, autoEnqueue: false })
            .catch((error) => console.error('No se pudo iniciar reproducción al agregar a la cola', error));
        }
      }
    },
    [
      normalizeTrack,
      isShuffle,
      updateQueueState,
      prefetchTrack,
      updateQueueIndex,
      status,
      currentTrack,
      playTrack,
    ],
  );

  const playNext = useCallback(() => {
    const snapshot = queueRef.current;
    if (!snapshot.length) return;

    const currentIdx = queueIndexRef.current;
    let nextIdx = currentIdx + 1;
    const mode = repeatModeRef.current;

    if (nextIdx >= snapshot.length) {
      if (mode === 'queue') {
        nextIdx = 0;
      } else {
        setStatus('ended');
        return;
      }
    }

    const nextTrack = snapshot[nextIdx];
    if (!nextTrack) {
      setStatus('ended');
      return;
    }

    playTrack(nextTrack, { maintainQueue: true, queueIndexOverride: nextIdx, autoEnqueue: false })
      .catch((err) => console.error('No se pudo reproducir el siguiente track', err));
  }, [playTrack]);

  const playPrevious = useCallback(() => {
    const snapshot = queueRef.current;
    if (!snapshot.length) return;

    const currentIdx = queueIndexRef.current;
    let prevIdx = currentIdx - 1;

    if (prevIdx < 0) {
      const mode = repeatModeRef.current;
      if (mode === 'queue' && snapshot.length > 0) {
        prevIdx = snapshot.length - 1;
      } else {
        return;
      }
    }

    const prevTrack = snapshot[prevIdx];
    if (!prevTrack) return;

    playTrack(prevTrack, { maintainQueue: true, queueIndexOverride: prevIdx, autoEnqueue: false })
      .catch((err) => console.error('No se pudo reproducir el track anterior', err));
  }, [playTrack]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const setShuffle = useCallback((enabled) => {
    setIsShuffle(Boolean(enabled));
  }, []);

  const cycleRepeatMode = useCallback(() => {
    updateRepeatMode((prev) => {
      if (prev === 'off') return 'queue';
      if (prev === 'queue') return 'track';
      return 'off';
    });
  }, []);

  const setRepeatMode = useCallback((mode) => {
    if (mode === 'off' || mode === 'queue' || mode === 'track') {
      updateRepeatMode(mode);
    }
  }, []);

  const setVolume = useCallback((updater) => {
    setVolumeState((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater;
      const numeric = typeof nextValue === 'number' && !Number.isNaN(nextValue) ? nextValue : prev;
      const clamped = Math.max(0, Math.min(1, numeric));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
        } catch (storageError) {
          console.warn('No se pudo guardar el volumen', storageError);
        }
      }
      const audio = audioRef.current;
      if (audio) {
        audio.volume = clamped;
      }
      return clamped;
    });
  }, []);

  const changeVolume = useCallback((delta) => {
    setVolume((prev) => prev + delta);
  }, [setVolume]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setStatus('loading');
    try {
      await audio.play();
    } catch (error) {
      setError('No se pudo reanudar la reproducción');
      setStatus('error');
      console.error('No se pudo reanudar la reproducción', error);
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setStatus('idle');
  }, []);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setProgress((prev) => ({
      currentTime: seconds,
      duration: prev.duration || (Number.isFinite(audio.duration) ? audio.duration : 0),
    }));
  }, []);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    if (queue.length > 0 && queueIndex >= 0) {
      prefetchUpcomingTracks(queueIndex + 1);
    }
  }, [queue, queueIndex, prefetchUpcomingTracks]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const value = useMemo(() => ({
    audioRef,
    status,
    error,
    currentTrack,
    progress,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    volume,
    playTrack,
    playNext,
    playPrevious,
    pause,
    resume,
    stop,
    seek,
    toggleShuffle,
    setShuffle,
    setVolume,
    changeVolume,
    enqueueTracks,
    cycleRepeatMode,
    setRepeatMode,
    setQueue: setQueueTracks,
  }), [
    status,
    error,
    currentTrack,
    progress,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    volume,
    playTrack,
    playNext,
    playPrevious,
    pause,
    resume,
    stop,
    seek,
    toggleShuffle,
    setShuffle,
    setVolume,
    changeVolume,
    enqueueTracks,
    cycleRepeatMode,
    setRepeatMode,
    setQueueTracks,
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer debe ser usado dentro de PlayerProvider');
  }
  return ctx;
};
