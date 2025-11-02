import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchData } from "./api";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import Lenis from "lenis";
import { useAuth } from "./contexts/AuthContext";

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const firstSectionRef = useRef(null);
  const secondSectionRef = useRef(null);
  const mainTitleRef = useRef(null);
  const lenisRef = useRef(null);
  const { loginAsGuest } = useAuth();

  useLayoutEffect(() => {
    // 1) Inicializar Lenis
    lenisRef.current = new Lenis({ 
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      smooth: true,
      wheelMultiplier: 1,
      touchMultiplier: 2
    });

    function raf(time) { 
      lenisRef.current?.raf(time); 
      requestAnimationFrame(raf); 
    }
    requestAnimationFrame(raf);

    // Configurar ScrollTrigger
    gsap.ticker.lagSmoothing(0);
    
    // Timeline principal que controla toda la secuencia
    const mainTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".content",
        start: "top top",
        end: "+=200%",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      }
    });

    // Primera parte: zoom y fade out de la primera sección
    mainTl
      .to(mainTitleRef.current, {
        scale: 15,
        duration: 1.4,
        ease: "power2.inOut"
      })
      .to(firstSectionRef.current, {
        scale: 3,
        duration: 1,
        ease: "power2.inOut"
      }, "<")
      // Fade out de la primera sección
      .to([mainTitleRef.current, firstSectionRef.current], {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
      },">")
      // Segunda parte: mostrar la segunda sección
      .fromTo(secondSectionRef.current,
        {
          opacity: 0,
          y: 0
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out"
        },
        ">-0.4" // Comenzar un poco antes de que termine el fade out
      );

    // Vincular Lenis con ScrollTrigger
    lenisRef.current.on('scroll', ScrollTrigger.update);

    return () => {
      lenisRef.current?.destroy();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  useEffect(() => {
    fetchData()
      .then((data) => setMessage(data.message))
      .catch((error) => {
        console.error('Error al conectar con el backend', error);
        setMessage('Error al conectar con el backend');
      });
  }, []);

  const handleGuestAccess = () => {
    // Activar modo invitado
    loginAsGuest();
    
    // Crear timeline para la animación de salida
    const tl = gsap.timeline({
      onComplete: () => navigate('/home')
    });

    // Animar elementos de la segunda sección
    tl.to(secondSectionRef.current.querySelector('h2'), {
      y: 100,
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    })
    .to(secondSectionRef.current.querySelector('p'), {
      y: 100,
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    }, "-=0.3")
    .to(secondSectionRef.current.querySelectorAll('.button'), {
      y: 100,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: "power2.inOut"
    }, "-=0.3")
    .to(secondSectionRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    }, "-=0.2");
  };

  return (
    <>
      <div className="content">
        <section ref={firstSectionRef} className="section first-section">
          <h1 ref={mainTitleRef} className="main-title">Freetify</h1>
          <img
            src="https://thumbs.dreamstime.com/b/music-notes-random-pattern-background-wallpapers-use-content-creation-design-layouts-189454693.jpg"
            alt="Música"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
              opacity: 0.6,
              zIndex: 1
            }}
          />
        </section>

        <section ref={secondSectionRef} className="section second-section">
          <h2 style={{
            fontSize: "3.5rem",
            marginBottom: "1.5rem",
            fontWeight: "bold",
            opacity:1,
            zIndex: 2
          }}>Bienvenido a Freetify</h2>
          
          
          <p style={{
            fontSize: "1.2rem",
            marginBottom: "2.5rem",
            lineHeight: "1.6"
          }}>
            Tu destino musical definitivo. Disfruta de millones de canciones con la mejor calidad de sonido.
            {message && <span className="message">{message}</span>}
          </p>
          <div className="buttons justify-content-center"
            style={{
              display: "flex",
              justifyContent: "left",
              gap: "1rem",
              zIndex: 2
            }}>
            <button
              id="invitado"
              className="button primary"
              onClick={handleGuestAccess}
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#1DB954",
                color: "white",
                border: "none",
                borderRadius: "30px",
                fontSize: "1.1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(29, 185, 84, 0.6)"
                
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              Acceder como invitado
            </button>
            <button
              className="button secondary"
              onClick={() => navigate('/login')}
                style={{
                padding: "1rem 2rem",
                marginLeft: "1lh",
                backgroundColor: "transparent",
                color: "white",
                border: "2px solid #1DB954",
                borderRadius: "30px",
                fontSize: "1.1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(29, 185, 84, 0.1)"
                
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.backgroundColor = '#1DB954';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'scale(1)';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              Iniciar sesión
            </button>
          </div>
          <img
              src="https://img.freepik.com/vector-gratis/fondo-pentagrama-musical-brillante-notas-sonido_1017-31220.jpg?semt=ais_hybrid&w=740"
              alt="Música"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                top: 0,
                left: 0,
                opacity: 0.6,
                zIndex: 1
              }}
            />
        </section>
      </div>
      <div className="footer">
        <p style={{
          fontSize: "1rem",
          color: "#555"
        }}>© 2023 Freetify. Todos los derechos reservados.</p>
      </div>
    </>
  );
}

export default App;
