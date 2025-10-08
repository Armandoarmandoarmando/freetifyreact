import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPlaylists, getPlaylistDetails } from '../api';
import gsap from 'gsap';

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { accessToken } = useAuth();
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchPlaylists();
    }
  }, [accessToken]);

  const fetchPlaylists = async () => {
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
  };

  const fetchPlaylistDetails = async (playlistId) => {
    try {
      const data = await getPlaylistDetails(playlistId, accessToken);
      setSelectedPlaylist(data);
    } catch (err) {
      setError('Error al cargar detalles de la playlist');
      console.error('Error fetching playlist details:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(29, 185, 84, 0.3)',
          borderTop: '4px solid #1DB954',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
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
        gap: '20px'
      }}>
        <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc3545' }}></i>
        <p style={{ color: '#dc3545', textAlign: 'center' }}>{error}</p>
        <button
          onClick={fetchPlaylists}
          style={{
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '10px 20px',
            cursor: 'pointer'
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
          gap: '15px'
        }}>
          <i className="bi bi-music-note-list" style={{ color: '#1DB954' }}></i>
          Tus Playlists
        </h1>
        <p style={{ color: '#b3b3b3', margin: 0 }}>
          Tienes {playlists.length} playlists en tu biblioteca
        </p>
      </header>

      {selectedPlaylist ? (
        <div>
          <button
            onClick={() => setSelectedPlaylist(null)}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#b3b3b3',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="bi bi-arrow-left"></i>
            Volver a playlists
          </button>

          <div style={{
            background: 'linear-gradient(180deg, rgba(29, 185, 84, 0.2) 0%, rgba(18, 18, 18, 0.8) 100%)',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <img
                src={selectedPlaylist.images?.[0]?.url || '/placeholder-playlist.png'}
                alt={selectedPlaylist.name}
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '8px',
                  objectFit: 'cover'
                }}
              />
              <div>
                <h2 style={{ color: 'white', fontSize: '2rem', margin: '0 0 10px 0' }}>
                  {selectedPlaylist.name}
                </h2>
                <p style={{ color: '#b3b3b3', margin: '0 0 15px 0' }}>
                  {selectedPlaylist.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#b3b3b3', fontSize: '0.9rem' }}>
                  <span>{selectedPlaylist.owner?.display_name}</span>
                  <span>•</span>
                  <span>{selectedPlaylist.tracks?.total} canciones</span>
                  <span>•</span>
                  <span>{selectedPlaylist.followers?.total} seguidores</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>Canciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedPlaylist.tracks?.items?.slice(0, 20).map((item, index) => (
                <div
                  key={item.track?.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <span style={{ color: '#b3b3b3', width: '20px', fontSize: '0.9rem' }}>
                    {index + 1}
                  </span>
                  <img
                    src={item.track?.album?.images?.[2]?.url || '/placeholder-song.png'}
                    alt={item.track?.name}
                    style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '500' }}>
                      {item.track?.name}
                    </div>
                    <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
                      {item.track?.artists?.map(artist => artist.name).join(', ')}
                    </div>
                  </div>
                  <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
                    {item.track?.album?.name}
                  </div>
                  <div style={{ color: '#b3b3b3', fontSize: '0.9rem', width: '50px', textAlign: 'right' }}>
                    {Math.floor(item.track?.duration_ms / 60000)}:{String(Math.floor((item.track?.duration_ms % 60000) / 1000)).padStart(2, '0')}
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
          gap: '20px'
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
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.borderColor = 'rgba(29, 185, 84, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.borderColor = 'transparent';
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
                  marginBottom: '15px'
                }}
              />
              <h3 style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                margin: '0 0 8px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {playlist.name}
              </h3>
              <p style={{
                color: '#b3b3b3',
                fontSize: '0.85rem',
                margin: '0 0 10px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {playlist.description || `De ${playlist.owner?.display_name}`}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#b3b3b3',
                fontSize: '0.8rem'
              }}>
                <span>{playlist.tracks?.total} canciones</span>
                <i className="bi bi-play-circle" style={{ fontSize: '1.2rem', color: '#1DB954' }}></i>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;