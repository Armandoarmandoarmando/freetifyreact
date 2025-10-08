import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SpotifyCallback = () => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const expiresIn = searchParams.get('expires_in');
      const tokenType = searchParams.get('token_type');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setError(getErrorMessage(error));
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!accessToken) {
        setStatus('error');
        setError('No se recibieron tokens de autenticación');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Obtener información del usuario de Spotify
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `${tokenType || 'Bearer'} ${accessToken}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Crear objeto de tokens
          const tokenData = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: Number(expiresIn) || 3600,
            token_type: tokenType || 'Bearer'
          };
          
          // Guardar en el contexto de auth
          login(tokenData, userData);
          
          setStatus('success');
          setTimeout(() => navigate('/home'), 2000);
        } else {
          throw new Error('Error al obtener datos del usuario de Spotify');
        }
        
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('error');
        setError('Error al procesar la autenticación con Spotify');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    const getErrorMessage = (error) => {
      switch (error) {
        case 'access_denied':
          return 'Usuario canceló la autorización';
        case 'invalid_state':
          return 'Error de seguridad en la autenticación';
        case 'token_error':
          return 'Error al obtener tokens de Spotify';
        case 'server_error':
          return 'Error interno del servidor';
        default:
          return 'Error en la autenticación';
      }
    };

    processCallback();
  }, [searchParams, navigate, login]);

  return (
    <div style={{
      minHeight: '100vh',
      background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "relative"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        padding: "3rem",
        borderRadius: "20px",
        maxWidth: "450px",
        width: "90%",
        textAlign: "center",
        border: "1px solid rgba(255, 255, 255, 0.18)"
      }}>
        {status === 'processing' && (
          <>
            <div style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 24px",
              border: "4px solid rgba(29, 185, 84, 0.3)",
              borderTop: "4px solid #1DB954",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <h2 style={{
              color: "white",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "16px"
            }}>
              Conectando con Spotify...
            </h2>
            <p style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "1rem"
            }}>
              Por favor espera mientras procesamos tu autenticación
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: "64px",
              height: "64px",
              backgroundColor: "rgba(29, 185, 84, 0.2)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <i className="bi bi-check-lg" style={{
                fontSize: "32px",
                color: "#1DB954"
              }} />
            </div>
            <h2 style={{
              color: "white",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "16px"
            }}>
              ¡Conectado exitosamente!
            </h2>
            <p style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "1rem"
            }}>
              Redirigiendo a tu dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: "64px",
              height: "64px",
              backgroundColor: "rgba(220, 53, 69, 0.2)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <i className="bi bi-x-lg" style={{
                fontSize: "32px",
                color: "#dc3545"
              }} />
            </div>
            <h2 style={{
              color: "white",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "16px"
            }}>
              Error de conexión
            </h2>
            <p style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "1rem",
              marginBottom: "24px"
            }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                backgroundColor: "#1DB954",
                color: "white",
                border: "none",
                borderRadius: "50px",
                padding: "12px 24px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Volver a intentar
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SpotifyCallback;