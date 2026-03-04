import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';
import { getUserProfile, getUserTopTracks, getUserTopArtists } from '../api';
import gsap from 'gsap';
import { usePlayer } from '../contexts/PlayerContext';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [timeRange, setTimeRange] = useState('medium_term');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const { accessToken, user, logout } = useAuth();
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const {
    playTrack,
    enqueueTracks,
    currentTrack,
    status,
    pause,
    resume,
    audioSettings,
    updateAudioSettings,
  } = usePlayer();

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

  const fetchAllData = useCallback(async () => {
    try {
      if (isFirstLoad.current) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }

      const [profile, tracks, artists] = await Promise.all([
        getUserProfile(accessToken),
        getUserTopTracks(accessToken, timeRange, 10),
        getUserTopArtists(accessToken, timeRange, 10)
      ]);

      setProfileData(profile);
      setTopTracks(tracks.items || []);
      setTopArtists(artists.items || []);
      isFirstLoad.current = false;
    } catch (err) {
      setError('Error al cargar tu perfil');
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  }, [accessToken, timeRange]);

  useEffect(() => {
    if (accessToken) {
      fetchAllData();
    }
  }, [accessToken, timeRange, fetchAllData]);

  const isCurrentTopTrack = (trackId) => currentTrack?.spotifyTrackId === trackId;

  const mapTopTrackToPayload = (track) => ({
    nombre: track.name,
    artistas: track.artists?.map((artist) => artist.name) || [],
    album: track.album?.name,
    imagen: track.album?.images?.[0]?.url,
    spotify_track_id: track.id,
    duration_ms: track.duration_ms,
  });

  const openArtistTab = useCallback((artistLabel) => {
    if (!artistLabel) return;
    const encodedArtist = encodeURIComponent(artistLabel);
    navigate(`/home/artist/${encodedArtist}`);
  }, [navigate]);

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

    playTrack(mapTopTrackToPayload(track)).catch((err) => console.error('Error al reproducir track', err));
  };

  const handleQueueTopTrack = (event, track) => {
    event.stopPropagation();
    enqueueTracks(mapTopTrackToPayload(track));
  };

  const handleBoostToggle = useCallback((event) => {
    updateAudioSettings({ volumeBoostEnabled: event.target.checked });
  }, [updateAudioSettings]);

  const handleBoostAmountChange = useCallback((event) => {
    const amount = Number.parseFloat(event.target.value);
    if (Number.isFinite(amount)) {
      updateAudioSettings({ boostAmount: amount });
    }
  }, [updateAudioSettings]);

  const handleCrossfadeToggle = useCallback((event) => {
    updateAudioSettings({ crossfadeEnabled: event.target.checked });
  }, [updateAudioSettings]);

  const handleCrossfadeSecondsChange = useCallback((event) => {
    const seconds = Number.parseFloat(event.target.value);
    if (Number.isFinite(seconds)) {
      updateAudioSettings({ crossfadeSeconds: seconds });
    }
  }, [updateAudioSettings]);

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
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button
            onClick={logout}
            style={{
              backgroundColor: 'transparent',
              color: '#b3b3b3',
              border: '1px solid #b3b3b3',
              borderRadius: '25px',
              padding: '10px 20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#b3b3b3';
              e.currentTarget.style.borderColor = '#b3b3b3';
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="profile-container">
      {/* Header del perfil */}
      <div className="profile-header">
        <div
          className="profile-avatar"
          role="button"
          tabIndex={0}
          onClick={() => setShowAudioSettings((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowAudioSettings((prev) => !prev);
            }
          }}
          title="Abrir ajustes de audio"
          style={{
            backgroundImage: profileData?.images?.[0]?.url ? `url(${profileData.images[0].url})` : 'none',
          }}
        >
          {!profileData?.images?.[0]?.url && (profileData?.display_name?.[0] || user?.display_name?.[0] || 'U')}
          <span className="profile-avatar-settings-badge" aria-hidden="true">
            <i className="bi bi-sliders"></i>
          </span>
        </div>
        <div className="profile-info">
          <h1>
            {profileData?.display_name || user?.display_name || 'Usuario'}
          </h1>
          <div className="profile-stats">
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
          <button
            onClick={logout}
            style={{
              marginTop: '16px',
              alignSelf: 'flex-start',
              backgroundColor: 'transparent',
              color: '#b3b3b3',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '25px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#b3b3b3';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <i className="bi bi-box-arrow-right"></i>
            Cerrar sesión
          </button>
        </div>
      </div>

      {showAudioSettings && (
        <section className="audio-settings-panel">
          <div className="audio-settings-header">
            <h2>
              <i className="bi bi-sliders" style={{ color: '#1DB954' }}></i>
              Ajustes de reproducción
            </h2>
            <button
              type="button"
              className="audio-settings-close-btn"
              onClick={() => setShowAudioSettings(false)}
            >
              Cerrar
            </button>
          </div>

          <div className="audio-setting-row">
            <div className="audio-setting-copy">
              <h3>Forzar volumen alto</h3>
              <p>Sube la salida para canciones con mezcla baja (usa procesamiento de audio).</p>
            </div>
            <label className="audio-toggle">
              <input
                type="checkbox"
                checked={Boolean(audioSettings?.volumeBoostEnabled)}
                onChange={handleBoostToggle}
              />
              <span>{audioSettings?.volumeBoostEnabled ? 'Activado' : 'Desactivado'}</span>
            </label>
          </div>

          <div className="audio-setting-row">
            <div className="audio-setting-copy">
              <h3>Intensidad del refuerzo</h3>
              <p>Controla cuánto se amplifica el audio cuando el refuerzo está activo.</p>
            </div>
            <div className="audio-slider-block">
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={audioSettings?.boostAmount ?? 1.35}
                onChange={handleBoostAmountChange}
                disabled={!audioSettings?.volumeBoostEnabled}
              />
              <span>{(audioSettings?.boostAmount ?? 1.35).toFixed(2)}x</span>
            </div>
          </div>

          <div className="audio-setting-row">
            <div className="audio-setting-copy">
              <h3>Crossfade al cambiar canción</h3>
              <p>Aplica un fundido entre canciones para transiciones menos bruscas.</p>
            </div>
            <label className="audio-toggle">
              <input
                type="checkbox"
                checked={Boolean(audioSettings?.crossfadeEnabled)}
                onChange={handleCrossfadeToggle}
              />
              <span>{audioSettings?.crossfadeEnabled ? 'Activado' : 'Desactivado'}</span>
            </label>
          </div>

          <div className="audio-setting-row">
            <div className="audio-setting-copy">
              <h3>Duración del crossfade</h3>
              <p>Define cuántos segundos dura el fundido de salida y entrada.</p>
            </div>
            <div className="audio-slider-block">
              <input
                type="range"
                min={0.5}
                max={8}
                step={0.5}
                value={audioSettings?.crossfadeSeconds ?? 2}
                onChange={handleCrossfadeSecondsChange}
                disabled={!audioSettings?.crossfadeEnabled}
              />
              <span>{(audioSettings?.crossfadeSeconds ?? 2).toFixed(1)}s</span>
            </div>
          </div>
        </section>
      )}

      {/* Selector de período */}
      <div className="time-range-wrapper">
        <div className="time-range-selector">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={`time-range-btn ${timeRange === option.value ? 'active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="profile-grid"
        style={{
          opacity: isUpdating ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: isUpdating ? 'none' : 'auto'
        }}
      >
        {/* Top Tracks */}
        <div className="list-section">
          <h2>
            <i className="bi bi-music-note" style={{ color: '#1DB954' }}></i>
            Tus canciones favoritas
          </h2>
          <div className="list-container">
            {topTracks.map((track, index) => {
              const isCurrent = isCurrentTopTrack(track.id);
              const isPlaying = isCurrent && status === 'playing';
              return (
                <div
                  key={track.id}
                  className={`list-item ${isCurrent ? 'current' : ''}`}
                  onClick={() => handleTopTrackClick(track)}
                >
                  <span className="item-index">
                    {index + 1}
                  </span>
                  <img
                    src={track.album?.images?.[2]?.url || '/placeholder-song.png'}
                    alt={track.name}
                    className="item-image"
                  />
                  <div className="item-details">
                    <div className="item-name">
                      {track.name}
                    </div>
                    <div className="item-subtitle">
                      {track.artists?.map(artist => artist.name).join(', ')}
                    </div>
                  </div>
                  <div className="item-actions">
                    <div className={`item-popularity ${isCurrent ? 'current' : ''}`}>
                      {isCurrent && (
                        <i className={`bi ${isPlaying ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'}`} style={{ fontSize: '1rem', color: '#1DB954' }}></i>
                      )}
                      {Math.floor(track.popularity)}% popularidad
                    </div>
                    <button
                      type="button"
                      onClick={(event) => handleQueueTopTrack(event, track)}
                      className="add-queue-btn"
                      aria-label="Añadir a la cola"
                      title="Añadir a la cola"
                    >
                      <i className="bi bi-plus" style={{ fontSize: '1rem' }}></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Artists */}
        <div className="list-section">
          <h2>
            <i className="bi bi-person-heart" style={{ color: '#1DB954' }}></i>
            Tus artistas favoritos
          </h2>
          <div className="list-container">
            {topArtists.map((artist, index) => (
              <div
                key={artist.id}
                className="list-item"
                onClick={() => openArtistTab(artist.name)}
              >
                <span className="item-index">
                  {index + 1}
                </span>
                <img
                  src={artist.images?.[2]?.url || '/placeholder-artist.png'}
                  alt={artist.name}
                  className="item-image artist-image"
                />
                <div className="item-details">
                  <div className="item-name">
                    {artist.name}
                  </div>
                  <div className="item-subtitle">
                    {artist.genres?.slice(0, 2).join(', ') || 'Artista'}
                  </div>
                </div>
                <div className="item-popularity">
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
