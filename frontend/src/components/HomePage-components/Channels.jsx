import React from 'react';
import Layout from '../Layout';
import { FiHash, FiLock, FiUsers, FiPlus } from 'react-icons/fi';
import '../../styles/Channels.css';

function Channels() {
  const channels = [
    { id: 1, name: 'recipes', type: 'public', members: 1234 },
    { id: 2, name: 'baking', type: 'public', members: 892 },
    { id: 3, name: 'restaurants', type: 'public', members: 456 },
    { id: 4, name: 'food-news', type: 'public', members: 2341 },
    { id: 5, name: 'vegan-cooking', type: 'private', members: 23 },
    { id: 6, name: 'chef-secrets', type: 'private', members: 15 }
  ];

  return (
    <Layout>
      <div className="channels-container">
        <div className="channels-header">
          <h1>Channels</h1>
        </div>

        <div className="channels-list">
          <div className="channels-section">
            <h2>Public Channels</h2>
            <div className="channels-grid">
              {channels.filter(c => c.type === 'public').map(channel => (
                <div key={channel.id} className="channel-card">
                  <div className="channel-icon">
                    <FiHash />
                  </div>
                  <div className="channel-info">
                    <h3>{channel.name}</h3>
                    <p className="channel-members">
                      <FiUsers /> {channel.members} members
                    </p>
                  </div>
                  <button className="btn-join">Join</button>
                </div>
              ))}
            </div>
          </div>

          <div className="channels-section">
            <h2>Private Channels</h2>
            <div className="channels-grid">
              {channels.filter(c => c.type === 'private').map(channel => (
                <div key={channel.id} className="channel-card private">
                  <div className="channel-icon">
                    <FiLock />
                  </div>
                  <div className="channel-info">
                    <h3>{channel.name}</h3>
                    <p className="channel-members">
                      <FiUsers /> {channel.members} members
                    </p>
                  </div>
                  <button className="btn-request">Request</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Channels;