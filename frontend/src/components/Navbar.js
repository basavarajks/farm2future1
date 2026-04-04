import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">🌾</div>
          Agri<span>Connect</span>
        </Link>

        <Link to="/prices" className={`nav-link ${isActive('/prices') ? 'active' : ''}`}>📊 Market Prices</Link>
        <Link to="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`}>🔍 Search</Link>
        <Link to="/listings" className={`nav-link ${isActive('/listings') ? 'active' : ''}`}>📋 Listings</Link>
        <Link to="/buyers" className={`nav-link ${isActive('/buyers') ? 'active' : ''}`}>🏢 Buyers</Link>

        {user ? (
          <div className="nav-user" style={{ marginLeft: 8 }}>
            <div className="nav-avatar">{user.name[0].toUpperCase()}</div>
            <span style={{ color: 'var(--white)', fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
            <Link to="/dashboard" className="nav-link" style={{ marginLeft: 4 }}>Dashboard</Link>
            <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none', color: 'var(--ink-200)', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="nav-link" style={{ marginLeft: 8 }}>Login</Link>
            <Link to="/register"><button className="nav-btn">Register Free</button></Link>
          </>
        )}
      </div>
    </nav>
  );
}
