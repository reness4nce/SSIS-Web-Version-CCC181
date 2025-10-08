import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
    
    const usernameRef = useRef(null);
    const errorRef = useRef(null);

    // Auto-focus username field on mount
    useEffect(() => {
        usernameRef.current?.focus();
    }, []);

    // Announce errors to screen readers
    useEffect(() => {
        if (error && errorRef.current) {
            errorRef.current.focus();
        }
    }, [error]);

    // Redirect if already authenticated
    useEffect(() => {
        console.log('LoginPage: currentUser changed:', currentUser);
        if (currentUser) {
            console.log('LoginPage: Redirecting to dashboard...');
            navigate('/');
        }
    }, [currentUser, navigate]);

    // Client-side validation
    const validateForm = () => {
        const errors = { username: '', password: '' };
        let isValid = true;

        if (!username.trim()) {
            errors.username = 'Username is required';
            isValid = false;
        } else if (username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
            isValid = false;
        }

        if (!password) {
            errors.password = 'Password is required';
            isValid = false;
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setFieldErrors({ username: '', password: '' });

        // Client-side validation
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('Attempting login for user:', username);
            await login(username, password, rememberMe);
            console.log('Login successful');
            // Navigation will be handled by the useEffect when currentUser changes
        } catch (err) {
            console.error('Login error details:', {
                error: err,
                response: err.response,
                responseData: err.response?.data,
                status: err.response?.status,
                statusText: err.response?.statusText
            });

            if (err.response && err.response.data) {
                if (err.response.data.error) {
                    setError(err.response.data.error);
                } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
                    setError(err.response.data.errors.join(', '));
                } else if (typeof err.response.data === 'string') {
                    setError(err.response.data);
                } else {
                    setError(`Login failed (${err.response.status}): Please check your credentials and try again.`);
                }
            } else if (err.request) {
                console.error('Network error:', err.request);
                setError('Network error: Please check your connection and try again.');
            } else {
                console.error('Other login error:', err);
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Handle Enter key press for better keyboard navigation
    const handleKeyPress = (e, field) => {
        if (e.key === 'Enter') {
            if (field === 'username' && password) {
                handleSubmit(e);
            }
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-form-container">
                <h1 className="login-title">InsTrack Login</h1>
                <p className="login-subtitle">Sign in to continue</p>
                
                <form onSubmit={handleSubmit} noValidate>
                    {/* Global error message with ARIA live region */}
                    {error && (
                        <div 
                            ref={errorRef}
                            className="alert alert-danger" 
                            role="alert"
                            aria-live="polite"
                            tabIndex={-1}
                        >
                            {error}
                        </div>
                    )}

                    {/* Username field */}
                    <div className="form-group">
                        <label htmlFor="username">
                            Username <span aria-label="required" className="required">*</span>
                        </label>
                        <input
                            ref={usernameRef}
                            type="text"
                            id="username"
                            name="username"
                            className={`form-control ${fieldErrors.username ? 'is-invalid' : ''}`}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, 'username')}
                            aria-required="true"
                            aria-invalid={fieldErrors.username ? 'true' : 'false'}
                            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                            autoComplete="username"
                            disabled={isSubmitting}
                        />
                        {fieldErrors.username && (
                            <div id="username-error" className="invalid-feedback" role="alert">
                                {fieldErrors.username}
                            </div>
                        )}
                    </div>

                    {/* Password field with visibility toggle */}
                    <div className="form-group">
                        <label htmlFor="password">
                            Password <span aria-label="required" className="required">*</span>
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-required="true"
                                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                autoComplete="current-password"
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={togglePasswordVisibility}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                tabIndex={0}
                                disabled={isSubmitting}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <div id="password-error" className="invalid-feedback" role="alert">
                                {fieldErrors.password}
                            </div>
                        )}
                    </div>

                    {/* Remember me checkbox */}
                    <div className="form-group form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={isSubmitting}
                        />
                        <label className="form-check-label" htmlFor="rememberMe">
                            Remember me for 30 days
                        </label>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                <span>Signing in...</span>
                            </>
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>

                {/* Additional options */}
                <div className="login-footer">
                    <a href="/forgot-password" className="forgot-password-link">
                        Forgot password?
                    </a>
                    <p className="signup-prompt">
                        Don't have an account? <a href="/signup">Sign Up</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
