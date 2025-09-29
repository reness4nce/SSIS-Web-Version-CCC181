import React, { createContext, useState, useContext, useEffect } from 'react';
// We no longer need the 'api' service for this mocked version.

// Create the context
const AuthContext = createContext(null);

// Create a custom hook to use the context easily
export const useAuth = () => useContext(AuthContext);

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  // We can set isLoading to false initially since we aren't fetching anything on load.
  const [isLoading, setIsLoading] = useState(false);

  // This function simulates logging in by checking hardcoded credentials.
  const login = async (username, password) => {
    return new Promise((resolve, reject) => {
      // Simulate a network delay
      setTimeout(() => {
        if (username === 'admin' && password === 'admin123') {
          // On success, create a mock user object
          const mockUser = {
            id: 1,
            username: 'admin',
            email: 'admin@ssis.edu.ph',
          };
          setCurrentUser(mockUser);
          resolve(mockUser); // Resolve the promise on success
        } else {
          // On failure, reject the promise with an error
          const error = new Error('Invalid username or password');
          // Mimic an axios error object so the login page can read it
          error.response = { data: { error: 'Invalid username or password' } };
          reject(error);
        }
      }, 500); // 500ms delay
    });
  };

  // This function simulates logging out
  const logout = async () => {
    setCurrentUser(null);
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
