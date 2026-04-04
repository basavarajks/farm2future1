import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Prices from './pages/Prices';
import Search from './pages/Search';
import Listings from './pages/Listings';
import Buyers from './pages/Buyers';
import Dashboard from './pages/Dashboard';
import { LoginPage, RegisterPage } from './pages/Auth';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return user ? children : <Navigate to="/login" />;
}

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function AuthLayout({ children }) {
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
          <Route path="/" element={<AppLayout><Home /></AppLayout>} />
          <Route path="/prices" element={<AppLayout><Prices /></AppLayout>} />
          <Route path="/search" element={<AppLayout><Search /></AppLayout>} />
          <Route path="/listings" element={<AppLayout><Listings /></AppLayout>} />
          <Route path="/buyers" element={<AppLayout><Buyers /></AppLayout>} />
          <Route path="/dashboard" element={
            <AppLayout>
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            </AppLayout>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
