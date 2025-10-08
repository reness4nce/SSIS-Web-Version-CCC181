import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

// Create the context
const AuthContext = createContext(null);

// Create a custom hook to use the context easily
export const useAuth = () => useContext(AuthContext);

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.checkAuthStatus();
        if (response.data.isAuthenticated) {
          setCurrentUser(response.data.user);
        }
      } catch (error) {
        console.log('Not authenticated or server not available');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Real login function using the API service
  const login = async (username, password) => {
    try {
      setIsLoading(true);
      const response = await api.login(username, password);

      // Set the current user from the response
      setCurrentUser(response.data.user);
      return response.data.user;
    } catch (error) {
      setIsLoading(false);
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
    isLoading,
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
