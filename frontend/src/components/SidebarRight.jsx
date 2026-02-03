import React from 'react';
import {
  FiUser,
  FiUsers,
  FiCircle,
  FiCoffee,
  FiBookOpen
} from 'react-icons/fi';
import { GiCook, GiBread, GiKnifeFork } from 'react-icons/gi';

const SidebarRight = () => {
  const getUserData = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user);
      } catch {
        return null;
      }
    }
    return null;
  };

  const user = getUserData();

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="right-sidebar">

      <div className="user-profile">
        <div className="user-avatar large">
          {user ? getInitials(user.displayName) : <FiUser />}
        </div>
        <span>{user?.displayName || 'User'}</span>
      </div>

      <div className="widget">
        <h3>Channels</h3>

        <div className="chat-item">
          <div className="chat-avatar">
            <GiCook />
          </div>
          <span>Recipes</span>
        </div>

        <div className="chat-item">
          <div className="chat-avatar">
            <GiBread />
          </div>
          <span>Baking</span>
        </div>

        <div className="chat-item">
          <div className="chat-avatar">
            <GiKnifeFork />
          </div>
          <span>Restaurants</span>
        </div>
      </div>

      <div className="widget">
        <h3>Popular Users</h3>

        <div className="contact-item">
          <div className="contact-avatar online">
            <FiUser />
          </div>
          <span>Mark Larsen</span>
        </div>

        <div className="contact-item">
          <div className="contact-avatar online">
            <FiUser />
          </div>
          <span>Ethan Reynolds</span>
        </div>

        <div className="contact-item">
          <div className="contact-avatar online">
            <FiUser />
          </div>
          <span>Ava Thompson</span>
        </div>

        <div className="contact-item">
          <div className="contact-avatar online">
            <FiUser />
          </div>
          <span>Haarper Mitchell</span>
        </div>

        <div className="contact-item">
          <div className="contact-avatar online">
            <FiUser />
          </div>
          <span>Pablo Morandi</span>
        </div>

        <div className="contact-item">
          <div className="contact-avatar online">
            <FiUser />
          </div>
          <span>Isabel Hughes</span>
        </div>
      </div>

    </aside>
  );
};

export default SidebarRight;
