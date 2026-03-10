import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Layout';
import { FiHash, FiLock, FiUsers } from 'react-icons/fi';
import axios from 'axios';
import '../../styles/Channels.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api");

function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingChannels, setFollowingChannels] = useState({});
  const [requestStatuses, setRequestStatuses] = useState({}); // { channelName: "none"|"pending"|"rejected" }
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');

  const userStr = localStorage.getItem('user');
  let isAdmin = false;
  try {
    if (userStr) isAdmin = JSON.parse(userStr).role === 'admin';
  } catch (err) {
    // ignore parse errors
  }


  const checkFollowStatus = useCallback(async (channelName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/channels/follow/${channelName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setFollowingChannels(prev => ({ ...prev, [channelName]: response.data.isFollowing }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const checkRequestStatus = useCallback(async (channelName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/channels/request-status/${channelName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRequestStatuses(prev => ({ ...prev, [channelName]: response.data.status }));
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
          if (channel.visibility === 'private') {
            checkRequestStatus(channel.name);
          }
        });
      }
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [checkFollowStatus, checkRequestStatus]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleRequestAccess = async (channelName) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/channels/request-access/${channelName}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequestStatuses(prev => ({ ...prev, [channelName]: 'pending' }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request access';
      alert(msg);
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
      setFollowingChannels(prev => ({ ...prev, [channelName]: !isFollowing }));
      fetchChannels();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <Layout>
      <div className="channels-container">
        <div className="channels-header"><h1>Channels</h1></div>
        <p>Loading channels...</p>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="channels-container">
        <div className="channels-header"><h1>Channels</h1></div>
        <p className="error-message">{error}</p>
      </div>
    </Layout>
  );

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
              style={{ width: '340px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', marginBottom: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          {['all', 'public', 'joined', 'private', 'read-only'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                border: 'none', background: 'transparent', padding: '8px 4px',
                color: activeFilter === f ? '#111827' : '#6b7280',
                fontWeight: activeFilter === f ? 700 : 500,
                borderBottom: activeFilter === f ? '2px solid #111827' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              {f === 'all' ? 'All' : f === 'public' ? 'Public' : f === 'joined' ? 'Joined' : f === 'private' ? 'Private' : 'Read‑only'}
            </button>
          ))}
        </div>

        <div className="channels-grid">
          {filtered.map(channel => {
            const reqStatus = requestStatuses[channel.name] || 'none';
            const isFollowing = !!followingChannels[channel.name];

            return (
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
                      <p className="channel-members"><FiUsers /> {channel.followersCount || 0} followers</p>
                      <p className="channel-description">{channel.description}</p>
                    </div>
                  </div>
                </Link>

                <div className="channel-actions">
                  {channel.visibility === 'private' ? (
                    isFollowing ? (
                      <button className="btn-following">Joined</button>
                    ) : (
                      <button
                        className={reqStatus === 'pending' ? 'btn-following' : 'btn-request'}
                        onClick={() => (reqStatus === 'none' || reqStatus === 'rejected') && handleRequestAccess(channel.name)}
                        disabled={reqStatus === 'pending'}
                        title={reqStatus === 'rejected' ? 'Your previous request was rejected. Click to request again.' : ''}
                      >
                        {reqStatus === 'pending' ? 'Requested' : reqStatus === 'rejected' ? 'Request Again' : (isAdmin ? 'Admin Access' : 'Request Access')}
                      </button>
                    )
                  ) : (
                    <button
                      className={isFollowing ? 'btn-following' : 'btn-join'}
                      onClick={() => handleFollow(channel.name)}
                    >
                      {isFollowing
                        ? (channel.visibility === 'read-only' ? 'Following' : 'Joined')
                        : (channel.visibility === 'read-only' ? 'Follow' : 'Join')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>No communities match your filters.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Channels;