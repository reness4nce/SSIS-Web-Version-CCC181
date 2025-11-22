import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    MdDashboard,
    MdPeople,
    MdSchool,
    MdMenuBook,
    MdLogout,
    MdExpandMore,
    MdExpandLess
} from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import './Sidebar.css';

const Sidebar = () => {
    const { currentUser, logout } = useAuth();
    const {
        isOpen,
        isCollapsed,
        handleNavigation,
        expandSidebar,
        startAutoCollapseTimer,
        cancelAutoCollapseTimer,
        toggleCollapsed
    } = useSidebar();

    const navigate = useNavigate();
    const location = useLocation();

    // Optimized logout handler
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out:", error);
        }
    }, [logout, navigate]);

    // Enhanced collapse toggle with better UX
    const handleCollapseToggle = useCallback(() => {
        toggleCollapsed();
        cancelAutoCollapseTimer();
    }, [toggleCollapsed, cancelAutoCollapseTimer]);

    // Optimized mouse interactions
    const handleMouseEnter = useCallback(() => {
        if (isCollapsed && window.innerWidth >= 768) {
            expandSidebar();
        }
    }, [isCollapsed, expandSidebar]);

    const handleMouseLeave = useCallback(() => {
        if (!isCollapsed && window.innerWidth >= 768) {
            startAutoCollapseTimer();
        }
    }, [isCollapsed, startAutoCollapseTimer]);

    // Optimized tooltip text generation
    const getTooltipText = useCallback((path, text) => {
        if (!isCollapsed) return text;
        
        const tooltipMap = {
            '/': 'Dashboard',
            '/students': 'Students',
            '/programs': 'Programs',
            '/colleges': 'Colleges'
        };
        return tooltipMap[path] || text;
    }, [isCollapsed]);

    // Efficient class computation
    const sidebarClasses = [
        'sidebar',
        !isOpen && 'closed',
        isCollapsed && 'collapsed'
    ].filter(Boolean).join(' ');

    // Navigation handler with performance optimization
    const handleNavClick = useCallback((path) => {
        navigate(path);
        handleNavigation();
    }, [navigate, handleNavigation]);

    // Enhanced keyboard navigation
    const handleKeyDown = useCallback((e, action) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        }
    }, []);



    return (
        <div
            className={sidebarClasses}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="sidebar-header">
                <div className="logo-icon">
                    <MdSchool size={24} aria-hidden="true" />
                </div>
                <h2>InsTrack</h2>
                
                {/* Enhanced Collapse Toggle Control with better contrast */}
                <button 
                    className="collapse-toggle"
                    onClick={handleCollapseToggle}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    onKeyDown={(e) => handleKeyDown(e, handleCollapseToggle)}
                >
                    {isCollapsed ? <MdExpandMore size={18} /> : <MdExpandLess size={18} />}
                </button>
            </div>
            
            <nav className="nav-links" role="navigation" aria-label="Main navigation">
                {/* Navigation items with optimized handlers */}
                <button
                    onClick={() => handleNavClick('/')}
                    className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                    aria-label="Go to Dashboard"
                    aria-current={location.pathname === '/' ? 'page' : undefined}
                    data-tooltip={getTooltipText('/', 'Dashboard')}
                    onKeyDown={(e) => handleKeyDown(e, () => handleNavClick('/'))}
                >
                    <MdDashboard className="nav-icon" aria-hidden="true" />
                    <span className="nav-text">Dashboard</span>
                </button>
                
                <button
                    onClick={() => handleNavClick('/students')}
                    className={`nav-link ${location.pathname === '/students' ? 'active' : ''}`}
                    aria-label="Go to Students page"
                    aria-current={location.pathname === '/students' ? 'page' : undefined}
                    data-tooltip={getTooltipText('/students', 'Students')}
                    onKeyDown={(e) => handleKeyDown(e, () => handleNavClick('/students'))}
                >
                    <MdPeople className="nav-icon" aria-hidden="true" />
                    <span className="nav-text">Students</span>
                </button>
                
                <button
                    onClick={() => handleNavClick('/programs')}
                    className={`nav-link ${location.pathname === '/programs' ? 'active' : ''}`}
                    aria-label="Go to Programs page"
                    aria-current={location.pathname === '/programs' ? 'page' : undefined}
                    data-tooltip={getTooltipText('/programs', 'Programs')}
                    onKeyDown={(e) => handleKeyDown(e, () => handleNavClick('/programs'))}
                >
                    <MdMenuBook className="nav-icon" aria-hidden="true" />
                    <span className="nav-text">Programs</span>
                </button>
                
                <button
                    onClick={() => handleNavClick('/colleges')}
                    className={`nav-link ${location.pathname === '/colleges' ? 'active' : ''}`}
                    aria-label="Go to Colleges page"
                    aria-current={location.pathname === '/colleges' ? 'page' : undefined}
                    data-tooltip={getTooltipText('/colleges', 'Colleges')}
                    onKeyDown={(e) => handleKeyDown(e, () => handleNavClick('/colleges'))}
                >
                    <MdSchool className="nav-icon" aria-hidden="true" />
                    <span className="nav-text">Colleges</span>
                </button>
            </nav>
            
            {/* User section - only render when logged in */}
            {currentUser && (
                <div className="sidebar-footer">
                    {/* Enhanced Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="logout-button"
                        aria-label="Logout from application"
                        onKeyDown={(e) => handleKeyDown(e, handleLogout)}
                    >
                        <MdLogout size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
