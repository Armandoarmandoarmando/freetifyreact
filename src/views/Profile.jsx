import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, getUserTopTracks, getUserTopArtists } from '../api';
import gsap from 'gsap';
import { usePlayer } from '../contexts/PlayerContext';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [timeRange, setTimeRange] = useState('medium_term');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { accessToken, user } = useAuth();
  const containerRef = useRef(null);
  const { playTrack, currentTrack, status, pause, resume } = usePlayer();

  const timeRangeOptions = [
    { value: 'short_term', label: 'Último mes' },
    { value: 'medium_term', label: 'Últimos 6 meses' },
    { value: 'long_term', label: 'Desde siempre' }
  ];

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
      fetchAllData();
    }
  }, [accessToken, timeRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [profile, tracks, artists] = await Promise.all([
        getUserProfile(accessToken),
        getUserTopTracks(accessToken, timeRange, 10),
        getUserTopArtists(accessToken, timeRange, 10)
      ]);
      
      setProfileData(profile);
      setTopTracks(tracks.items || []);
      setTopArtists(artists.items || []);
    } catch (err) {
      setError('Error al cargar tu perfil');
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentTopTrack = (trackId) => currentTrack?.spotifyTrackId === trackId;

  const handleTopTrackClick = (track) => {
    if (!track) return;
    if (isCurrentTopTrack(track.id)) {
      if (status === 'playing') {
        pause();
      } else {
        resume();
      }
      return;
    }

    playTrack({
      nombre: track.name,
      artistas: track.artists?.map((artist) => artist.name) || [],
      album: track.album?.name,
      imagen: track.album?.images?.[0]?.url,
      spotify_track_id: track.id,
      duration_ms: track.duration_ms,
    }).catch((err) => console.error('Error al reproducir track', err));
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
        <p style={{ color: '#b3b3b3' }}>Cargando tu perfil...</p>
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
          onClick={fetchAllData}
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
      {/* Header del perfil */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(29, 185, 84, 0.3) 0%, rgba(18, 18, 18, 0.8) 100%)',
        borderRadius: '12px',
        padding: '40px',
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '30px'
      }}>
        <div style={{
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          backgroundColor: '#1DB954',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '4rem',
          color: 'white',
          fontWeight: 'bold',
          backgroundImage: profileData?.images?.[0]?.url ? `url(${profileData.images[0].url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          {!profileData?.images?.[0]?.url && (profileData?.display_name?.[0] || user?.display_name?.[0] || 'U')}
        </div>
        <div>
          <h1 style={{
            color: 'white',
            fontSize: '3rem',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            {profileData?.display_name || user?.display_name || 'Usuario'}
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            color: '#b3b3b3',
            fontSize: '1.1rem'
          }}>
            <span>
              <i className="bi bi-people" style={{ marginRight: '8px' }}></i>
              {profileData?.followers?.total?.toLocaleString() || 0} seguidores
            </span>
            <span>
              <i className="bi bi-geo-alt" style={{ marginRight: '8px' }}></i>
              {profileData?.country || 'N/A'}
            </span>
            <span>
              <i className="bi bi-spotify" style={{ marginRight: '8px', color: '#1DB954' }}></i>
              {profileData?.product || 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Selector de período */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '25px',
          padding: '4px',
          width: 'fit-content'
        }}>
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              style={{
                backgroundColor: timeRange === option.value ? '#1DB954' : 'transparent',
                color: timeRange === option.value ? 'white' : '#b3b3b3',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Top Tracks */}
        <div>
          <h2 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="bi bi-music-note" style={{ color: '#1DB954' }}></i>
            Tus canciones favoritas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topTracks.map((track, index) => {
              const isCurrent = isCurrentTopTrack(track.id);
              const isPlaying = isCurrent && status === 'playing';
              return (
              <div
                key={track.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: isCurrent ? 'rgba(29, 185, 84, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  transition: 'background-color 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = isCurrent ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = isCurrent ? 'rgba(29, 185, 84, 0.15)' : 'rgba(255, 255, 255, 0.05)'}
                onClick={() => handleTopTrackClick(track)}
              >
                <span style={{
                  color: isCurrent ? '#1DB954' : '#1DB954',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  width: '25px'
                }}>
                  {index + 1}
                </span>
                <img
                  src={track.album?.images?.[2]?.url || '/placeholder-song.png'}
                  alt={track.name}
                  style={{ width: '50px', height: '50px', borderRadius: '6px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: '500', fontSize: '0.95rem' }}>
                    {track.name}
                  </div>
                  <div style={{ color: '#b3b3b3', fontSize: '0.85rem' }}>
                    {track.artists?.map(artist => artist.name).join(', ')}
                  </div>
                </div>
                <div style={{ color: isCurrent ? '#1DB954' : '#b3b3b3', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isCurrent && (
                    <i className={`bi ${isPlaying ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'}`} style={{ fontSize: '1rem', color: '#1DB954' }}></i>
                  )}
                  {Math.floor(track.popularity)}% popularidad
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Top Artists */}
        <div>
          <h2 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="bi bi-person-heart" style={{ color: '#1DB954' }}></i>
            Tus artistas favoritos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topArtists.map((artist, index) => (
              <div
                key={artist.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  transition: 'background-color 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              >
                <span style={{
                  color: '#1DB954',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  width: '25px'
                }}>
                  {index + 1}
                </span>
                <img
                  src={artist.images?.[2]?.url || '/placeholder-artist.png'}
                  alt={artist.name}
                  style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: '500', fontSize: '0.95rem' }}>
                    {artist.name}
                  </div>
                  <div style={{ color: '#b3b3b3', fontSize: '0.85rem' }}>
                    {artist.genres?.slice(0, 2).join(', ') || 'Artista'}
                  </div>
                </div>
                <div style={{ color: '#b3b3b3', fontSize: '0.8rem' }}>
                  {artist.followers?.total?.toLocaleString() || 0} seguidores
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
