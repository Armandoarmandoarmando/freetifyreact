import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPlaylists, getPlaylistDetails } from '../api';
import gsap from 'gsap';
import { usePlayer } from '../contexts/PlayerContext';

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
    <div ref={containerRef} style={{ padding: '0 20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
        }}>
          <i className="bi bi-music-note-list" style={{ color: '#1DB954' }} />
          Tus Playlists
        </h1>
        <p style={{ color: '#b3b3b3', margin: 0 }}>
          Tienes {playlists.length} playlists en tu biblioteca
        </p>
      </header>

      {selectedPlaylist ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <button
        type="button"
        onClick={() => setSelectedPlaylist(null)}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#1DB954',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
            }}
          >
            <i className="bi bi-arrow-left" /> Volver a playlists
          </button>

          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <img
              src={selectedPlaylist.images?.[0]?.url || '/placeholder-playlist.png'}
              alt={selectedPlaylist.name}
              style={{ width: '220px', height: '220px', borderRadius: '12px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>
                Playlist
              </p>
              <h2 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 10px 0' }}>
                {selectedPlaylist.name}
              </h2>
              <p style={{ color: '#b3b3b3', maxWidth: '600px', marginBottom: '15px' }}>
                {selectedPlaylist.description || 'Playlist sin descripción.'}
              </p>
              <div style={{ color: '#b3b3b3', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.95rem' }}>
                <span>{selectedPlaylist.owner?.display_name}</span>
                <span>•</span>
                <span>{selectedPlaylist.tracks?.total} canciones</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePlayPlaylist}
                  disabled={!playlistTracks.length}
                  style={{
                    backgroundColor: '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    cursor: playlistTracks.length ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="bi bi-play-fill" />
                  Reproducir
                </button>

                <button
                  type="button"
                  onClick={handleShufflePlaylist}
                  disabled={!playlistTracks.length}
                  style={{
                    backgroundColor: isShuffle ? '#1DB954' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    cursor: playlistTracks.length ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="bi bi-shuffle" />
                  Reproducir aleatorio
                </button>

                <button
                  type="button"
                  onClick={cycleRepeatMode}
                  style={{
                    backgroundColor: repeatMode === 'off' ? 'rgba(255, 255, 255, 0.1)' : '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  title={repeatLabels[repeatMode]}
                >
                  <i className={repeatIcons[repeatMode]} />
                  {repeatLabels[repeatMode]}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>Canciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {playlistTracks.map((track, index) => (
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: isTrackSelected(track.spotify_track_id) ? 'rgba(29, 185, 84, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.3s ease',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isTrackSelected(track.spotify_track_id)
                      ? 'rgba(29, 185, 84, 0.35)'
                      : 'rgba(255, 255, 255, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isTrackSelected(track.spotify_track_id)
                      ? 'rgba(29, 185, 84, 0.25)'
                      : 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <span style={{ color: '#b3b3b3', width: '20px', fontSize: '0.9rem' }}>
                    {index + 1}
                  </span>
                  <img
                    src={track.imagen || '/placeholder-song.png'}
                    alt={track.nombre}
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '500' }}>
                      {track.nombre}
                      {isTrackSelected(track.spotify_track_id) && status === 'playing' && (
                        <span style={{ marginLeft: '8px', color: '#1DB954', fontSize: '0.8rem' }}>
                          Reproduciendo
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
                      {track.artistas.join(', ')}
                    </div>
                  </div>
                  <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
                    {track.album}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      enqueueTracks(track);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(29,185,84,0.15)',
                      color: '#1DB954',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    aria-label="Añadir a la cola"
                    title="Añadir a la cola"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(29,185,84,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(29,185,84,0.15)';
                    }}
                  >
                    <i className="bi bi-plus" style={{ fontSize: '1rem' }}></i>
                  </button>
                  <div style={{ color: '#b3b3b3', fontSize: '0.9rem', width: '50px', textAlign: 'right' }}>
                    {Math.floor((track.duration_ms || 0) / 60000)}:{String(Math.floor(((track.duration_ms || 0) % 60000) / 1000)).padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px',
        }}>
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => fetchPlaylistDetails(playlist.id)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(29, 185, 84, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <img
                src={playlist.images?.[0]?.url || '/placeholder-playlist.png'}
                alt={playlist.name}
                style={{
                  width: '100%',
                  height: '160px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  marginBottom: '15px',
                }}
              />
              <h3 style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                margin: '0 0 8px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {playlist.name}
              </h3>
              <p style={{
                color: '#b3b3b3',
                fontSize: '0.85rem',
                margin: '0 0 10px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {playlist.description || `De ${playlist.owner?.display_name}`}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#b3b3b3',
                fontSize: '0.8rem',
              }}>
                <span>{playlist.tracks?.total} canciones</span>
                <i className="bi bi-play-circle" style={{ fontSize: '1.2rem', color: '#1DB954' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;
