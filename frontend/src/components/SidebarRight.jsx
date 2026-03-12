import React, { useEffect, useState } from 'react';
import {
  FiUser,
  FiCircle,
  FiCoffee,
  FiBookOpen
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import DirectMessage from './HomePage-components/DirectMessage';
import { getApiBaseUrl } from '../config/api';

const SidebarRight = () => {
  const [followedChannels, setFollowedChannels] = useState([]);
  const [showDirectMessage, setShowDirectMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_BASE_URL = getApiBaseUrl();
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

  const fetchFollowedChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.channels)) {
        setError(data.message || 'Failed to load channels');
        setFollowedChannels([]);
      } else {
        const checks = await Promise.all(
          data.channels.map(async (c) => {
            try {
              const r = await fetch(`${API_BASE_URL}/channels/follow/${encodeURIComponent(c.name)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const x = await r.json();
              return x.success && x.isFollowing ? c : null;
            } catch {
              return null;
            }
          })
        );
        setFollowedChannels(checks.filter(Boolean));
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowedChannels();
  }, []);

  return (
    <aside className="right-sidebar">

      <div className="user-profile">
        <div className="user-avatar large">
          {user ? getInitials(user.displayName) : <FiUser />}
        </div>
        <span>{user?.displayName || 'User'}</span>
      </div>

      <div className="widget">
        <h3>Channels You Follow</h3>

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
        ) : followedChannels.length === 0 ? (
          <div className="empty-state">You are not following any channels yet.</div>
        ) : (
          followedChannels.map((c) => (
            <Link key={c._id} to={`/channels/${encodeURIComponent(c.name)}`} className="chat-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="chat-avatar">
                {c.image ? (
                  <img src={c.image} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <FiCircle />
                )}
              </div>
              <span style={{ textTransform: 'capitalize' }}>{c.name}</span>
            </Link>
          ))
        )}
      </div>

      <div className="widget" style={{ marginTop: '20px' }}>
        <h3>Direct Messages</h3>
        <button
          onClick={() => setShowDirectMessage(true)}
          style={{ width: '100%', padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}
        >
          Open Messages
        </button>
      </div>

      {showDirectMessage && (
        <DirectMessage onClose={() => setShowDirectMessage(false)} />
      )}

    </aside>
  );
};

export default SidebarRight;
