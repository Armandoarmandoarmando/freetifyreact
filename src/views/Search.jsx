import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { searchContent } from '../api';
import gsap from 'gsap';
import { usePlayer } from '../contexts/PlayerContext';
import './Search.css';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('songs');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const navigate = useNavigate();
  const [recentSearches] = useState([
    'Rock Alternativo',
    'Pop Latino',
    'Hip Hop Clásico',
    'Electrónica'
  ]);
  const { playTrack, enqueueTracks, currentTrack, status, pause, resume } = usePlayer();

  const buildTrackPayload = (item) => ({
    nombre: item.nombre,
    artistas: item.artistas || (item.artista ? [item.artista] : []),
    album: item.album,
    imagen: item.imagen,
    spotify_track_id: item.spotify_track_id,
    duration_ms: item.duration_ms ?? (item.duracion ? Math.round(item.duracion * 1000) : undefined),
  });

  const isCurrentTrack = (item) => {
    if (!currentTrack) return false;
    if (item.spotify_track_id && currentTrack.spotifyTrackId) {
      return currentTrack.spotifyTrackId === item.spotify_track_id;
    }
    return currentTrack.title === item.nombre && (currentTrack.artists || []).includes(item.artista);
  };

  const handlePlaySong = (item) => {
    playTrack(buildTrackPayload(item)).catch((err) => console.error('Error al reproducir la canción', err));
  };

  const handleAddToQueue = (item) => {
    enqueueTracks(buildTrackPayload(item));
  };

  const handleCardClick = (item) => {
    if (searchType === 'songs') {
      if (isCurrentTrack(item)) {
        if (status === 'playing') {
          pause();
        } else {
          resume();
        }
      } else {
        handlePlaySong(item);
      }
      return;
    }

    const artistLabel = item.artista || (Array.isArray(item.artistas) ? item.artistas[0] : null) || item.nombre;
    if (artistLabel) {
      const encodedArtist = encodeURIComponent(artistLabel);
      navigate(`/home/artist/${encodedArtist}`);
      return;
    }

    if (item.url) {
      window.open(item.url, '_blank', 'noopener');
    }
  };

  const categories = [
    { name: 'Podcasts', color: '#E13300', icon: 'bi bi-mic' },
    { name: 'En directo', color: '#7358FF', icon: 'bi bi-broadcast' },
    { name: 'Made for you', color: '#1E3264', icon: 'bi bi-person-heart' },
    { name: 'Nuevos lanzamientos', color: '#E8115B', icon: 'bi bi-music-note' },
    { name: 'Pop', color: '#148A08', icon: 'bi bi-vinyl' },
    { name: 'Hip-Hop', color: '#BC5900', icon: 'bi bi-boombox' },
    { name: 'Rock', color: '#E91429', icon: 'bi bi-guitar' },
    { name: 'Latino', color: '#8400E7', icon: 'bi bi-music-player' },
    { name: 'Electrónica', color: '#509BF5', icon: 'bi bi-soundwave' }
  ];

  useEffect(() => {
    // Animación de entrada
    gsap.from('.search-header-sticky', {
      y: -20,
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out'
    });

    gsap.from('.category-card', {
      y: 30,
      opacity: 1,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out'
    });
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await searchContent(searchQuery, searchType);
      setSearchResults(response.body || []);
    } catch (error) {
      console.error('Error al buscar:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchType, handleSearch]);

  return (
    <div className="search-container">
      {/* Search Header */}
      <div className="search-header-sticky">
        <div className="search-controls-row">
          <div className="search-input-wrapper">
            <i className="bi bi-search search-input-icon" />
            <input
              type="text"
              placeholder={`Buscar ${searchType === 'songs' ? 'canciones' : 'artistas'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            type="button"
            className="search-filter-btn"
            onClick={() => setIsFilterModalOpen(true)}
            title="Filtrar búsqueda"
          >
            <i className="bi bi-funnel" />
          </button>
        </div>

        {/* Búsquedas recientes */}
        {!searchQuery && (
          <div style={{ marginBottom: '32px' }}>
            <h2 className="section-title">Búsquedas recientes</h2>
            <div className="recent-searches-list">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(search);
                    setSearchType('songs');
                  }}
                  className="recent-btn"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categorías */}
      {!searchQuery && (
        <div>
          <h2 className="section-title">Explorar todo</h2>
          <div className="categories-grid">
            {categories.map((category, index) => (
              <div
                key={index}
                className="category-card"
                style={{ backgroundColor: category.color }}
              >
                <div className="category-content">
                  <h3 className="category-title">{category.name}</h3>
                  <i className={`${category.icon} category-icon`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {searchQuery && (
        <div style={{ marginTop: '24px' }}>
          {isLoading ? (
            <div className="search-loading">
              <i className="bi bi-arrow-repeat" />
              <p>Buscando {searchType === 'songs' ? 'canciones' : 'artistas'}...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <h2 className="section-title">Resultados para "{searchQuery}"</h2>
              <div className="search-results-grid">
                {searchResults.map((item, index) => {
                  const current = isCurrentTrack(item);
                  const isSong = searchType === 'songs';
                  const isPlayingCurrent = current && status === 'playing';

                  return (
                    <div
                      key={`${item.spotify_track_id || item.nombre}-${index}`}
                      className="search-result-card"
                      onClick={() => handleCardClick(item)}
                    >
                      <div className="search-result-card-image-wrapper">
                        {item.imagen ? (
                          <img src={item.imagen} alt={item.nombre || item.artista} />
                        ) : (
                          <div className="search-result-fallback">
                            <i
                              className={`bi ${isSong ? 'bi-music-note' : 'bi-person'}`}
                              style={{ fontSize: '3rem', color: '#1DB954' }}
                            />
                          </div>
                        )}
                        {isSong && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (current) {
                                if (status === 'playing') {
                                  pause();
                                } else {
                                  resume();
                                }
                              } else {
                                handlePlaySong(item);
                              }
                            }}
                            className={`search-result-play-btn ${isPlayingCurrent ? 'playing' : ''}`}
                            title={isPlayingCurrent ? "Pausar" : "Reproducir"}
                          >
                            {isPlayingCurrent ? <i className="bi bi-pause-fill" /> : <i className="bi bi-play-fill" />}
                          </button>
                        )}
                      </div>

                      <h3 className="search-result-title">{item.nombre}</h3>

                      {isSong && item.artista && (
                        <p className={`search-result-subtitle ${current ? 'playing-text' : ''}`}>
                          {item.artista}
                        </p>
                      )}

                      <div className="search-result-footer">
                        {current ? (
                          <div className="search-status-label">
                            {status === 'playing' ? 'Reproduciendo' : status === 'paused' ? 'Pausado' : 'Cargando'}
                          </div>
                        ) : (
                          <div /> /* Empty div to preserve flex layout if needed */
                        )}

                        {isSong && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddToQueue(item);
                            }}
                            className="add-queue-result-btn"
                            aria-label="Añadir a la cola"
                            title="Añadir a la cola"
                          >
                            <i className="bi bi-plus-circle" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: '#b3b3b3' }}>
              No se encontraron resultados para "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Filter Bottom Sheet Modal */}
      {isFilterModalOpen && createPortal(
        <div className="bottom-sheet-overlay" onClick={() => setIsFilterModalOpen(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3>Filtrar por</h3>
              <button
                type="button"
                className="close-sheet-btn"
                onClick={() => setIsFilterModalOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="bottom-sheet-options">
              <button
                type="button"
                className={`filter-option-btn ${searchType === 'songs' ? 'active' : ''}`}
                onClick={() => {
                  setSearchType('songs');
                  setIsFilterModalOpen(false);
                }}
              >
                <div className="filter-option-icon">
                  <i className="bi bi-music-note" />
                </div>
                <div className="filter-option-text">
                  Canciones
                  {searchType === 'songs' && <i className="bi bi-check-circle-fill check-icon" />}
                </div>
              </button>

              <button
                type="button"
                className={`filter-option-btn ${searchType === 'artist' ? 'active' : ''}`}
                onClick={() => {
                  setSearchType('artist');
                  setIsFilterModalOpen(false);
                }}
              >
                <div className="filter-option-icon">
                  <i className="bi bi-person" />
                </div>
                <div className="filter-option-text">
                  Artistas
                  {searchType === 'artist' && <i className="bi bi-check-circle-fill check-icon" />}
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Search;
