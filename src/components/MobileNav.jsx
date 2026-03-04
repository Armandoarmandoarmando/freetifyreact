import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './MobileNav.css';

const MobileNav = ({ navigationItems, onAuthPrompt }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const handleNavigation = (item) => {
        if (!item.allowGuest && !isAuthenticated) {
            if (onAuthPrompt) {
                onAuthPrompt(item.description || 'Necesitas iniciar sesión para acceder a esta función');
            }
            return;
        }
        navigate(item.path);
    };

    return (
        <nav className="mobile-nav-container">
            {navigationItems.map((item) => {
                // Simple active check based on pathname inclusion
                const isActive = location.pathname.includes(item.path);
                const isDisabled = !item.allowGuest && !isAuthenticated;

                return (
                    <button
                        key={item.path}
                        className={`mobile-nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => handleNavigation(item)}
                        aria-label={item.label}
                    >
                        <i className={`${item.icon} nav-icon`}></i>
                        <span className="nav-label">{item.label}</span>
                        {isDisabled && (
                            <i className="bi bi-lock-fill lock-icon"></i>
                        )}
                    </button>
                );
            })}
        </nav>
    );
};

export default MobileNav;
