import { useMemo, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const PlayerBar = () => {
  const {
    currentTrack,
    status,
    progress,
    pause,
    resume,
    seek,
    playNext,
    playPrevious,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
    volume,
    setVolume,
    changeVolume,
    playTrack,
  } = usePlayer();

  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const hasTrack = Boolean(currentTrack);
  const [showQueue, setShowQueue] = useState(false);

  const progressPercent = useMemo(() => {
    if (!progress.duration) return 0;
    return Math.min(100, (progress.currentTime / progress.duration) * 100);
  }, [progress.currentTime, progress.duration]);

  const volumePercent = useMemo(() => Math.round(volume * 100), [volume]);
  const volumeIcon = useMemo(() => {
    if (volume === 0) return 'bi-volume-mute';
    if (volume < 0.5) return 'bi-volume-down';
    return 'bi-volume-up';
  }, [volume]);

  const sliderBackground = useMemo(() => (
    `linear-gradient(90deg, #1DB954 0%, #1DB954 ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%, rgba(255,255,255,0.1) 100%)`
  ), [progressPercent]);

  const nextTrack = useMemo(() => queue?.[queueIndex + 1], [queue, queueIndex]);

  const handleToggleQueue = useCallback(() => {
    setShowQueue((prev) => !prev);
  }, []);

  const handleSelectQueueTrack = useCallback((track, index) => {
    if (!track) return;
    playTrack(track, { maintainQueue: true, queueIndexOverride: index, autoEnqueue: false })
      .catch((err) => console.error('No se pudo saltar dentro de la cola', err));
  }, [playTrack]);

  const handleVolumeInput = useCallback((event) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setVolume(value / 100);
    }
  }, [setVolume]);

  const decreaseVolume = useCallback(() => {
    changeVolume(-0.1);
  }, [changeVolume]);

  const increaseVolume = useCallback(() => {
    changeVolume(0.1);
  }, [changeVolume]);

  if (!hasTrack) return null;

  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '24px',
      width: 'min(900px, calc(100% - 48px))',
      padding: '20px 28px',
      borderRadius: '18px',
      background: 'linear-gradient(135deg, rgba(18,18,18,0.95), rgba(30,30,30,0.95))',
      boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
      color: '#fff',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.06)',
      zIndex: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '12px',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {currentTrack?.image ? (
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <i className="bi bi-music-note" style={{ fontSize: '1.8rem', color: '#1DB954' }}></i>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {currentTrack?.title || 'Sin título'}
            </h3>
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(29, 185, 84, 0.15)',
              color: '#1DB954',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {currentTrack?.source === 'cache' || currentTrack?.source === 'local-cache' ? 'Offline ready' : 'Streaming'}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: '#bbb',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {currentTrack?.artists?.join(', ') || 'Artista desconocido'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={playPrevious}
            disabled={isLoading}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="bi bi-skip-backward-fill" />
          </button>

          <button
            type="button"
            onClick={() => (isPlaying ? pause() : resume())}
            disabled={isLoading}
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              border: 'none',
              background: '#1DB954',
              color: '#fff',
              fontSize: '1.6rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: isPlaying ? '0 12px 30px rgba(29,185,84,0.35)' : '0 6px 18px rgba(29,185,84,0.25)',
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isLoading ? (
              <i className="bi bi-hourglass-split" />
            ) : isPlaying ? (
              <i className="bi bi-pause-fill" />
            ) : (
              <i className="bi bi-play-fill" style={{ paddingLeft: '4px' }} />
            )}
          </button>

          <button
            type="button"
            onClick={playNext}
            disabled={isLoading}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="bi bi-skip-forward-fill" />
          </button>
        </div>
      </div>

      <div style={{
        marginTop: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <button
            type="button"
            onClick={toggleShuffle}
            style={{
              backgroundColor: isShuffle ? 'rgba(29,185,84,0.25)' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <i className="bi bi-shuffle" />
            {isShuffle ? 'Aleatorio activo' : 'Aleatorio apagado'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ flex: 1 }}>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={progressPercent}
              onChange={(event) => {
                const value = Number(event.target.value);
                const newTime = progress.duration ? (value / 100) * progress.duration : 0;
                if (!Number.isNaN(newTime)) {
                  seek(newTime);
                }
              }}
              style={{
                width: '100%',
                appearance: 'none',
                height: '6px',
                borderRadius: '3px',
                background: sliderBackground,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '0.75rem',
              color: '#bbb',
            }}>
              <span>{formatTime(progress.currentTime)}</span>
              <span>{formatTime(progress.duration)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={cycleRepeatMode}
            style={{
              backgroundColor: repeatMode === 'off' ? 'rgba(255,255,255,0.08)' : 'rgba(29,185,84,0.25)',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <i className={repeatMode === 'track' ? 'bi bi-repeat-1' : 'bi bi-repeat'} />
            {repeatMode === 'off' ? 'Sin repetición' : repeatMode === 'queue' ? 'Repetir cola' : 'Repetir canción'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={decreaseVolume}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Bajar volumen"
              aria-label="Bajar volumen"
            >
              <i className="bi bi-dash"></i>
            </button>
            <i className={`bi ${volumeIcon}`} style={{ fontSize: '1rem', color: '#1DB954' }}></i>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePercent}
              onChange={handleVolumeInput}
              aria-label="Volumen"
              style={{
                width: '100px',
                appearance: 'none',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(90deg, #1DB954 0%, #1DB954 ${volumePercent}%, rgba(255,255,255,0.1) ${volumePercent}%, rgba(255,255,255,0.1) 100%)`,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <button
              type="button"
              onClick={increaseVolume}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Subir volumen"
              aria-label="Subir volumen"
            >
              <i className="bi bi-plus"></i>
            </button>
            <span style={{ fontSize: '0.75rem', color: '#bbb', width: '36px', textAlign: 'right' }}>{volumePercent}%</span>
          </div>
          {nextTrack ? (
            <div style={{ fontSize: '0.85rem', color: '#bbb', maxWidth: '220px' }}>
              <div style={{ opacity: 0.7 }}>A continuación</div>
              <div style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nextTrack.nombre || nextTrack.title}
              </div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(nextTrack.artistas || nextTrack.artists || []).join(', ')}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#bbb' }}>Fin de la cola</div>
          )}
          <button
            type="button"
            onClick={handleToggleQueue}
            style={{
              backgroundColor: showQueue ? '#1DB954' : 'rgba(255,255,255,0.08)',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
            }}
          >
            <i className="bi bi-music-note-list" />
            {showQueue ? 'Ocultar cola' : `Ver cola (${queue?.length || 0})`}
          </button>
        </div>
      </div>

      {showQueue && (
        <div style={{
          marginTop: '16px',
          maxHeight: '220px',
          overflowY: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '12px',
        }}>
          {queue && queue.length ? (
            queue.map((track, index) => {
              const isCurrent = index === queueIndex;
              return (
                <div
                  key={`${track.spotify_track_id || track.nombre || track.title || 'queue-track'}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectQueueTrack(track, index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectQueueTrack(track, index);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    backgroundColor: isCurrent ? 'rgba(29,185,84,0.25)' : 'transparent',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <span style={{ width: '22px', fontSize: '0.8rem', color: '#bbb', textAlign: 'right' }}>{index + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isCurrent ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.nombre || track.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#bbb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(track.artistas || track.artists || []).join(', ')}
                    </div>
                  </div>
                  {isCurrent ? (
                    <span style={{ fontSize: '0.7rem', color: '#1DB954', fontWeight: 600 }}>Reproduciendo</span>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p style={{ color: '#bbb', margin: 0 }}>Sin canciones en cola.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
