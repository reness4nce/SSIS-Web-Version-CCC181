import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    MdNotifications,
    MdKeyboardArrowDown,
    MdKeyboardArrowUp
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
        setAutoCollapse,
        toggleSidebar
    } = useSidebar();
    
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfilePopover, setShowProfilePopover] = useState(false);
    const [showSettingsPopover, setShowSettingsPopover] = useState(false);
    const [sidebarSettings, setSidebarSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebar-settings');
            return saved ? JSON.parse(saved) : {
                autoCollapse: true,
                theme: 'default'
            };
        } catch (error) {
            console.warn('Failed to load sidebar settings:', error);
            return {
                autoCollapse: true,
                theme: 'default'
            };
        }
    });

    // Refs for focus management
    const profileButtonRef = useRef(null);
    const settingsButtonRef = useRef(null);
    const settingsPopoverRef = useRef(null);

    // Optimized logout handler
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out:", error);
        }
    }, [logout, navigate]);

    // Profile actions - implemented properly
    const handleProfileClick = useCallback(() => {
        navigate('/profile'); // Navigate to profile page
        setShowProfilePopover(false);
        setShowSettingsPopover(false);
        handleNavigation(); // Handle sidebar collapse on mobile
    }, [navigate, handleNavigation]);

    const handleNotificationsClick = useCallback(() => {
        // Could navigate to notifications page or show modal
        console.log('Navigate to notifications');
        setShowProfilePopover(false);
        setShowSettingsPopover(false);
        handleNavigation();
    }, [handleNavigation]);

    // Settings functionality - implemented properly
    const handleSettingsClick = useCallback(() => {
        setShowSettingsPopover(prev => !prev);
        setShowProfilePopover(false);
    }, []);

    const handleSettingsClose = useCallback(() => {
        setShowSettingsPopover(false);
        if (settingsButtonRef.current) {
            settingsButtonRef.current.focus();
        }
    }, []);

    const handleSettingChange = useCallback((key, value) => {
        const newSettings = { ...sidebarSettings, [key]: value };
        setSidebarSettings(newSettings);
        
        try {
            localStorage.setItem('sidebar-settings', JSON.stringify(newSettings));
        } catch (error) {
            console.warn('Failed to save sidebar settings:', error);
        }

        // Apply settings immediately
        if (key === 'autoCollapse') {
            setAutoCollapse(value);
        }
    }, [sidebarSettings, setAutoCollapse]);

    // Enhanced collapse toggle with better UX
    const handleCollapseToggle = useCallback(() => {
        toggleCollapsed();
        cancelAutoCollapseTimer();
        
        // Close popovers if open
        setShowProfilePopover(false);
        setShowSettingsPopover(false);
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
        // Close popovers on navigation
        setShowProfilePopover(false);
        setShowSettingsPopover(false);
    }, [navigate, handleNavigation]);

    // Enhanced keyboard navigation
    const handleKeyDown = useCallback((e, action) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowProfilePopover(false);
            setShowSettingsPopover(false);
            if (profileButtonRef.current) {
                profileButtonRef.current.focus();
            }
        }
    }, []);

    const handleSettingsKeyDown = useCallback((e, action) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSettingsPopover(false);
            if (settingsButtonRef.current) {
                settingsButtonRef.current.focus();
            }
        } else if (e.key === 'ArrowDown' && showSettingsPopover) {
            e.preventDefault();
            if (settingsPopoverRef.current) {
                const firstItem = settingsPopoverRef.current.querySelector('.settings-popover-item');
                if (firstItem) firstItem.focus();
            }
        }
    }, [showSettingsPopover]);

    // Close popovers when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.user-section')) {
                setShowProfilePopover(false);
                setShowSettingsPopover(false);
            }
        };

        if (showProfilePopover || showSettingsPopover) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showProfilePopover, showSettingsPopover]);

    // Keyboard navigation for settings popover
    useEffect(() => {
        if (!showSettingsPopover) return;

        const handleSettingsPopoverKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowSettingsPopover(false);
                if (settingsButtonRef.current) {
                    settingsButtonRef.current.focus();
                }
            } else if (e.key === 'Tab') {
                const items = Array.from(settingsPopoverRef.current?.querySelectorAll('.settings-popover-item') || []);
                if (items.length === 0) return;

                if (e.shiftKey) {
                    // Shift+Tab on first item
                    if (document.activeElement === items[0]) {
                        e.preventDefault();
                        settingsButtonRef.current?.focus();
                    }
                } else {
                    // Tab on last item returns to first
                    if (document.activeElement === items[items.length - 1]) {
                        e.preventDefault();
                        items[0].focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleSettingsPopoverKeyDown);
        return () => document.removeEventListener('keydown', handleSettingsPopoverKeyDown);
    }, [showSettingsPopover]);

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
                    <div className="user-section">
                        <button
                            ref={profileButtonRef}
                            onClick={() => setShowProfilePopover(prev => !prev)}
                            className="user-avatar-button"
                            aria-label="Open user menu"
                            aria-expanded={showProfilePopover}
                            aria-haspopup="menu"
                            onKeyDown={(e) => handleKeyDown(e, () => setShowProfilePopover(prev => !prev))}
                        >
                            <div className="user-avatar" title={currentUser.username}>
                                {getAvatarInitials(currentUser.username)}
                            </div>
                            <div className="user-details">
                                <p className="user-name">{currentUser.username}</p>
                                <p className="user-role">Administrator</p>
                            </div>
                            <MdKeyboardArrowDown 
                                size={16} 
                                className={`profile-arrow ${showProfilePopover ? 'rotated' : ''}`}
                            />
                        </button>
                        
                        <button 
                            ref={settingsButtonRef}
                            className="settings-icon"
                            onClick={handleSettingsClick}
                            onKeyDown={handleSettingsKeyDown}
                            aria-label="Open settings"
                            aria-expanded={showSettingsPopover}
                            aria-haspopup="menu"
                        >
                            <MdSettings size={16} />
                        </button>
                        
                        {/* Enhanced Profile Popover with proper functionality */}
                        {showProfilePopover && (
                            <div 
                                className="profile-popover active" 
                                role="menu" 
                                aria-label="User menu"
                            >
                                <button
                                    className="profile-popover-item"
                                    role="menuitem"
                                    onClick={handleProfileClick}
                                    onKeyDown={(e) => handleKeyDown(e, handleProfileClick)}
                                >
                                    <MdPerson size={16} />
                                    <span>Profile</span>
                                </button>
                                <button
                                    className="profile-popover-item"
                                    role="menuitem"
                                    onClick={handleNotificationsClick}
                                    onKeyDown={(e) => handleKeyDown(e, handleNotificationsClick)}
                                >
                                    <MdNotifications size={16} />
                                    <span>Notifications</span>
                                </button>
                            </div>
                        )}

                        {/* Real Settings Popover */}
                        {showSettingsPopover && (
                            <div 
                                ref={settingsPopoverRef}
                                className="settings-popover active"
                                role="menu" 
                                aria-label="Sidebar settings"
                            >
                                <div className="settings-header">
                                    <h4>Sidebar Settings</h4>
                                </div>
                                
                                <div className="settings-item">
                                    <label className="settings-label">
                                        <input
                                            type="checkbox"
                                            checked={sidebarSettings.autoCollapse}
                                            onChange={(e) => handleSettingChange('autoCollapse', e.target.checked)}
                                            className="settings-checkbox"
                                        />
                                        Auto-collapse when inactive
                                    </label>
                                </div>

                                <div className="settings-item">
                                    <label className="settings-label">
                                        <input
                                            type="checkbox"
                                            checked={isCollapsed}
                                            onChange={(e) => {
                                                handleCollapseToggle();
                                                if (settingsButtonRef.current) {
                                                    settingsButtonRef.current.focus();
                                                }
                                            }}
                                            className="settings-checkbox"
                                        />
                                        Collapse sidebar
                                    </label>
                                </div>
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
