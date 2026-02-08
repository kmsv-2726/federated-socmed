import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { FiHash, FiLock, FiUsers } from 'react-icons/fi';
import axios from 'axios';
import '../../styles/Channels.css';

const API_BASE_URL = 'http://localhost:5000/api';

function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingChannels, setFollowingChannels] = useState({});

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setChannels(response.data.channels);
        // Check follow status for each channel
        response.data.channels.forEach(channel => {
          checkFollowStatus(channel.name);
        });
      }
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async (channelName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/channels/follow/${channelName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFollowingChannels(prev => ({
          ...prev,
          [channelName]: response.data.isFollowing
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (channelName) => {
    try {
      const token = localStorage.getItem('token');
      const isFollowing = followingChannels[channelName];

      if (isFollowing) {
        await axios.delete(`${API_BASE_URL}/channels/unfollow/${channelName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/channels/follow/${channelName}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Update local state
      setFollowingChannels(prev => ({
        ...prev,
        [channelName]: !isFollowing
      }));

      // Refresh channels to get updated follower count
      fetchChannels();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="channels-container">
          <div className="channels-header">
            <h1>Channels</h1>
          </div>
          <p>Loading channels...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="channels-container">
          <div className="channels-header">
            <h1>Channels</h1>
          </div>
          <p className="error-message">{error}</p>
        </div>
      </Layout>
    );
  }

  const publicChannels = channels.filter(c => c.visibility === 'public');
  const privateChannels = channels.filter(c => c.visibility === 'private');

  return (
    <Layout>
      <div className="channels-container">
        <div className="channels-header">
          <h1>Channels</h1>
        </div>

        <div className="channels-list">
          {publicChannels.length > 0 && (
            <div className="channels-section">
              <h2>Public Channels</h2>
              <div className="channels-grid">
                {publicChannels.map(channel => (
                  <div key={channel._id} className="channel-card">
                    <div className="channel-icon">
                      <FiHash />
                    </div>
                    <div className="channel-info">
                      <h3>{channel.name}</h3>
                      <p className="channel-description">{channel.description}</p>
                      <p className="channel-members">
                        <FiUsers /> {channel.followersCount || 0} members
                      </p>
                    </div>
                    <button
                      className={followingChannels[channel.name] ? 'btn-following' : 'btn-join'}
                      onClick={() => handleFollow(channel.name)}
                    >
                      {followingChannels[channel.name] ? 'Following' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {privateChannels.length > 0 && (
            <div className="channels-section">
              <h2>Private Channels</h2>
              <div className="channels-grid">
                {privateChannels.map(channel => (
                  <div key={channel._id} className="channel-card private">
                    <div className="channel-icon">
                      <FiLock />
                    </div>
                    <div className="channel-info">
                      <h3>{channel.name}</h3>
                      <p className="channel-description">{channel.description}</p>
                      <p className="channel-members">
                        <FiUsers /> {channel.followersCount || 0} members
                      </p>
                    </div>
                    <button
                      className={followingChannels[channel.name] ? 'btn-following' : 'btn-request'}
                      onClick={() => handleFollow(channel.name)}
                    >
                      {followingChannels[channel.name] ? 'Following' : 'Request'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {channels.length === 0 && (
            <div className="empty-state">
              <p>No channels available yet.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Channels;