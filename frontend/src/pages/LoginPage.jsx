import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState(''); // Changed from 'email' to 'identifier'
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({ identifier: '', password: '' }); // Updated field names
    
    const identifierRef = useRef(null);
    const errorRef = useRef(null);

    useEffect(() => {
        identifierRef.current?.focus();
    }, []);

    useEffect(() => {
        if (error && errorRef.current) {
            errorRef.current.focus();
        }
    }, [error]);

    useEffect(() => {
        if (currentUser) {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = () => {
        const errors = { identifier: '', password: '' };
        let isValid = true;

        if (!identifier.trim()) {
            errors.identifier = 'Username or email is required';
            isValid = false;
        } else if (identifier.includes('@') && !isValidEmail(identifier)) {
            errors.identifier = 'Please enter a valid email address';
            isValid = false;
        } else if (!identifier.includes('@') && identifier.length < 3) {
            errors.identifier = 'Username must be at least 3 characters';
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
        setFieldErrors({ identifier: '', password: '' });

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Send as 'username' field to match backend expectation
            await login(identifier, password, rememberMe);
        } catch (err) {
            console.error('Login error:', err);

            if (err.response?.data) {
                const errorData = err.response.data;
                setError(
                    errorData.error || 
                    (Array.isArray(errorData.errors) ? errorData.errors.join(', ') : null) ||
                    (typeof errorData === 'string' ? errorData : null) ||
                    'Invalid credentials. Please try again.'
                );
            } else if (err.request) {
                setError('Network error. Please check your connection.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <div className="login-page">
            <div className="login-content">
                <div className="login-form-section">
                    <div className="login-form-wrapper">
                        <div className="login-header">
                            <h1 className="login-title">InsTrack</h1>
                            <p className="login-subtitle">
                                Welcome to the InsTrack Web App.
                                <br />
                                Sign in to continue.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="login-form">
                            {error && (
                                <div 
                                    ref={errorRef}
                                    className="error-alert" 
                                    role="alert"
                                    aria-live="polite"
                                    tabIndex={-1}
                                >
                                    <svg className="error-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <div className="form-field">
                                <label htmlFor="identifier" className="form-label">
                                    Username or E-mail
                                </label>
                                <input
                                    ref={identifierRef}
                                    type="text"
                                    id="identifier"
                                    name="identifier"
                                    className={`form-input ${fieldErrors.identifier ? 'input-error' : ''}`}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="Enter your username or email"
                                    aria-required="true"
                                    aria-invalid={!!fieldErrors.identifier}
                                    aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                                    autoComplete="username"
                                    disabled={isSubmitting}
                                />
                                {fieldErrors.identifier && (
                                    <span id="identifier-error" className="field-error" role="alert">
                                        {fieldErrors.identifier}
                                    </span>
                                )}
                            </div>

                            <div className="form-field">
                                <label htmlFor="password" className="form-label">
                                    Password
                                </label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        aria-required="true"
                                        aria-invalid={!!fieldErrors.password}
                                        aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                        autoComplete="current-password"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={togglePasswordVisibility}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        disabled={isSubmitting}
                                    >
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <span id="password-error" className="field-error" role="alert">
                                        {fieldErrors.password}
                                    </span>
                                )}
                            </div>

                            <div className="form-options">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        className="checkbox-input"
                                        id="rememberMe"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        disabled={isSubmitting}
                                    />
                                    <span className="checkbox-text">Remember me</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="submit-button"
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner" role="status" aria-hidden="true"/>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p className="footer-text">
                                Don't have an account? <Link to="/signup" className="footer-link">Sign Up</Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="login-visual-section">
                    <div className="visual-content">
                        {/* Add your 3D illustration or background image here */}
                        <div className="visual-placeholder">
                            <div className="visual-grid"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
