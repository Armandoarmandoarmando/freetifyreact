import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchArtistSongs } from '../api';
import { usePlayer } from '../contexts/PlayerContext';
import './ArtistSongs.css';

const ArtistSongs = () => {
  const { artistName = '' } = useParams();
  const decodedArtistName = useMemo(() => decodeURIComponent(artistName), [artistName]);
  const navigate = useNavigate();

  // New State variables according to redesigned API
  const [artistInfo, setArtistInfo] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [similarArtists, setSimilarArtists] = useState([]);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { playTrack, enqueueTracks, currentTrack, status, pause, resume } = usePlayer();

  useEffect(() => {
    if (!decodedArtistName.trim()) {
      setTopTracks([]);
      setAlbums([]);
      setArtistInfo(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchArtistSongs(decodedArtistName)
      .then((data) => {
        if (!isMounted) return;
        const body = data?.body || {};

        // Old api compatibility vs New API Check
        if (Array.isArray(body)) {
          setTopTracks(body.slice(0, 5));
          setAlbums([]);
          setArtistInfo({ name: decodedArtistName, image: body[0]?.imagen });
        } else {
          setTopTracks(body.top_tracks || []);
          setAlbums(body.albums || []);
          setSimilarArtists(body.similar_artists || []);
          setArtistInfo(body.artist || { name: decodedArtistName });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('No se pudieron cargar los datos del artista', err);
        setError('No se pudieron cargar los datos del artista');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [decodedArtistName]);

  const buildTrackPayload = useCallback((item) => ({
    nombre: item?.nombre,
    artistas: item?.artistas || (item?.artista ? [item.artista] : []),
    album: item?.album,
    imagen: item?.imagen,
    spotify_track_id: item?.spotify_track_id,
    duration_ms: item?.duration_ms ?? (typeof item?.duracion === 'number' ? Math.round(item.duracion * 1000) : undefined),
    url: item?.url,
  }), []);

  const isCurrentTrack = useCallback((item) => {
    if (!currentTrack) return false;
    const payload = buildTrackPayload(item);
    if (!payload) return false;

    if (payload.spotify_track_id && currentTrack.spotifyTrackId) {
      return payload.spotify_track_id === currentTrack.spotifyTrackId;
    }

    return (
      currentTrack.title === payload.nombre &&
      (currentTrack.artists || []).some((artist) => payload.artistas?.includes(artist))
    );
  }, [buildTrackPayload, currentTrack]);

  const handlePlay = useCallback((item) => {
    playTrack(buildTrackPayload(item)).catch((err) => console.error('Error al reproducir la canción', err));
  }, [buildTrackPayload, playTrack]);

  const handleTogglePlayback = useCallback((item) => {
    if (!currentTrack) {
      handlePlay(item);
      return;
    }

    if (isCurrentTrack(item)) {
      if (status === 'playing') {
        pause();
      } else {
        resume();
      }
      return;
    }

    handlePlay(item);
  }, [currentTrack, handlePlay, isCurrentTrack, pause, resume, status]);

  const handleAddToQueue = useCallback((item) => {
    enqueueTracks(buildTrackPayload(item));
  }, [buildTrackPayload, enqueueTracks]);

  const formatDuration = (ms) => {
    if (!ms) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const heroImage = artistInfo?.image || (topTracks.length > 0 ? topTracks[0]?.imagen : null);
  const displayName = artistInfo?.name || decodedArtistName;

  return (
    <div className="artist-view-container">
      {/* Hero Header Section */}
      <section
        className="artist-hero-section"
        style={{
          background: heroImage
            ? `linear-gradient(120deg, rgba(18,18,18,0.92), rgba(18,18,18,0.65)), url(${heroImage}) center/cover`
            : 'linear-gradient(140deg, rgba(29,185,84,0.18) 0%, rgba(25,25,25,0.85) 80%)'
        }}
      >
        <div className="artist-hero-content" style={{ backdropFilter: heroImage ? 'blur(1px)' : 'none' }}>
          <div className="artist-hero-image-wrapper">
            {heroImage ? (
              <img src={heroImage} alt={displayName} />
            ) : (
              <i className="bi bi-person-heart" style={{ fontSize: '3rem', color: '#1DB954' }}></i>
            )}
          </div>

          <div className="artist-hero-info">
            <p className="artist-label">Artista Verificado</p>
            <h1 className="artist-name-title">{displayName}</h1>
            <div className="artist-stats-row">
              {topTracks.length > 0 && (
                <span>
                  <i className="bi bi-music-note-beamed" style={{ marginRight: '6px', color: '#1DB954' }}></i>
                  Top Hits Disponibles
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* States handler */}
      {isLoading ? (
        <div style={{ color: '#b3b3b3', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: '1.2rem', animation: 'spin 1s linear infinite' }}></i>
          <p style={{ margin: 0 }}>Cargando perfil del artista...</p>
        </div>
      ) : error ? (
        <div style={{ color: '#ff7675', backgroundColor: 'rgba(255, 118, 117, 0.15)', padding: '16px', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Top 5 Canciones Section */}
          {topTracks.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <div className="artist-section-header">
                <h2 className="artist-section-title">Populares</h2>
              </div>

              <div className="top-tracks-list">
                {topTracks.map((item, index) => {
                  const current = isCurrentTrack(item);
                  const isPlaying = current && status === 'playing';

                  return (
                    <div
                      key={`top-${item.spotify_track_id || index}`}
                      className={`track-list-item ${current ? 'playing-item' : ''}`}
                      onClick={() => handleTogglePlayback(item)}
                    >
                      <div className="track-number">{index + 1}</div>

                      <div className="track-image-container">
                        {item.imagen ? (
                          <img src={item.imagen} alt={item.nombre} />
                        ) : (
                          <i className="bi bi-music-note" style={{ color: '#1DB954' }}></i>
                        )}
                        <div className="track-play-overlay">
                          <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'} fs-4`}></i>
                        </div>
                      </div>

                      <div className="track-info-col">
                        <h3 className="track-title-list">{item.nombre}</h3>
                        <p className="track-album-list">{item.album}</p>
                      </div>

                      <div className="track-actions-col">
                        <span className="track-duration">
                          {formatDuration(item.duration_ms)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToQueue(item);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: current ? '#1DB954' : '#b3b3b3',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                          }}
                          title="Añadir a la cola"
                          onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                          onMouseLeave={(e) => e.currentTarget.style.color = current ? '#1DB954' : '#b3b3b3'}
                        >
                          <i className="bi bi-plus-circle"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Álbumes Section */}
          {albums.length > 0 && (
            <div>
              <div className="artist-section-header">
                <h2 className="artist-section-title">Discografía</h2>
                <button
                  className="albums-header-action"
                  onClick={() => setShowAllAlbums(!showAllAlbums)}
                >
                  {showAllAlbums ? 'Mostrar menos' : 'Ver todos'}
                </button>
              </div>

              <div className={`albums-container ${showAllAlbums ? 'grid-view' : ''}`}>
                {albums.map((album, idx) => (
                  <div
                    key={`album-${album.album_id || idx}`}
                    className="album-card"
                  >
                    <div className="album-image-wrapper">
                      {album.imagen ? (
                        <img src={album.imagen} alt={album.nombre} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#282828' }}>
                          <i className="bi bi-disc" style={{ fontSize: '3rem', color: '#555' }}></i>
                        </div>
                      )}
                    </div>
                    <h4 className="album-title" title={album.nombre}>{album.nombre}</h4>
                    <p className="album-year">
                      {album.fecha_lanzamiento ? album.fecha_lanzamiento.substring(0, 4) : ''} • {album.album_type === 'single' ? 'Sencillo' : 'Álbum'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artistas Similares Section */}
          {similarArtists.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div className="artist-section-header">
                <h2 className="artist-section-title">Artistas Similares</h2>
              </div>
              <div className="albums-container grid-view">
                {similarArtists.map((artist, idx) => (
                  <div
                    key={`similar-${artist.id || idx}`}
                    className="album-card"
                    style={{ textAlign: 'center' }}
                    onClick={() => {
                      const encodedArtist = encodeURIComponent(artist.nombre);
                      navigate(`/home/artist/${encodedArtist}`);
                    }}
                  >
                    <div className="album-image-wrapper" style={{ borderRadius: '50%' }}>
                      {artist.imagen ? (
                        <img src={artist.imagen} alt={artist.nombre} style={{ borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#282828', borderRadius: '50%' }}>
                          <i className="bi bi-person" style={{ fontSize: '3rem', color: '#555' }}></i>
                        </div>
                      )}
                    </div>
                    <h4 className="album-title" title={artist.nombre}>{artist.nombre}</h4>
                    <p className="album-year">Artista</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArtistSongs;
