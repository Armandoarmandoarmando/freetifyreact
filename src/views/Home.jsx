import { useState, useRef, useLayoutEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../contexts/AuthContext';
import LoginPrompt from '../components/LoginPrompt';

const Home = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const containerRef = useRef(null);
  const { isAuthenticated, isGuest, user, logout } = useAuth();

  const navigationItems = [
    { 
      icon: 'bi-search', 
      label: 'Buscar', 
      path: 'search',
      allowGuest: true
    },
    { 
      icon: 'bi-music-note-list', 
      label: 'Playlists', 
      path: 'playlists',
      allowGuest: false,
      description: 'Accede a tus playlists personales de Spotify'
    },
    { 
      icon: 'bi-person', 
      label: 'Perfil', 
      path: 'profile',
      allowGuest: false,
      description: 'Ve tu perfil y estadísticas de Spotify'
    }
  ];

  const handleNavigation = (item) => {
    if (!item.allowGuest && !isAuthenticated) {
      setPromptMessage(item.description || 'Necesitas iniciar sesión para acceder a esta función');
      setShowLoginPrompt(true);
      return;
    }
    navigate(item.path);
  };

  useLayoutEffect(() => {
    // Animación de entrada
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Animar el drawer
      tl.from(drawerRef.current, {
        x: -240,
        duration: 0.8,
        ease: "power3.out"
      })
      // Animar el logo
      .from(".logo", {
        opacity: 0,
        y: -20,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.4")
      // Animar los items de navegación
      .from(".nav-item", {
        opacity: 1,
        x: 10,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out"
      }, "-=0.3")
      // Animar el contenido principal
      .from("main", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.5");

      
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100vh', backgroundColor: '#000000' }}>
      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          width: isDrawerOpen ? '240px' : '72px',
          backgroundColor: '#121212',
          height: '100%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
          position: 'relative'
        }}
      >
        {/* Logo */}
        <div className="logo" style={{
          padding: '0 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isDrawerOpen ? 'flex-start' : 'center'
        }}>
          {isDrawerOpen ? (
            <h1 style={{
              color: '#1DB954',
              fontSize: '1.5rem',
              margin: 0,
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="bi bi-spotify" style={{ fontSize: '1.8rem' }}></i>
              Freetify
            </h1>
          ) : (
            <div style={{
              color: '#1DB954',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: 'rgba(29, 185, 84, 0)',
              transition: 'all 0.3s ease'
            }}>
              <i className="bi bi-spotify" style={{ fontSize: '1.8rem' }}></i>
            </div>
          )}
        </div>

        {/* User Status */}
        {isDrawerOpen && (
          <div style={{
            padding: '0 20px',
            marginBottom: '20px'
          }}>
            {isAuthenticated ? (
              <div style={{
                backgroundColor: 'rgba(29, 185, 84, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid rgba(29, 185, 84, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <i className="bi bi-person-check" style={{ color: '#1DB954', fontSize: '1rem' }}></i>
                  <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500' }}>
                    {user?.display_name || 'Usuario Premium'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#b3b3b3',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#b3b3b3';
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : isGuest ? (
              <div style={{
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <i className="bi bi-person" style={{ color: '#ffc107', fontSize: '1rem' }}></i>
                  <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500' }}>
                    Modo Invitado
                  </span>
                </div>
                <p style={{
                  color: '#b3b3b3',
                  fontSize: '0.75rem',
                  margin: '0 0 8px 0',
                  lineHeight: '1.2'
                }}>
                  Funciones limitadas disponibles
                </p>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    backgroundColor: '#1DB954',
                    border: 'none',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1ed760';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#1DB954';
                  }}
                >
                  Iniciar sesión
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '0 12px'
        }}>
          {navigationItems.map((item) => (
            <button
              key={item.path}
              className="nav-item"
              onClick={() => handleNavigation(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: (!item.allowGuest && !isAuthenticated) ? '#666' : 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                textAlign: 'left',
                overflow: 'hidden',
                borderRadius: '8px',
                fontSize: '15px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!item.allowGuest && !isAuthenticated) {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.target.style.color = '#999';
                } else {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.target.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'translateX(0)';
                e.target.style.color = (!item.allowGuest && !isAuthenticated) ? '#666' : 'white';
              }}
            >
              <i className={`${item.icon}`} style={{ 
                fontSize: '1.3rem',
                opacity: (!item.allowGuest && !isAuthenticated) ? 0.4 : 0.9,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}></i>
              <span style={{
                opacity: isDrawerOpen ? 1 : 0,
                transition: 'opacity 0.3s ease',
                whiteSpace: 'nowrap',
                fontWeight: '500'
              }}>
                {item.label}
              </span>
              {(!item.allowGuest && !isAuthenticated) && isDrawerOpen && (
                <i className="bi bi-lock-fill" style={{
                  fontSize: '0.8rem',
                  opacity: 0.6,
                  marginLeft: 'auto'
                }}></i>
              )}
            </button>
          ))}
        </nav>

        {/* Toggle Drawer Button */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '20px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#00000000',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: isDrawerOpen ? 'rotate(0deg)' : 'rotate(180deg)',
            zIndex: 10,
            boxShadow: '0 rgba(29, 185, 84, 0.42)'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#00000000';
            e.target.style.transform = isDrawerOpen ? 
              'rotate(0deg) scale(1.1)' : 
              'rotate(180deg) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#00000000';
            e.target.style.transform = isDrawerOpen ? 
              'rotate(0deg) scale(1)' : 
              'rotate(180deg) scale(1)';
          }}
        >
          <i className={`bi ${isDrawerOpen ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
        </button>
      </div>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        backgroundColor: '#121212',
        color: 'white'
      }}>
        <Outlet />
      </main>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <LoginPrompt
          message={promptMessage}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
    </div>
  );
};

export default Home;