import { useState, useEffect } from 'react';
import { searchContent } from '../api';
import gsap from 'gsap';
import { usePlayer } from '../contexts/PlayerContext';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('songs');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches] = useState([
    'Rock Alternativo',
    'Pop Latino',
    'Hip Hop Clásico',
    'Electrónica'
  ]);
  const { playTrack, currentTrack, status, pause, resume } = usePlayer();

  const isCurrentTrack = (item) => {
    if (!currentTrack) return false;
    if (item.spotify_track_id && currentTrack.spotifyTrackId) {
      return currentTrack.spotifyTrackId === item.spotify_track_id;
    }
    return currentTrack.title === item.nombre && (currentTrack.artists || []).includes(item.artista);
  };

  const handlePlaySong = (item) => {
    playTrack({
      nombre: item.nombre,
      artistas: item.artistas || (item.artista ? [item.artista] : []),
      album: item.album,
      imagen: item.imagen,
      spotify_track_id: item.spotify_track_id,
      duration_ms: item.duracion ? Math.round(item.duracion * 1000) : undefined,
    }).catch((err) => console.error('Error al reproducir la canción', err));
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

    if (item.url) {
      window.open(item.url, '_blank');
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
    gsap.from('.search-header', {
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
  const handleSearch = async () => {
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
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchType]);

  return (
    <div className="search-container" style={{
      padding: '20px',
      maxWidth: '1800px',
      margin: '0 auto'
    }}>
      {/* Búsqueda */}
      <div className="search-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#121212',
        padding: '20px 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            position: 'relative',
            flex: '1',
            maxWidth: '364px'
          }}>
            <i className="bi bi-search" style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#ffffff',
              fontSize: '1.2rem'
            }}></i>
            <input
              type="text"
              placeholder={`Buscar ${searchType === 'songs' ? 'canciones' : 'artistas'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 40px',
                borderRadius: '500px',
                border: 'none',
                backgroundColor: '#242424',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#323232';
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = '#242424';
              }}
            />
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            style={{
              padding: '12px 20px',
              borderRadius: '500px',
              border: 'none',
              backgroundColor: '#242424',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = '#323232';
              e.target.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#242424';
            }}
          >
            <option value="songs">Canciones</option>
            <option value="artist">Artistas</option>
          </select>
        </div>

        {/* Búsquedas recientes */}
        {!searchQuery && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '16px'
            }}>
              Búsquedas recientes
            </h2>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(search);
                    handleSearch();
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '500px',
                    backgroundColor: '#242424',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#323232';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#242424';
                    e.target.style.transform = 'scale(1)';
                  }}
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
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            Explorar todo
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '24px'
          }}>
            {categories.map((category, index) => (
              <div
                key={index}
                className="category-card"
                style={{
                  backgroundColor: category.color,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  aspectRatio: '1'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  padding: '5px 10px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '8px'
                  }}>
                    {category.name}
                  </h3>
                  <i className={category.icon} style={{
                    fontSize: '2rem',
                    transform: 'rotate(25deg)',
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
                  }}></i>
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
            <div style={{ 
              color: '#b3b3b3',
              display: 'flex',
              alignItems: 'center',
              gap: '10px' 
            }}>
              <i className="bi bi-arrow-repeat" style={{
                fontSize: '1.2rem',
                animation: 'spin 1s linear infinite'
              }}></i>
              <p>Buscando {searchType === 'songs' ? 'canciones' : 'artistas'}...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '16px'
              }}>
                Resultados para "{searchQuery}"
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {searchResults.map((item, index) => {
                  const current = isCurrentTrack(item);
                  const isSong = searchType === 'songs';
                  const isPlayingCurrent = current && status === 'playing';

                  return (
                    <div
                      key={`${item.spotify_track_id || item.nombre}-${index}`}
                      style={{
                        backgroundColor: '#242424',
                        borderRadius: '8px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#323232';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#242424';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onClick={() => handleCardClick(item)}
                    >
                      <div style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        {item.imagen ? (
                          <img
                            src={item.imagen}
                            alt={item.nombre || item.artista}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <i className={`bi ${isSong ? 'bi-music-note' : 'bi-person'}`}
                               style={{ fontSize: '2rem', color: '#1DB954' }}></i>
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
                            style={{
                              position: 'absolute',
                              right: '12px',
                              bottom: '12px',
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              border: 'none',
                              backgroundColor: 'rgba(29,185,84,0.9)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.4rem',
                              cursor: 'pointer',
                              boxShadow: current ? '0 8px 20px rgba(29,185,84,0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            {isPlayingCurrent ? <i className="bi bi-pause-fill"></i> : <i className="bi bi-play-fill" style={{ paddingLeft: '3px' }}></i>}
                          </button>
                        )}
                      </div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '4px',
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.nombre}
                      </h3>
                      {isSong && item.artista && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: current ? '#1DB954' : '#b3b3b3',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.artista}
                        </p>
                      )}
                      {current && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '0.75rem',
                          color: '#1DB954',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {status === 'playing' ? 'Reproduciendo' : status === 'paused' ? 'Pausado' : 'Cargando'}
                        </div>
                      )}
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
    </div>
  );
};

export default Search;
