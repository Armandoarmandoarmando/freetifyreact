import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPlaylists, getPlaylistDetails } from '../api';
import gsap from 'gsap';
import { usePlayer } from '../contexts/PlayerContext';
import './Playlists.css';

const shuffleTracks = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { accessToken } = useAuth();
  const containerRef = useRef(null);

  const {
    playTrack,
    setQueue,
    setShuffle,
    enqueueTracks,
    isShuffle,
    currentTrack,
    status,
    repeatMode,
    cycleRepeatMode,
    setRepeatMode,
  } = usePlayer();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserPlaylists(accessToken, 50);
      setPlaylists(data.items || []);
    } catch (err) {
      setError('Error al cargar tus playlists');
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchPlaylistDetails = useCallback(async (playlistId) => {
    try {
      const data = await getPlaylistDetails(playlistId, accessToken);
      setSelectedPlaylist(data);
    } catch (err) {
      setError('Error al cargar detalles de la playlist');
      console.error('Error fetching playlist details:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchPlaylists();
    }
  }, [accessToken, fetchPlaylists]);

  const playlistTracks = useMemo(() => {
    if (!selectedPlaylist?.tracks?.items) return [];
    return selectedPlaylist.tracks.items
      .map((item) => item.track)
      .filter(Boolean)
      .map((track) => ({
        nombre: track.name,
        artistas: track.artists?.map((artist) => artist.name) || [],
        album: track.album?.name,
        imagen: track.album?.images?.[0]?.url,
        spotify_track_id: track.id,
        duration_ms: track.duration_ms,
        duracion: track.duration_ms ? track.duration_ms / 1000 : undefined,
      }));
  }, [selectedPlaylist]);

  const beginPlaylistPlayback = (orderedTracks, startIndex = 0, { shuffle } = {}) => {
    if (!orderedTracks.length) return;
    const safeIndex = Math.max(0, Math.min(startIndex, orderedTracks.length - 1));
    const firstTrack = orderedTracks[safeIndex];
    if (!firstTrack) return;

    setShuffle(Boolean(shuffle));
    setRepeatMode('off');
    playTrack(firstTrack, { maintainQueue: false }).catch((err) => console.error('No se pudo iniciar la playlist', err));
    setTimeout(() => {
      setQueue(orderedTracks, safeIndex);
    }, 0);
  };

  const handlePlayPlaylist = () => {
    if (!playlistTracks.length) return;
    beginPlaylistPlayback(playlistTracks, 0, { shuffle: false });
  };

  const handleShufflePlaylist = () => {
    if (!playlistTracks.length) return;
    const shuffled = shuffleTracks(playlistTracks);
    beginPlaylistPlayback(shuffled, 0, { shuffle: true });
  };

  const handleTrackClick = (track, index) => {
    if (!track || !playlistTracks.length) return;
    beginPlaylistPlayback(playlistTracks, index, { shuffle: false });
  };

  const isTrackSelected = (trackId) => currentTrack?.spotifyTrackId === trackId;

  const repeatLabels = {
    off: 'Sin repetición',
    queue: 'Repetir lista',
    track: 'Repetir canción',
  };

  const repeatIcons = {
    off: 'bi bi-arrow-repeat',
    queue: 'bi bi-repeat',
    track: 'bi bi-repeat-1',
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(29, 185, 84, 0.3)',
          borderTop: '4px solid #1DB954',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#b3b3b3' }}>Cargando tus playlists...</p>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc3545' }} />
        <p style={{ color: '#dc3545', textAlign: 'center' }}>{error}</p>
        <button
          type="button"
          onClick={fetchPlaylists}
          style={{
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '10px 20px',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="playlists-container">
      <header className="playlists-header-title">
        <h1>
          <i className="bi bi-music-note-list" style={{ color: '#1DB954' }} />
          Tus Playlists
        </h1>
        <p>
          Tienes {playlists.length} playlists en tu biblioteca
        </p>
      </header>

      {selectedPlaylist ? (
        <div className="playlist-detail-container">
          <button
            type="button"
            onClick={() => setSelectedPlaylist(null)}
            className="back-btn"
          >
            <i className="bi bi-arrow-left" /> Volver a playlists
          </button>

          <div className="playlist-detail-header">
            <img
              src={selectedPlaylist.images?.[0]?.url || '/placeholder-playlist.png'}
              alt={selectedPlaylist.name}
              className="playlist-detail-image"
            />
            <div className="playlist-detail-info">
              <span className="playlist-type-label">Playlist public</span>
              <h2 className="playlist-detail-title">
                {selectedPlaylist.name}
              </h2>
              <p className="playlist-detail-desc">
                {selectedPlaylist.description || 'Playlist sin descripción.'}
              </p>
              <div className="playlist-meta">
                {selectedPlaylist.owner?.display_name && (
                  <>
                    <span className="owner-avatar">
                      <i className="bi bi-person-circle"></i>
                    </span>
                    <span className="owner">{selectedPlaylist.owner?.display_name}</span>
                    <span className="separator">•</span>
                  </>
                )}
                <span>{selectedPlaylist.tracks?.total} canciones</span>
              </div>

              <div className="playlist-actions-row">
                <button
                  type="button"
                  onClick={handlePlayPlaylist}
                  disabled={!playlistTracks.length}
                  className="action-btn play-primary-btn"
                  title="Reproducir"
                >
                  <i className="bi bi-play-fill" style={{ paddingLeft: '4px' }} />
                </button>

                <button
                  type="button"
                  onClick={handleShufflePlaylist}
                  disabled={!playlistTracks.length}
                  className={`action-btn secondary-action-btn ${isShuffle ? 'active' : ''}`}
                  title="Reproducir aleatorio"
                >
                  <i className="bi bi-shuffle" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeatMode}
                  className={`action-btn secondary-action-btn ${repeatMode !== 'off' ? 'active' : ''}`}
                  title={repeatLabels[repeatMode]}
                >
                  <i className={repeatIcons[repeatMode]} />
                </button>
              </div>
            </div>
          </div>

          <div className="tracks-section">
            <div className="tracks-header">
              <div>#</div>
              <div>Título</div>
              <div className="col-album">Álbum</div>
              <div style={{ textAlign: 'right', paddingRight: '12px' }}><i className="bi bi-clock"></i></div>
            </div>

            <div className="tracks-list-container">
              {playlistTracks.map((track, index) => {
                const isSelected = isTrackSelected(track.spotify_track_id);
                return (
                  <div
                    key={`${track.spotify_track_id || track.nombre || 'track'}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTrackClick(track, index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleTrackClick(track, index);
                      }
                    }}
                    className={`track-row ${isSelected ? 'playing' : ''}`}
                  >
                    <div className="track-index">
                      {isSelected && status === 'playing' ? (
                        <i className="bi bi-soundwave" style={{ color: '#1DB954' }}></i>
                      ) : (
                        index + 1
                      )}
                    </div>

                    <div className="track-info-col">
                      <img
                        src={track.imagen || '/placeholder-song.png'}
                        alt={track.nombre}
                        className="track-thumb"
                      />
                      <div className="track-text">
                        <span className="track-name">{track.nombre}</span>
                        <span className="track-artists">{track.artistas.join(', ')}</span>
                      </div>
                    </div>

                    <div className="track-album-col">
                      {track.album}
                    </div>

                    <div className="track-duration-col">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          enqueueTracks(track);
                        }}
                        className="add-queue-btn"
                        aria-label="Añadir a la cola"
                        title="Añadir a la cola"
                      >
                        <i className="bi bi-plus-circle"></i>
                      </button>
                      <span>
                        {Math.floor((track.duration_ms || 0) / 60000)}:{String(Math.floor(((track.duration_ms || 0) % 60000) / 1000)).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="playlists-grid">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => fetchPlaylistDetails(playlist.id)}
              className="playlist-card"
            >
              <div className="playlist-card-image-wrapper">
                <img
                  src={playlist.images?.[0]?.url || '/placeholder-playlist.png'}
                  alt={playlist.name}
                />
                <button className="card-play-btn" title="Reproducir">
                  <i className="bi bi-play-fill" />
                </button>
              </div>
              <div className="playlist-card-info">
                <h3>{playlist.name}</h3>
                <p>{playlist.description || `De ${playlist.owner?.display_name}`}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;
