import { useMemo, useState, useCallback } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import './PlayerBar.css';

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
    <div className="player-bar-container">
      <div className="player-main-row">
        <div className="track-artwork">
          {currentTrack?.image ? (
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
            />
          ) : (
            <i className="bi bi-music-note" style={{ fontSize: '1.8rem', color: '#1DB954' }}></i>
          )}
        </div>

        <div className="track-info">
          <div className="track-title-container">
            <h3 className="track-title">
              {currentTrack?.title || 'Sin título'}
            </h3>
            <span className="track-badge">
              {currentTrack?.source === 'cache' || currentTrack?.source === 'local-cache' ? 'Offline ready' : 'Streaming'}
            </span>
          </div>
          <p className="track-artists">
            {currentTrack?.artists?.join(', ') || 'Artista desconocido'}
          </p>
        </div>

        <div className="main-controls">
          <button
            type="button"
            onClick={playPrevious}
            disabled={isLoading}
            className="control-btn"
          >
            <i className="bi bi-skip-backward-fill" />
          </button>

          <button
            type="button"
            onClick={() => (isPlaying ? pause() : resume())}
            disabled={isLoading}
            className={`play-pause-btn ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''}`}
            style={{ opacity: isLoading ? 0.6 : 1 }}
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
            className="control-btn"
          >
            <i className="bi bi-skip-forward-fill" />
          </button>
        </div>
      </div>

      <div className="player-secondary-row">
        <div>
          <button
            type="button"
            onClick={toggleShuffle}
            className={`secondary-btn ${isShuffle ? 'active' : ''}`}
          >
            <i className="bi bi-shuffle" />
            <span>{isShuffle ? 'Aleatorio activo' : 'Aleatorio apagado'}</span>
          </button>
        </div>
        <div className="progress-container">
          <div className="progress-wrapper">
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
              className="progress-slider"
              style={{ background: sliderBackground }}
            />
            <div className="progress-times">
              <span>{formatTime(progress.currentTime)}</span>
              <span>{formatTime(progress.duration)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={cycleRepeatMode}
            className={`secondary-btn ${repeatMode !== 'off' ? 'active' : ''}`}
          >
            <i className={repeatMode === 'track' ? 'bi bi-repeat-1' : 'bi bi-repeat'} />
            <span>{repeatMode === 'off' ? 'Sin repetición' : repeatMode === 'queue' ? 'Repetir cola' : 'Repetir canción'}</span>
          </button>
        </div>
        <div className="volume-queue-controls">
          <div className="volume-controls">
            <button
              type="button"
              onClick={decreaseVolume}
              className="volume-btn"
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
              className="volume-slider"
              style={{
                background: `linear-gradient(90deg, #1DB954 0%, #1DB954 ${volumePercent}%, rgba(255,255,255,0.1) ${volumePercent}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <button
              type="button"
              onClick={increaseVolume}
              className="volume-btn"
              title="Subir volumen"
              aria-label="Subir volumen"
            >
              <i className="bi bi-plus"></i>
            </button>
            <span className="volume-value">{volumePercent}%</span>
          </div>
          {nextTrack ? (
            <div className="next-track-preview">
              <div className="next-track-label">A continuación</div>
              <div className="next-track-title">
                {nextTrack.nombre || nextTrack.title}
              </div>
              <div className="next-track-artists">
                {(nextTrack.artistas || nextTrack.artists || []).join(', ')}
              </div>
            </div>
          ) : (
            <div className="queue-empty">Fin de la cola</div>
          )}
          <button
            type="button"
            onClick={handleToggleQueue}
            className={`secondary-btn ${showQueue ? 'active' : ''}`}
          >
            <i className="bi bi-music-note-list" />
            <span>{showQueue ? 'Ocultar cola' : `Ver cola (${queue?.length || 0})`}</span>
          </button>
        </div>
      </div>

      {showQueue && (
        <div className="queue-list">
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
                  className={`queue-item ${isCurrent ? 'active' : ''}`}
                >
                  <span className="queue-item-index">{index + 1}</span>
                  <div className="queue-item-details">
                    <div className="queue-item-title">
                      {track.nombre || track.title}
                    </div>
                    <div className="queue-item-artists">
                      {(track.artistas || track.artists || []).join(', ')}
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="queue-item-playing-label">Reproduciendo</span>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="queue-empty" style={{ margin: 0 }}>Sin canciones en cola.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
