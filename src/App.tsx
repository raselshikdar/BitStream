import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { HeaderProvider } from './context/HeaderContext';
import Layout from './components/Layout';
import { Toaster } from 'sonner';

// Pages
import Home from './pages/Home';
import Search from './pages/Search';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import PostDetails from './pages/PostDetails';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isGuest } = useAuth();
  if (loading) return null;
  if (!user && !isGuest) return <Navigate to="/welcome" />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="animate-pulse font-mono text-accent">INITIALIZING_BITSTREAM...</div>
    </div>
  );

  return (
    <Routes>
      <Route path="/welcome" element={user ? <Navigate to="/" /> : <Welcome />} />
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
      <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Layout><Search /></Layout></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="/profile/:uid" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="/post/:postId" element={<ProtectedRoute><Layout><PostDetails /></Layout></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <AppRoutes />
      <Toaster 
        position="top-center" 
        richColors 
        theme={theme === 'dark' ? 'dark' : 'light'}
        toastOptions={{
          style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold'
          }
        }}
      />
    </>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <HeaderProvider>
            <AppContent />
          </HeaderProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
