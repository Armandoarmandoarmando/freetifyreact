import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { requestTrackStream, fetchCachedTrack } from '../api';
import { canUseAudioCache, getTrackRecord, saveTrackBlob } from '../utils/audioCache';

const PlayerContext = createContext(null);

const CACHE_MAP_STORAGE_KEY = 'freetify_track_cache_map';

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

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const objectUrlRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [cacheMap, setCacheMap] = useState(() => loadCacheMap());

  const updateCacheMap = useCallback((spotifyTrackId, cacheKey) => {
    if (!spotifyTrackId) return;
    setCacheMap((prev) => {
      if (prev[spotifyTrackId] === cacheKey) {
        return prev;
      }
      const next = { ...prev, [spotifyTrackId]: cacheKey };
      persistCacheMap(next);
      return next;
    });
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
    const handleEnded = () => setStatus('ended');
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
    audio.src = objectUrl;
    if (contentType) {
      audio.type = contentType;
    }

    setCurrentTrack(trackMeta);
    setStatus('loading');
    setError(null);

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

  const playTrack = useCallback(async (track) => {
    const audio = audioRef.current;
    if (!track || !audio) return;

    const artists = track.artistas || (track.artista ? [track.artista] : []);
    const metadata = {
      title: track.nombre,
      artists,
      album: track.album,
      image: track.imagen,
      spotifyTrackId: track.spotify_track_id,
      cacheKey: null,
      source: 'unknown',
      contentType: null,
    };

    setStatus('loading');
    setError(null);
    setCurrentTrack({ ...metadata });

    const localCacheKey = track.spotify_track_id ? cacheMap[track.spotify_track_id] : null;
    if (localCacheKey && canUseAudioCache) {
      try {
        const record = await getTrackRecord(localCacheKey);
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
        trackName: track.nombre,
        artists,
        album: track.album,
        spotifyTrackId: track.spotify_track_id,
        durationMs: track.duration_ms ?? (track.duracion ? track.duracion * 1000 : undefined),
      });
    } catch (requestError) {
      setError('No se pudo obtener el stream');
      setStatus('error');
      throw requestError;
    }

    const cacheKey = response.cache_key;
    metadata.cacheKey = cacheKey;
    metadata.source = response.source;
    metadata.contentType = response.content_type;

    if (track.spotify_track_id && cacheKey) {
      updateCacheMap(track.spotify_track_id, cacheKey);
    }

    setCurrentTrack({ ...metadata });

    if (response.is_cached) {
      try {
        const cachedResponse = await fetchCachedTrack(cacheKey);
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
      setError('No se pudo obtener el stream');
      setStatus('error');
      throw new Error('missing_stream');
    }

    revokeObjectUrl();
    audio.pause();
    audio.src = directUrl;
    audio.type = response.content_type || '';
    metadata.source = response.source || 'stream';
    metadata.contentType = response.content_type;
    setCurrentTrack(metadata);

    try {
      await audio.play();
    } catch (streamError) {
      setError('No se pudo iniciar la reproducción');
      setStatus('error');
      throw streamError;
    }

    if (cacheKey) {
      waitForCachedBlob(cacheKey, response.content_type)
        .then((cachedResult) => {
          if (!cachedResult) return;
          setCurrentTrack((prev) => {
            if (prev && prev.cacheKey === cacheKey) {
              return {
                ...prev,
                source: 'cache',
                contentType: cachedResult.contentType,
              };
            }
            return prev;
          });
        })
        .catch((cacheErr) => {
          console.warn('No se pudo completar la caché en background', cacheErr);
        });
    }
  }, [cacheMap, revokeObjectUrl, startPlaybackWithBlob, updateCacheMap, waitForCachedBlob]);

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
    } catch (err) {
      setError('No se pudo reanudar la reproducción');
      setStatus('error');
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

  const value = useMemo(() => ({
    audioRef,
    status,
    error,
    currentTrack,
    progress,
    playTrack,
    pause,
    resume,
    stop,
    seek,
  }), [status, error, currentTrack, progress, playTrack, pause, resume, stop, seek]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

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
