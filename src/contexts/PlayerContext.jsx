/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  requestTrackStream,
  fetchCachedTrack,
  fetchRecommendations,
  fetchCacheStatus,
  subscribeCacheStatus,
} from '../api';
import { canUseAudioCache, getTrackRecord, saveTrackBlob } from '../utils/audioCache';

const PlayerContext = createContext(null);

const CACHE_MAP_STORAGE_KEY = 'freetify_track_cache_map_v3';
const VOLUME_STORAGE_KEY = 'freetify_player_volume';
const AUDIO_SETTINGS_STORAGE_KEY = 'freetify_audio_settings_v1';
const DEFAULT_AUDIO_SETTINGS = {
  volumeBoostEnabled: false,
  boostAmount: 1.35,
  crossfadeEnabled: false,
  crossfadeSeconds: 2,
};

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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeAudioSettings = (settings = {}) => ({
  volumeBoostEnabled: Boolean(settings.volumeBoostEnabled),
  boostAmount: clamp(Number.parseFloat(settings.boostAmount) || DEFAULT_AUDIO_SETTINGS.boostAmount, 1, 2.5),
  crossfadeEnabled: Boolean(settings.crossfadeEnabled),
  crossfadeSeconds: clamp(Number.parseFloat(settings.crossfadeSeconds) || DEFAULT_AUDIO_SETTINGS.crossfadeSeconds, 0.5, 8),
});

const loadAudioSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    return normalizeAudioSettings(JSON.parse(raw));
  } catch (error) {
    console.warn('No se pudieron cargar los ajustes de audio', error);
    return DEFAULT_AUDIO_SETTINGS;
  }
};

const persistAudioSettings = (settings) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('No se pudieron guardar los ajustes de audio', error);
  }
};

