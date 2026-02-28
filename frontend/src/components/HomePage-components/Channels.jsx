import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  const [requestedChannels, setRequestedChannels] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');

  const checkFollowStatus = useCallback(async (channelName) => {
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
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const base = response.data.channels || [];
        setChannels(base);
        base.forEach(channel => {
          checkFollowStatus(channel.name);
        });
      }
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [checkFollowStatus]);

  useEffect(() => {
    const req = JSON.parse(localStorage.getItem('requestedChannels') || '[]');
    setRequestedChannels(Array.isArray(req) ? req : []);
    fetchChannels();
  }, [fetchChannels]);

  

  const toggleRequest = (channelName) => {
    setRequestedChannels(prev => {
      const exists = prev.includes(channelName);
      const next = exists ? prev.filter(n => n !== channelName) : [...prev, channelName];
      localStorage.setItem('requestedChannels', JSON.stringify(next));
      return next;
    });
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

  // Derived lists handled via filtered + activeFilter
  const filtered = channels
    .filter(c => {
      const t = (c.name + ' ' + (c.description || '')).toLowerCase();
      return t.includes(query.toLowerCase());
    })
    .filter(c => {
      if (activeFilter === 'public') return c.visibility === 'public';
      if (activeFilter === 'private') return c.visibility === 'private';
      if (activeFilter === 'read-only') return c.visibility === 'read-only';
      if (activeFilter === 'joined') return !!followingChannels[c.name];
      return true;
    });

  return (
    <Layout>
      <div className="channels-container">
        <div className="channels-header">
          <h1>Explore Communities</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search favorite communities..."
              style={{
                width: '340px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '18px', marginBottom: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          {['all', 'public', 'joined', 'private', 'read-only'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '8px 4px',
                color: activeFilter === f ? '#111827' : '#6b7280',
                fontWeight: activeFilter === f ? 700 : 500,
                borderBottom: activeFilter === f ? '2px solid #111827' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              {f === 'all' ? 'All' :
               f === 'public' ? 'Public' :
               f === 'joined' ? 'Joined' :
               f === 'private' ? 'Private' : 'Read‑only'}
            </button>
          ))}
        </div>

        <div className="channels-grid">
          {filtered.map(channel => (
            <div key={channel._id} className={`channel-card ${channel.visibility === 'private' ? 'private' : ''}`}>
              <Link to={`/channels/${encodeURIComponent(channel.name)}`} className="channel-card-link">
                {channel.image ? (
                  <div className="channel-banner">
                    <img src={channel.image} alt={channel.name} />
                    <div className="banner-overlay"></div>
                  </div>
                ) : (
                  <div className={`channel-banner ${channel.visibility === 'private' ? 'placeholder-private' : 'placeholder'}`}>
                    {channel.visibility === 'private' ? <FiLock /> : <FiHash />}
                  </div>
                )}
                <div className="channel-content">
                  <div className="channel-info">
                    <h3>{channel.name}</h3>
                    <p className="channel-members">
                      <FiUsers /> {channel.followersCount || 0} followers
                    </p>
                    <p className="channel-description">{channel.description}</p>
                  </div>
                </div>
              </Link>
              <div className="channel-actions">
                {channel.visibility === 'private' ? (
                  <button
                    className={requestedChannels.includes(channel.name) ? 'btn-following' : 'btn-request'}
                    onClick={() => toggleRequest(channel.name)}
                  >
                    {requestedChannels.includes(channel.name) ? 'Requested' : 'Request Access'}
                  </button>
                ) : (
                  <button
                    className={followingChannels[channel.name] ? 'btn-following' : 'btn-join'}
                    onClick={() => handleFollow(channel.name)}
                  >
                    {followingChannels[channel.name] ? (channel.visibility === 'read-only' ? 'Following' : 'Joined') : (channel.visibility === 'read-only' ? 'Follow' : 'Join')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              No communities match your filters.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Channels;
