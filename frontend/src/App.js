import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Page Components
import StudentList from './pages/StudentList';
import CollegeList from './pages/CollegeList';
import ProgramList from './pages/ProgramList';
import LoginPage from './pages/LoginPage';

// Layout Components
import Sidebar from './components/Sidebar';
import './App.css';

// Your ProtectedLayout is perfect and needs no changes.
const ProtectedLayout = () => {
    const { currentUser } = useAuth();
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }
    return (
        <div className="App">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

// --- NEW, MORE ROBUST App COMPONENT ---
function App() {
  const { currentUser, isLoading } = useAuth();

  // If we are still checking the initial auth status, show a loading message
  // This prevents a "flash" of the login page for already-logged-in users on refresh
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
        {/*
          MODIFIED PUBLIC ROUTE:
          - If a user is logged in, visiting /login will redirect them to the homepage.
          - If they are not logged in, it will show the LoginPage.
        */}
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} 
        />

        {/* --- PROTECTED ROUTES --- */}
        {/* This part remains the same. It's already correctly implemented. */}
        <Route element={<ProtectedLayout />}>
            <Route path="/" element={<StudentList />} />
            <Route path="/colleges" element={<CollegeList />} />
            <Route path="/programs" element={<ProgramList />} />
        </Route>

        {/* --- FALLBACK --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
