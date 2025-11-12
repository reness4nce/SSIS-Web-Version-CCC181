import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { showSuccessToast, showErrorToast } from '../utils/alert';
import './LoginPage.css';

const SignupPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirm_password: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Clear field error when user starts typing
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: null
            });
        }
    };

    useEffect(() => {
        // Redirect to dashboard if user is already authenticated
        if (currentUser) {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    const validateForm = () => {
        const newErrors = {};

        // Username validation
        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        // Email validation
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
        }

        // Confirm password validation
        if (!formData.confirm_password) {
            newErrors.confirm_password = 'Please confirm your password';
        } else if (formData.password !== formData.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Client-side validation
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.signup(
                formData.username,
                formData.email,
                formData.password,
                formData.confirm_password
            );

            showSuccessToast(response.data.message || 'Account created successfully!');

            // Redirect to login page after successful signup
            navigate('/login');

        } catch (err) {
            console.error('Signup error:', err);

            if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
                // Handle field-specific errors
                const fieldErrors = {};
                err.response.data.errors.forEach(error => {
                    const errorLower = error.toLowerCase();

                    if (errorLower.includes('username') && errorLower.includes('exist')) {
                        fieldErrors.username = 'Username already exists. Please choose a different username.';
                    } else if (errorLower.includes('email') && errorLower.includes('exist')) {
                        fieldErrors.email = 'Email already exists. Please use a different email address.';
                    } else if (errorLower.includes('password')) {
                        fieldErrors.password = error;
                    } else if (errorLower.includes('match')) {
                        fieldErrors.confirm_password = error;
                    } else {
                        // General error
                        showErrorToast(error);
                    }
                });
                setErrors(fieldErrors);
            } else if (err.response?.data?.error) {
                showErrorToast(err.response.data.error);
            } else {
                showErrorToast('Failed to create account. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-content">
                <div className="login-form-section">
                    <div className="login-form-wrapper">
                        <div className="login-header">
                            <h1 className="login-title">Create Account</h1>
                            <p className="login-subtitle">
                                Sign up for InsTrack
                                <br />
                                Join our student management system
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            {Object.keys(errors).length > 0 && (
                                <div className="error-alert">
                                    <svg className="error-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                    </svg>
                                    Please correct the errors below
                                </div>
                            )}

                            <div className="form-field">
                                <label htmlFor="username" className="form-label">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    className={`form-input ${errors.username ? 'input-error' : ''}`}
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter your username"
                                    disabled={isLoading}
                                />
                                {errors.username && (
                                    <span className="field-error" role="alert">
                                        {errors.username}
                                    </span>
                                )}
                            </div>

                            <div className="form-field">
                                <label htmlFor="email" className="form-label">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    disabled={isLoading}
                                />
                                {errors.email && (
                                    <span className="field-error" role="alert">
                                        {errors.email}
                                    </span>
                                )}
                            </div>

                            <div className="form-field">
                                <label htmlFor="password" className="form-label">
                                    Password
                                </label>
                                <div className="password-wrapper">
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        className={`form-input ${errors.password ? 'input-error' : ''}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.password && (
                                    <span className="field-error" role="alert">
                                        {errors.password}
                                    </span>
                                )}
                                <small className="form-text text-muted">
                                    Password must be at least 8 characters with uppercase, lowercase, and number.
                                </small>
                            </div>

                            <div className="form-field">
                                <label htmlFor="confirm_password" className="form-label">
                                    Confirm Password
                                </label>
                                <div className="password-wrapper">
                                    <input
                                        type="password"
                                        id="confirm_password"
                                        name="confirm_password"
                                        className={`form-input ${errors.confirm_password ? 'input-error' : ''}`}
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        placeholder="Confirm your password"
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.confirm_password && (
                                    <span className="field-error" role="alert">
                                        {errors.confirm_password}
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="submit-button"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner" role="status" aria-hidden="true"/>
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    'Sign Up'
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p className="footer-text">
                                Already have an account? <Link to="/login" className="footer-link">Sign In</Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="login-visual-section">
                    <div className="visual-content">
                        <div className="visual-placeholder">
                            <div className="visual-grid"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
