import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaSchool, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { currentUser, logout } = useAuth(); // Get user and logout function from context
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login'); // Redirect to login page after successful logout
        } catch (error) {
            console.error("Failed to log out:", error);
            // Optionally show an error to the user
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <FaSchool size={28} />
                <h2>InsTrack</h2>
            </div>
            <nav className="nav-links">
                <NavLink to="/" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} end>
                    Students
                </NavLink>
                <NavLink to="/programs" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                    Programs
                </NavLink>
                <NavLink to="/colleges" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                    Colleges
                </NavLink>
            </nav>
            
             {/* This block will only render when a user is logged in */}
            {currentUser && (
                <div className="sidebar-footer">
                    <div className="user-info">
                        Welcome, <strong>{currentUser.username}</strong>
                    </div>
                    <button onClick={handleLogout} className="logout-button">
                        <FaSignOutAlt style={{ marginRight: '8px' }} />
                        <span>Logout</span>
                    </button>
                </div>
            )}

        </div>
    );
};

export default Sidebar;
