import React from 'react';
import {
  FiHome,
  FiUser,
  FiMessageCircle,
  FiUsers,
  FiFileText,
  FiBookOpen,
  FiCalendar,
  FiSettings
} from 'react-icons/fi';

const SidebarLeft = () => {
  return (
    <aside className="left-sidebar">
      <div className="logo">Connected</div>

      <nav className="main-nav">
        <div className="nav-item active">
          <FiHome className="icon" /> Home
        </div>

        <div className="nav-item">
          <FiUser className="icon" /> Profile
        </div>

        <div className="nav-item">
          <FiFileText className="icon" /> Channels
        </div>

        <div className="nav-item">
          <FiSettings className="icon" /> Settings
        </div>
      </nav>
    </aside>
  );
};

export default SidebarLeft;
