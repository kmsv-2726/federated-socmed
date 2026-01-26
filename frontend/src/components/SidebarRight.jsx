import React from 'react';
import {
  FiUser,
  FiUsers,
  FiCircle
} from 'react-icons/fi';
import { FaFutbol, FaCarSide } from 'react-icons/fa';
import { GiCricketBat } from 'react-icons/gi';

const SidebarRight = () => {
  return (
    <aside className="right-sidebar">

      <div className="user-profile">
        <div className="user-avatar large">
          <FiUser />
        </div>
        <span>Ben Goro</span>
      </div>

      <div className="widget">
        <h3>Channels</h3>

        <div className="chat-item">
          <div className="chat-avatar">
            <FaFutbol />
          </div>
          <span>Football</span>
        </div>

        <div className="chat-item">
          <div className="chat-avatar">
            <GiCricketBat />
          </div>
          <span>Cricket</span>
        </div>

        <div className="chat-item">
          <div className="chat-avatar">
            <FaCarSide />
          </div>
          <span>F1</span>
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
