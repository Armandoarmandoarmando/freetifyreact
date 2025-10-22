import { useMemo } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const PlayerBar = () => {
  const { currentTrack, status, progress, pause, resume, seek } = usePlayer();

  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const hasTrack = Boolean(currentTrack);

  const progressPercent = useMemo(() => {
    if (!progress.duration) return 0;
    return Math.min(100, (progress.currentTime / progress.duration) * 100);
  }, [progress.currentTime, progress.duration]);

  const sliderBackground = useMemo(() => (
    `linear-gradient(90deg, #1DB954 0%, #1DB954 ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%, rgba(255,255,255,0.1) 100%)`
  ), [progressPercent]);

  if (!hasTrack) {
    return null;
  }

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

        <button
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
            <i className="bi bi-hourglass-split"></i>
          ) : isPlaying ? (
            <i className="bi bi-pause-fill"></i>
          ) : (
            <i className="bi bi-play-fill" style={{ paddingLeft: '4px' }}></i>
          )}
        </button>
      </div>

      <div style={{ marginTop: '18px' }}>
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
    </div>
  );
};

export default PlayerBar;
