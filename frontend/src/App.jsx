import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useSidebar } from './contexts/SidebarContext';

// Pages
import StudentList from './pages/StudentList';
import CollegeList from './pages/CollegeList';
import ProgramList from './pages/ProgramList';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';

// Components
import Sidebar from './components/Sidebar';
import Breadcrumb from './components/Breadcrumb';

import './App.css';


const ProtectedLayout = () => {
  const { isOpen, closeSidebar } = useSidebar();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="App">
      <Sidebar />
      
      {/* Mobile backdrop - now responsive */}
      {isMobile && isOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      
      <main id="main-content" className="main-content">
        <Breadcrumb />
        <Outlet />
      </main>
    </div>
  );
};


const ProtectedRoute = () => {
  const { currentUser } = useAuth();
  return currentUser ? <ProtectedLayout /> : <Navigate to="/login" replace />;
};

function App() {
  const { authChecked } = useAuth();

 
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #4299e1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <>
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
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

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
