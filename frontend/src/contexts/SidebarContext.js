import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

// Debounce utility to prevent rapid-fire state changes
const useDebounce = (callback, delay) => {
    const timeoutRef = useRef(null);
    
    return useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

export const SidebarProvider = ({ children }) => {
    // Optimized state management
    const [sidebarState, setSidebarState] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebar-state');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    isOpen: true, // Always start open for better UX
                    isCollapsed: parsed.isCollapsed || false,
                    autoCollapseEnabled: parsed.autoCollapseEnabled !== false // Default to true
                };
            }
        } catch (error) {
            console.warn('Failed to parse sidebar state from localStorage:', error);
        }
        
        return {
            isOpen: true,
            isCollapsed: false,
            autoCollapseEnabled: true
        };
    });

    const collapseTimerRef = useRef(null);
    const isManuallyInteracting = useRef(false);

    // Optimized localStorage persistence with debouncing
    const saveState = useDebounce((state) => {
        try {
            localStorage.setItem('sidebar-state', JSON.stringify({
                isCollapsed: state.isCollapsed,
                autoCollapseEnabled: state.autoCollapseEnabled
            }));
        } catch (error) {
            console.warn('Failed to save sidebar state:', error);
        }
    }, 150);

    // Enhanced resize handler with throttling
    const handleResize = useCallback(() => {
        if (isManuallyInteracting.current) return;
        
        const width = window.innerWidth;
        const newState = { ...sidebarState };
        let needsUpdate = false;

        if (width < 768) {
            // Mobile: close sidebar for better UX
            if (newState.isOpen) {
                newState.isOpen = false;
                needsUpdate = true;
            }
        } else {
            // Desktop: ensure sidebar is open
            if (!newState.isOpen) {
                newState.isOpen = true;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            setSidebarState(newState);
        }
    }, [sidebarState]);

    // Responsive behavior with optimized event handling
    useEffect(() => {
        let resizeTimeout;
        const throttledResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 100);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', throttledResize, { passive: true });
            return () => {
                window.removeEventListener('resize', throttledResize);
                if (resizeTimeout) clearTimeout(resizeTimeout);
            };
        }
    }, [handleResize]);

    // Consolidated state management
    const updateSidebarState = useCallback((updates) => {
        setSidebarState(prev => {
            const newState = { ...prev, ...updates };
            saveState(newState);
            return newState;
        });
    }, [saveState]);

    // Enhanced timer management
    const clearCollapseTimer = useCallback(() => {
        if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current);
            collapseTimerRef.current = null;
        }
    }, []);

    const startAutoCollapseTimer = useCallback(() => {
        if (!sidebarState.autoCollapseEnabled || 
            window.innerWidth < 768 || 
            isManuallyInteracting.current) return;

        clearCollapseTimer();
        collapseTimerRef.current = setTimeout(() => {
            updateSidebarState({ isCollapsed: true });
        }, 3000);
    }, [sidebarState.autoCollapseEnabled, clearCollapseTimer, updateSidebarState]);

    // Optimized toggle functions with proper state management
    const toggleSidebar = useCallback(() => {
        isManuallyInteracting.current = true;
        updateSidebarState({ isOpen: !sidebarState.isOpen });
        
        // Reset interaction flag after animation
        setTimeout(() => {
            isManuallyInteracting.current = false;
        }, 300);
    }, [sidebarState.isOpen, updateSidebarState]);

    const toggleCollapsed = useCallback(() => {
        isManuallyInteracting.current = true;
        clearCollapseTimer();
        updateSidebarState({ isCollapsed: !sidebarState.isCollapsed });
        
        setTimeout(() => {
            isManuallyInteracting.current = false;
        }, 300);
    }, [sidebarState.isCollapsed, clearCollapseTimer, updateSidebarState]);

    // Simplified navigation handler
    const handleNavigation = useCallback(() => {
        if (window.innerWidth < 768) {
            updateSidebarState({ isOpen: false });
        } else if (sidebarState.autoCollapseEnabled) {
            startAutoCollapseTimer();
        }
    }, [sidebarState.autoCollapseEnabled, startAutoCollapseTimer, updateSidebarState]);

    // Optimized state accessors
    const openSidebar = useCallback(() => {
        updateSidebarState({ isOpen: true });
        clearCollapseTimer();
    }, [updateSidebarState, clearCollapseTimer]);

    const closeSidebar = useCallback(() => {
        updateSidebarState({ isOpen: false });
        clearCollapseTimer();
    }, [updateSidebarState, clearCollapseTimer]);

    const expandSidebar = useCallback(() => {
        updateSidebarState({ isCollapsed: false });
        clearCollapseTimer();
    }, [updateSidebarState, clearCollapseTimer]);

    const collapseSidebar = useCallback(() => {
        updateSidebarState({ isCollapsed: true });
        clearCollapseTimer();
    }, [updateSidebarState, clearCollapseTimer]);

    const setAutoCollapse = useCallback((enabled) => {
        updateSidebarState({ autoCollapseEnabled: enabled });
        if (!enabled) {
            clearCollapseTimer();
        }
    }, [updateSidebarState, clearCollapseTimer]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearCollapseTimer();
        };
    }, [clearCollapseTimer]);

    const value = {
        // State
        isOpen: sidebarState.isOpen,
        isCollapsed: sidebarState.isCollapsed,
        autoCollapseEnabled: sidebarState.autoCollapseEnabled,
        
        // Actions
        toggleSidebar,
        toggleCollapsed,
        openSidebar,
        closeSidebar,
        expandSidebar,
        collapseSidebar,
        setAutoCollapse,
        
        // Handlers
        handleNavigation,
        startAutoCollapseTimer,
        cancelAutoCollapseTimer: clearCollapseTimer
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
};
