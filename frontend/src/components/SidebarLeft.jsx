import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiUser,
  FiFileText,
  FiSettings,
  FiServer,
  FiLogOut,
  FiShield,
  FiHelpCircle
} from 'react-icons/fi';

const SidebarLeft = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
    }
  }, []);

  const handleNavClick = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <aside className="left-sidebar">
      <div className="logo">Connected</div>

      <nav className="main-nav">
        <button
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => handleNavClick('/')}
        >
          <FiHome className="icon" /> Home
        </button>
        <button
          className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
          onClick={() => handleNavClick('/profile')}
        >
          <FiUser className="icon" /> Profile
        </button>
        <button
          className={`nav-item ${isActive('/channels') ? 'active' : ''}`}
          onClick={() => handleNavClick('/channels')}
        >
          <FiFileText className="icon" /> Channels
        </button>
        <button
          className={`nav-item ${isActive('/server-details') ? 'active' : ''}`}
          onClick={() => handleNavClick('/server-details')}
        >
          <FiServer className="icon" /> Server Details
        </button>
        <button
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => handleNavClick('/settings')}
        >
          <FiSettings className="icon" /> Settings
        </button>
        {isAdmin && (
          <button
            className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
            onClick={() => handleNavClick('/admin')}
          >
            <FiShield className="icon" /> Admin
          </button>
        )}
        <button
          className={`nav-item ${isActive('/help-center') ? 'active' : ''}`}
          onClick={() => handleNavClick('/help-center')}
        >
          <FiHelpCircle className="icon" /> Help Center
        </button>
        <button
          className="nav-item logout-btn"
          onClick={handleLogout}
        >
          <FiLogOut className="icon" /> Logout
        </button>
      </nav>
    </aside>
  );
};

export default SidebarLeft;