const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const extractSpotifyTrackId = (track) => {
  if (!track) return null;

  const directId = track.spotify_track_id || track.spotifyTrackId || track.id;
  if (directId) return directId;

  const candidateUrl = track.url || track.spotify_url || track.spotifyUrl || track?.external_urls?.spotify;
  if (candidateUrl && typeof candidateUrl === 'string') {
    const match = candidateUrl.match(/spotify\.com\/track\/([A-Za-z0-9]+)(?:\?|$)/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  const candidateUri = track.uri || track.spotify_uri || track.spotifyUri;
  if (candidateUri && typeof candidateUri === 'string') {
    const match = candidateUri.match(/^spotify:track:([A-Za-z0-9]+)$/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

const trackKey = (track) => (
  extractSpotifyTrackId(track)
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
  const audioContextRef = useRef(null);
  const mediaElementSourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const transitionGainRef = useRef(1);
  const gainFadeIntervalRef = useRef(null);
  const prefetchingRef = useRef(new Set());
  const prefetchQueuedRef = useRef(new Set());
  const prefetchPendingListRef = useRef([]);
  const prefetchWorkerRunningRef = useRef(false);
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
  const [audioSettings, setAudioSettingsState] = useState(() => loadAudioSettings());
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
    const spotifyTrackId = extractSpotifyTrackId(track);
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

  const clearGainFadeInterval = useCallback(() => {
    if (gainFadeIntervalRef.current) {
      window.clearInterval(gainFadeIntervalRef.current);
      gainFadeIntervalRef.current = null;
    }
  }, []);

  const ensureAudioGraph = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const audio = audioRef.current;
    if (!audio) return false;
    if (gainNodeRef.current) return true;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return false;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      if (!mediaElementSourceRef.current) {
        mediaElementSourceRef.current = context.createMediaElementSource(audio);
      }

      gainNodeRef.current = context.createGain();
      mediaElementSourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(context.destination);
      audio.volume = 1;
      return true;
    } catch (error) {
      console.warn('No se pudo inicializar el pipeline de audio avanzado', error);
      return false;
    }
  }, []);

  const getCrossfadeMs = useCallback((settings = audioSettings) => (
    Math.round(clamp(settings.crossfadeSeconds, 0.5, 8) * 1000)
  ), [audioSettings]);

  const applyOutputGain = useCallback((factor = transitionGainRef.current, settings = audioSettings, baseVolume = volume) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedVolume = clamp(baseVolume, 0, 1);
    const multiplier = settings.volumeBoostEnabled ? settings.boostAmount : 1;
    const targetGain = Math.max(0, clampedVolume * multiplier * Math.max(0, factor));
    const graphAlreadyReady = Boolean(gainNodeRef.current);
    const shouldUseGraph = graphAlreadyReady || settings.volumeBoostEnabled;
    const hasAudioGraph = shouldUseGraph ? ensureAudioGraph() : false;

    if (hasAudioGraph && gainNodeRef.current) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      audio.volume = 1;
      gainNodeRef.current.gain.value = clamp(targetGain, 0, 3);
      return;
    }

    audio.volume = clamp(targetGain, 0, 1);
  }, [audioSettings, ensureAudioGraph, volume]);

  const runGainFade = useCallback((targetFactor, durationMs) => new Promise((resolve) => {
    const from = transitionGainRef.current;
    const to = clamp(targetFactor, 0, 1);
    const total = Math.max(0, Math.round(durationMs));

    clearGainFadeInterval();

    if (total <= 0) {
      transitionGainRef.current = to;
      applyOutputGain(to);
      resolve();
      return;
    }

    const startedAt = Date.now();
    gainFadeIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = clamp(elapsed / total, 0, 1);
      const next = from + (to - from) * progress;
      transitionGainRef.current = next;
      applyOutputGain(next);
      if (progress >= 1) {
        clearGainFadeInterval();
        resolve();
      }
    }, 30);
  }), [applyOutputGain, clearGainFadeInterval]);

  const updateAudioSettings = useCallback((updates) => {
    setAudioSettingsState((previous) => {
      const patch = typeof updates === 'function' ? updates(previous) : updates;
      const next = normalizeAudioSettings({ ...previous, ...(patch || {}) });
      persistAudioSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    applyOutputGain();
  }, [applyOutputGain, audioSettings, volume]);

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

  const startPlaybackWithBlob = useCallback(async ({ blob, contentType, trackMeta, fadeInMs = 0 }) => {
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
    clearGainFadeInterval();
    transitionGainRef.current = fadeInMs > 0 ? 0 : 1;
    applyOutputGain(transitionGainRef.current);

    setCurrentTrack(trackMeta);
    setStatus('loading');
    setError(null);
    setProgress({ currentTime: 0, duration: 0 });

    try {
      await audio.play();
      if (fadeInMs > 0) {
        await runGainFade(1, fadeInMs);
      }
    } catch (playError) {
      setError('Necesitas interactuar para reproducir audio');
      setStatus('error');
      transitionGainRef.current = 1;
      applyOutputGain(1);
      throw playError;
    }
  }, [applyOutputGain, clearGainFadeInterval, revokeObjectUrl, runGainFade]);

  const waitForCachedBlob = useCallback(async (cacheKey, fallbackContentType) => {
    if (!cacheKey) return null;

    const fetchBlobFromRemoteCache = async () => {
      const response = await fetchCachedTrack(cacheKey);
      if (!response) {
        return null;
      }
      const blob = await response.blob();
      if (!blob || blob.size <= 0) {
        return null;
      }
      const contentType = response.headers.get('Content-Type') || fallbackContentType;
      await saveTrackBlob(cacheKey, blob, contentType);
      return { blob, contentType };
    };

    try {
      const initialStatus = await fetchCacheStatus(cacheKey);
      if (initialStatus?.status === 'cached') {
        const cached = await fetchBlobFromRemoteCache();
        if (cached) {
          return cached;
        }
      }
      if (initialStatus?.status === 'failed') {
        return null;
      }
    } catch (err) {
      console.warn('No se pudo consultar estado inicial de caché', err);
    }

    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      const eventResult = await new Promise((resolve) => {
        let settled = false;
        let unsubscribe = () => {};

        const done = (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(value);
        };

        const timeoutId = window.setTimeout(() => done('timeout'), 7500);
        unsubscribe = subscribeCacheStatus(cacheKey, {
          onStatus: (payload) => {
            const currentStatus = payload?.status;
            if (currentStatus === 'cached') {
              done('cached');
              return;
            }
            if (currentStatus === 'failed') {
              done('failed');
            }
          },
          onError: () => done('error'),
        });
      });

      if (eventResult === 'cached') {
        try {
          const cached = await fetchBlobFromRemoteCache();
          if (cached) {
            return cached;
          }
        } catch (err) {
          console.warn('Evento de caché listo pero no se pudo descargar blob', err);
        }
      }

      if (eventResult === 'failed') {
        return null;
      }
    }

    const maxAttempts = 5;
    const baseDelay = 700;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const cached = await fetchBlobFromRemoteCache();
        if (cached) {
          return cached;
        }

        const statusPayload = await fetchCacheStatus(cacheKey);
        if (statusPayload?.status === 'failed') {
          return null;
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

  const startPrefetchWorker = useCallback(() => {
    if (prefetchWorkerRunningRef.current) {
      return;
    }

    prefetchWorkerRunningRef.current = true;
    void (async () => {
      while (prefetchPendingListRef.current.length > 0) {
        const nextItem = prefetchPendingListRef.current.shift();
        if (!nextItem?.key || !nextItem?.track) {
          continue;
        }
        prefetchQueuedRef.current.delete(nextItem.key);
        await prefetchTrack(nextItem.track);
      }
    })().finally(() => {
      prefetchWorkerRunningRef.current = false;
      if (prefetchPendingListRef.current.length > 0) {
        startPrefetchWorker();
      }
    });
  }, [prefetchTrack]);

  const clearPendingPrefetchQueue = useCallback(() => {
    prefetchPendingListRef.current = [];
    prefetchQueuedRef.current.clear();
  }, []);

  const enqueuePrefetchTrack = useCallback((track) => {
    const normalized = normalizeTrack(track);
    if (!normalized) return;

    const uniqueKey = trackKey(normalized);
    if (!uniqueKey) return;

    if (prefetchingRef.current.has(uniqueKey) || prefetchQueuedRef.current.has(uniqueKey)) {
      return;
    }

    prefetchQueuedRef.current.add(uniqueKey);
    prefetchPendingListRef.current.push({
      key: uniqueKey,
      track: { ...track, ...normalized },
    });
    startPrefetchWorker();
  }, [normalizeTrack, startPrefetchWorker]);

  const prefetchUpcomingTracks = useCallback((startIndex = 0) => {
    const snapshot = queueRef.current;
    if (!snapshot.length) return;

    for (let idx = startIndex; idx < snapshot.length; idx += 1) {
      const candidate = snapshot[idx];
      if (!candidate) continue;
      enqueuePrefetchTrack(candidate);
    }
  }, [enqueuePrefetchTrack]);

  const setQueueTracks = useCallback((tracks, startAt = 0) => {
    const normalized = [];
    (tracks || []).forEach((item) => {
      const normalizedItem = normalizeTrack(item);
      if (normalizedItem) {
        normalized.push({ ...item, ...normalizedItem });
      }
    });

    if (!normalized.length) {
      clearPendingPrefetchQueue();
      updateQueueState([]);
      updateQueueIndex(-1);
      originalQueueRef.current = [];
      lastRecommendationSeedRef.current = null;
      return;
    }

    clearPendingPrefetchQueue();
    const safeIndex = Math.max(0, Math.min(startAt, normalized.length - 1));
    updateQueueState(normalized);
    updateQueueIndex(safeIndex);
    refreshOriginalQueueSnapshot();
    lastRecommendationSeedRef.current = null;
    prefetchUpcomingTracks(safeIndex + 1);
  }, [clearPendingPrefetchQueue, normalizeTrack, prefetchUpcomingTracks, refreshOriginalQueueSnapshot, updateQueueIndex, updateQueueState]);

  const enqueueRecommendations = useCallback(async (seedTrack, { limit = 10, force = false } = {}) => {
    if (!seedTrack?.spotify_track_id) {
      return;
    }

    if (!force && lastRecommendationSeedRef.current === seedTrack.spotify_track_id) {
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
      itemsToInsert.forEach((item) => enqueuePrefetchTrack(item));
      refreshOriginalQueueSnapshot();
      lastRecommendationSeedRef.current = seedTrack.spotify_track_id;
    } catch (error) {
      console.warn('No se pudieron obtener recomendaciones', error);
    }
  }, [enqueuePrefetchTrack, isShuffle, normalizeTrack, refreshOriginalQueueSnapshot, updateQueueState]);

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
    const shouldCrossfade = Boolean(audioSettings.crossfadeEnabled);
    const fadeMs = shouldCrossfade ? getCrossfadeMs(audioSettings) : 0;

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
      clearPendingPrefetchQueue();
      updateQueueState([preparedTrack]);
      updateQueueIndex(0);
      refreshOriginalQueueSnapshot();
      lastRecommendationSeedRef.current = null;
    }

    if (shouldCrossfade && !audio.paused && audio.src) {
      await runGainFade(0, fadeMs);
      if (!ensureActive()) {
        return;
      }
    } else {
      clearGainFadeInterval();
      transitionGainRef.current = 1;
      applyOutputGain(1);
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
          await startPlaybackWithBlob({
            blob: record.blob,
            contentType: record.contentType,
            trackMeta: metadata,
            fadeInMs: fadeMs,
          });
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
        if (!blob || blob.size <= 0) {
          throw new Error('cache_empty');
        }
        const contentType = cachedResponse.headers.get('Content-Type') || response.content_type;
        metadata.source = 'cache';
        metadata.contentType = contentType;
        await saveTrackBlob(cacheKey, blob, contentType);
        await startPlaybackWithBlob({
          blob,
          contentType,
          trackMeta: metadata,
          fadeInMs: fadeMs,
        });
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
            fadeInMs: fadeMs,
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
    clearGainFadeInterval();
    transitionGainRef.current = shouldCrossfade ? 0 : 1;
    applyOutputGain(transitionGainRef.current);
    metadata.source = response.source || 'stream';
    metadata.contentType = response.content_type;
    setCurrentTrack({ ...metadata });

    try {
      await audio.play();
      if (shouldCrossfade) {
        await runGainFade(1, fadeMs);
      }
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
            fadeInMs: fadeMs,
          });
          return;
        }
      }

      if (ensureActive()) {
        setError('No se pudo iniciar la reproducción');
        setStatus('error');
      }
      transitionGainRef.current = 1;
      applyOutputGain(1);
      throw streamError;
    }

    prefetchUpcomingTracks(queueIndexRef.current + 1);

    const remainingAhead = queueRef.current.length - (queueIndexRef.current + 1);
    if ((autoEnqueue || remainingAhead <= 3) && preparedTrack.spotify_track_id) {
      const forceRecommendations = isShuffle && !maintainQueue;
      enqueueRecommendations(preparedTrack, { limit: 10, force: forceRecommendations });
    }
  }, [applyOutputGain, audioSettings, clearGainFadeInterval, clearPendingPrefetchQueue, enqueueRecommendations, getCrossfadeMs, isShuffle, normalizeTrack, prefetchUpcomingTracks, refreshOriginalQueueSnapshot, revokeObjectUrl, runGainFade, startPlaybackWithBlob, updateCacheMap, updateQueueIndex, updateQueueState, waitForCachedBlob]);

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

      additions.forEach(enqueuePrefetchTrack);

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

      // Regla: al agregar una canción con modo aleatorio activo, añade 10 similares.
      if (isShuffle && additions.length === 1) {
        const seedTrack = additions[0];
        if (seedTrack?.spotify_track_id) {
          enqueueRecommendations(seedTrack, { limit: 10, force: true })
            .catch((error) => console.error('No se pudieron agregar recomendaciones automáticas', error));
        }
      }
    },
    [
      normalizeTrack,
      isShuffle,
      enqueueRecommendations,
      updateQueueState,
      enqueuePrefetchTrack,
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
    const enablingShuffle = !isShuffle;
    setIsShuffle((prev) => {
      const next = !prev;
      if (next) {
        // Al activar shuffle permitimos una nueva ronda de recomendaciones manuales.
        lastRecommendationSeedRef.current = null;
      }
      return next;
    });
    if (!enablingShuffle) {
      return;
    }

    const snapshot = queueRef.current;
    const hasSingleTrackQueue = snapshot.length <= 1;
    if (!hasSingleTrackQueue) {
      return;
    }

    const currentQueueTrack = snapshot[Math.max(0, queueIndexRef.current)] || null;
    const seedTrack = currentQueueTrack || (
      currentTrack?.spotifyTrackId
        ? {
            nombre: currentTrack.title,
            artistas: currentTrack.artists || [],
            album: currentTrack.album || null,
            imagen: currentTrack.image || null,
            spotify_track_id: currentTrack.spotifyTrackId,
          }
        : null
    );

    if (seedTrack?.spotify_track_id) {
      enqueueRecommendations(seedTrack, { limit: 10, force: true })
        .catch((error) => console.error('No se pudieron agregar recomendaciones al activar aleatorio', error));
    }
  }, [currentTrack, enqueueRecommendations, isShuffle]);

  const setShuffle = useCallback((enabled) => {
    const next = Boolean(enabled);
    if (next) {
      lastRecommendationSeedRef.current = null;
    }
    setIsShuffle(next);
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
  useEffect(() => () => clearGainFadeInterval(), [clearGainFadeInterval]);

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
    audioSettings,
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
    updateAudioSettings,
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
    audioSettings,
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
    updateAudioSettings,
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
