import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

// Create the context
const AuthContext = createContext(null);

// Create a custom hook to use the context easily
export const useAuth = () => useContext(AuthContext);

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status on app load (completely invisible)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.checkAuthStatus();
        if (response.data.isAuthenticated) {
          setCurrentUser(response.data.user);
        }
        // If not authenticated, currentUser stays null
      } catch (error) {
        // Silently handle auth check failure - don't affect UI
        console.log('Auth check failed silently');
      } finally {
        setAuthChecked(true);
      }
    };

    // Run auth check completely in background
    checkAuth();
  }, []);

  // Real login function using the API service
  const login = async (username, password) => {
    try {
      console.log('AuthContext: Making login API call');
      const response = await api.login(username, password);
      console.log('AuthContext: Login API response received:', response);

      // Set the current user from the response
      const userData = response.data.user;
      setCurrentUser(userData);
      console.log('AuthContext: User state updated:', userData);
      return userData;
    } catch (error) {
      console.error('AuthContext: Login error occurred:', error);
      throw error; // Re-throw to let the component handle the error
    }
  };

  // Real logout function using the API service
  const logout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API call fails, clear the local state
      setCurrentUser(null);
    }
  };

  // The value provided to consuming components
  const value = {
    currentUser,
    authChecked,
    login,
    logout,
  };

  // Since there's no async check on load, we can render children immediately.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
