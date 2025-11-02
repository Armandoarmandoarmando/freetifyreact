import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from 'gsap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const [requestedScopes, setRequestedScopes] = useState([]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  // Verificar errores en URL
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      const errorMessages = {
        'access_denied': 'Usuario canceló la autorización',
        'invalid_state': 'Error de seguridad en la autenticación',
        'token_error': 'Error al obtener tokens de Spotify',
        'server_error': 'Error interno del servidor'
      };
      setError(errorMessages[urlError] || 'Error en la autenticación');
    }
  }, [searchParams]);

  // Animación de entrada
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.fromTo(containerRef.current, 
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" }
      )
      .fromTo(formRef.current, 
        { y: 50, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
        "-=0.3"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const loadScopes = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/debug`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data?.scopes) {
          setRequestedScopes(
            data.scopes
              .split(/\s+/)
              .filter(Boolean)
          );
        }
      } catch (err) {
        console.warn('No se pudieron cargar los scopes de Spotify', err);
      }
    };

    loadScopes();
  }, []);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Llamar al endpoint de login del backend
      const response = await fetch(`${API_URL}/auth/login`);
      const data = await response.json();
      
      if (response.ok) {
        // Redirigir a Spotify OAuth
        window.location.href = data.auth_url;
      } else {
        setError("Error al iniciar sesión con Spotify");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div 
      ref={containerRef} 
      style={{
        minHeight: '100vh',
        background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        padding: "20px"
      }}
    >
      {/* Fondo con efecto de música */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundImage: "url(https://img.freepik.com/vector-gratis/fondo-pentagrama-musical-brillante-notas-sonido_1017-31220.jpg?w=740)",
        backgroundSize: "cover",
        opacity: 0.1,
        filter: "blur(5px)"
      }} />

      <div 
        ref={formRef}
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          padding: "3rem",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "450px",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
          position: "relative",
          zIndex: 1
        }}
      >
        {/* Logo de Spotify */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "1rem"
        }}>
          <i className="bi bi-spotify" style={{
            fontSize: "3rem",
            color: "#1DB954"
          }}></i>
          <h1 style={{
            color: "white",
            fontSize: "2.5rem",
            fontWeight: "700",
            margin: 0,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
          }}>
            Freetify
          </h1>
        </div>

        <div style={{
          textAlign: "center",
          marginBottom: "1rem"
        }}>
          <h2 style={{
            color: "white",
            fontSize: "1.5rem",
            fontWeight: "600",
            margin: "0 0 0.5rem 0"
          }}>
            Conecta con Spotify
          </h2>
          <p style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "1rem",
            margin: 0,
            lineHeight: "1.4"
          }}>
            Accede a tu música, playlists y más con tu cuenta de Spotify
          </p>
        </div>

        {requestedScopes.length > 0 && (
          <div style={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            color: '#d9d9d9'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}>
              Permisos solicitados para habilitar tus favoritos, biblioteca y seguimiento:
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: '0.35rem'
            }}>
              {requestedScopes.map((scope) => (
                <li key={scope} style={{
                  fontSize: '0.85rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '12px',
                  padding: '0.45rem 0.75rem'
                }}>
                  {scope}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: "rgba(220, 53, 69, 0.1)",
            border: "1px solid rgba(220, 53, 69, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            width: "100%",
            textAlign: "center"
          }}>
            <p style={{
              color: "#dc3545",
              margin: 0,
              fontSize: "0.9rem"
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Spotify Login Button */}
        <button
          onClick={handleSpotifyLogin}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "1rem 1.5rem",
            backgroundColor: "#1DB954",
            color: "white",
            border: "none",
            borderRadius: "50px",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            opacity: isLoading ? 0.7 : 1,
            boxShadow: "0 4px 15px rgba(29, 185, 84, 0.3)"
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.backgroundColor = "#1ed760";
              e.target.style.boxShadow = "0 6px 20px rgba(29, 185, 84, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.target.style.transform = "translateY(0)";
              e.target.style.backgroundColor = "#1DB954";
              e.target.style.boxShadow = "0 4px 15px rgba(29, 185, 84, 0.3)";
            }
          }}
        >
          {isLoading ? (
            <>
              <i className="bi bi-arrow-clockwise" style={{
                fontSize: "1.2rem",
                animation: "spin 1s linear infinite"
              }}></i>
              Conectando...
            </>
          ) : (
            <>
              <i className="bi bi-spotify" style={{ fontSize: "1.2rem" }}></i>
              Iniciar sesión con Spotify
            </>
          )}
        </button>

        {/* Back to Guest */}
        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: "transparent",
            color: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "50px",
            padding: "0.75rem 1.5rem",
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            e.target.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.color = "rgba(255, 255, 255, 0.7)";
          }}
        >
          Volver al inicio
        </button>

        <div style={{
          textAlign: "center",
          fontSize: "0.85rem",
          color: "rgba(255, 255, 255, 0.5)",
          lineHeight: "1.4"
        }}>
          <p style={{ margin: 0 }}>
            Al continuar, aceptas que Freetify acceda a tu información de Spotify según los términos de su API.
          </p>
        </div>
      </div>

      {/* CSS Animation for spinner */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
