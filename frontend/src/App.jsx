import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Page Components
import StudentList from './pages/StudentList';
import CollegeList from './pages/CollegeList';
import ProgramList from './pages/ProgramList';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';

// Layout Components
import Sidebar from './components/Sidebar';
import Breadcrumb from './components/Breadcrumb';
import { useSidebar } from './contexts/SidebarContext';
import './App.css';

// A layout for protected pages, including the sidebar and main content area
const ProtectedLayout = () => {
    const { isOpen, closeSidebar } = useSidebar();

    return (
        <div className="App">
            <Sidebar />
            {/* Mobile backdrop */}
            {window.innerWidth <= 768 && (
                <div
                    className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}
            <main id="main-content" className="main-content">
                <Breadcrumb />
                <Outlet /> {/* Child routes will render here */}
            </main>
        </div>
    );
};

// A route guard that checks for authentication
const ProtectedRoute = () => {
    const { currentUser } = useAuth();
    return currentUser ? <ProtectedLayout /> : <Navigate to="/login" replace />;
};

function App() {
  const { authChecked } = useAuth();

  // Show a loading indicator while the initial authentication check is in progress
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
        onFocus={(e) => e.target.style.display = 'block'}
        onBlur={(e) => e.target.style.display = 'none'}
      >
        Skip to main content
      </a>

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/colleges" element={<CollegeList />} />
          <Route path="/programs" element={<ProgramList />} />
        </Route>

        {/* Fallback route - redirects to home or login depending on auth status */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
