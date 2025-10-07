import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import './LoginPage.css'; 

const LoginPage = () => {
    const { login } = useAuth(); 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

     const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the login function. App.js will handle the redirect on its own
      // when the currentUser state changes.
      await login(username, password);
    } catch (err) {
      // The error handling remains the same.
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        console.error("Login Error:", err);
        setError('An unexpected error occurred.');
      }
      setIsLoading(false); // Make sure to stop loading on error
    }
    // We don't need a 'finally' block or manual navigation anymore.
  };
  
    return (
        <div className="login-page-container">
            <div className="login-form-container">
                <h2>InsTrack Login</h2>
                <p>Sign in to continue</p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="form-control"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
