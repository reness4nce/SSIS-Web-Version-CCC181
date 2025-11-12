import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    MdDashboard, 
    MdPeople, 
    MdSchool, 
    MdMenuBook, 
    MdLogout, 
    MdSettings,
    MdExpandMore,
    MdExpandLess,
    MdPerson,
    MdNotifications
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
        toggleCollapsed,
        setAutoCollapse
    } = useSidebar();
    
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfilePopover, setShowProfilePopover] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Optimized logout handler
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out:", error);
        }
    }, [logout, navigate]);

    // Optimized profile interactions
    const handleProfileClick = useCallback(() => {
        setShowProfilePopover(prev => !prev);
        setShowSettings(false);
    }, []);

    const handleSettingsClick = useCallback(() => {
        setShowSettings(prev => !prev);
        setShowProfilePopover(false);
    }, []);

    // Enhanced collapse toggle with better UX
    const handleCollapseToggle = useCallback(() => {
        toggleCollapsed();
        cancelAutoCollapseTimer();
        
        // Close profile popover if open
        setShowProfilePopover(false);
        setShowSettings(false);
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

    // Avatar initials generation - memoized for performance
    const getAvatarInitials = useCallback((username) => {
        if (!username) return 'A';
        return username
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, []);

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

    // Close popovers when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.user-section')) {
                setShowProfilePopover(false);
                setShowSettings(false);
            }
        };

        if (showProfilePopover || showSettings) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showProfilePopover, showSettings]);

    return (
        <div
            className={sidebarClasses}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="sidebar-header">
                <div className="logo-icon">
                    <MdSchool size={24} aria-hidden="true" />
                </div>
                <h2>InsTrack</h2>
                
                {/* Optimized Collapse Toggle */}
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
                    <div className="user-section" onClick={handleProfileClick}>
                        <div className="user-avatar" title={currentUser.username}>
                            {getAvatarInitials(currentUser.username)}
                        </div>
                        <div className="user-details">
                            <p className="user-name">{currentUser.username}</p>
                            <p className="user-role">Administrator</p>
                        </div>
                        <button 
                            className="settings-icon"
                            onClick={handleSettingsClick}
                            aria-label="Open settings"
                            onKeyDown={(e) => handleKeyDown(e, handleSettingsClick)}
                        >
                            <MdSettings size={16} />
                        </button>
                        
                        {/* Optimized Profile Popover */}
                        {showProfilePopover && (
                            <div className="profile-popover active" role="menu" aria-label="User menu">
                                <button
                                    className="profile-popover-item"
                                    role="menuitem"
                                    onClick={() => {
                                        console.log('Profile clicked');
                                        setShowProfilePopover(false);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, () => setShowProfilePopover(false))}
                                >
                                    <MdPerson size={16} />
                                    <span>Profile</span>
                                </button>
                                <button
                                    className="profile-popover-item"
                                    role="menuitem"
                                    onClick={handleSettingsClick}
                                    onKeyDown={(e) => handleKeyDown(e, handleSettingsClick)}
                                >
                                    <MdSettings size={16} />
                                    <span>Settings</span>
                                </button>
                                <button
                                    className="profile-popover-item"
                                    role="menuitem"
                                    onClick={() => {
                                        console.log('Notifications clicked');
                                        setShowProfilePopover(false);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, () => setShowProfilePopover(false))}
                                >
                                    <MdNotifications size={16} />
                                    <span>Notifications</span>
                                </button>
                            </div>
                        )}
                    </div>
                    
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
