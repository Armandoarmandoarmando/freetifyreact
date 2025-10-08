import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';

const LoginPrompt = ({ message, onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Animación de entrada
    const tl = gsap.timeline();
    
    tl.fromTo(overlayRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power2.out" }
    )
    .fromTo(modalRef.current,
      { scale: 0.8, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" },
      "-=0.1"
    );

    return () => tl.kill();
  }, []);

  const handleClose = () => {
    const tl = gsap.timeline({
      onComplete: onClose
    });
    
    tl.to(modalRef.current, {
      scale: 0.8,
      opacity: 0,
      y: 20,
      duration: 0.3,
      ease: "power2.in"
    })
    .to(overlayRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in"
    }, "-=0.1");
  };

  const handleLogin = () => {
    handleClose();
    setTimeout(() => navigate('/login'), 300);
  };

  return (
    <div 
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
    >
      <div 
        ref={modalRef}
        style={{
          backgroundColor: '#242424',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: 'rgba(29, 185, 84, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          border: '2px solid rgba(29, 185, 84, 0.3)'
        }}>
          <i className="bi bi-lock" style={{
            fontSize: '24px',
            color: '#1DB954'
          }}></i>
        </div>

        <h2 style={{
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          Función Premium
        </h2>

        <p style={{
          color: '#b3b3b3',
          fontSize: '1rem',
          lineHeight: '1.5',
          marginBottom: '32px'
        }}>
          {message || 'Necesitas iniciar sesión con tu cuenta de Spotify para acceder a esta función.'}
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#b3b3b3',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#b3b3b3';
            }}
          >
            Cancelar
          </button>
          
          <button
            onClick={handleLogin}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1DB954',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(29, 185, 84, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1ed760';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 20px rgba(29, 185, 84, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#1DB954';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(29, 185, 84, 0.3)';
            }}
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;