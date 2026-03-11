import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Layout';
import { FiHash, FiLock, FiUsers, FiSearch, FiX, FiGlobe, FiHome as FiLocal, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import '../../styles/Channels.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api");

function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingChannels, setFollowingChannels] = useState({});
  const [requestedChannels, setRequestedChannels] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [searchMeta, setSearchMeta] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = React.useRef(null);
  const inputRef = React.useRef(null);

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

  const fetchChannels = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setError('');
      // Reset search meta when a new search starts
      if (searchQuery.trim()) {
        setSearchMeta(null);
      }
      
      const token = localStorage.getItem('token');
      
      // Use the new federated search endpoint if a query is provided
      const url = searchQuery.trim() 
        ? `${API_BASE_URL}/channels/${encodeURIComponent(searchQuery.trim())}`
        : `${API_BASE_URL}/channels`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const base = response.data.channels || [];
        setChannels(base);
        
        if (searchQuery.trim()) {
          setHasSearched(true);
          setSearchMeta({
            searchType: searchQuery.includes('@') ? 'remote' : 'local',
            count: base.length,
            query: searchQuery
          });
        } else {
          setHasSearched(false);
          setSearchMeta(null);
        }

        base.forEach(channel => {
          checkFollowStatus(channel.federatedId);
        });
      }
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [checkFollowStatus]);

  // Handle debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchChannels(query);
      }, 400);
    } else {
      // If query is cleared, fetch all local channels (default behavior)
      fetchChannels();
    }
    
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchChannels]);

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

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
      fetchChannels(query);
    } catch (err) {
      console.error(err);
    }
  };

  const SkeletonCard = () => (
    <div className="channel-card skeleton">
      <div className="channel-banner skeleton-bg"></div>
      <div className="channel-content">
        <div className="channel-info">
          <div className="skeleton-line skeleton-title"></div>
          <div className="skeleton-line skeleton-subtitle"></div>
          <div className="skeleton-line skeleton-text"></div>
        </div>
      </div>
      <div className="channel-actions">
        <div className="skeleton-button"></div>
      </div>
    </div>
  );

  // Error handling moved inside main return

  // No local filtering needed anymore as the backend handles it via the search endpoint
  const filtered = channels.filter(c => {
    if (activeFilter === 'public') return c.visibility === 'public';
    if (activeFilter === 'private') return c.visibility === 'private';
    if (activeFilter === 'read-only') return c.visibility === 'read-only';
    if (activeFilter === 'joined') return !!followingChannels[c.federatedId];
    return true;
  });

  return (
    <Layout>
      <div className="channels-container">
        <div className="channels-header">
          <h1>Explore Communities</h1>
          <div className="channels-search-wrapper">
            <div className="search-input-wrapper" style={{ margin: 0 }}>
              <FiSearch className="search-icon" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search favorite communities..."
                className="search-input"
                autoComplete="off"
              />
              {query && (
                <button className="search-clear-btn" onClick={clearSearch}>
                  <FiX />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search meta info */}
        {searchMeta && !loading && (
          <div className="search-meta" style={{ marginBottom: '20px' }}>
            <span className={`search-type-badge ${searchMeta.searchType}`}>
              {searchMeta.searchType === 'local' ? <FiLocal size={12} /> : <FiGlobe size={12} />}
              {searchMeta.searchType === 'local' ? 'Local Search' : 'Remote Search'}
            </span>
            <span className="search-count">
              {searchMeta.count} {searchMeta.count === 1 ? 'result' : 'results'} found
            </span>
          </div>
        )}
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

        {error && (
          <div className="search-error" style={{ marginBottom: '20px' }}>
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <div className="channels-grid">
          {loading && [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          
          {!loading && filtered.map(channel => (
            <div key={channel.federatedId} className={`channel-card ${channel.visibility === 'private' ? 'private' : ''}`}>
              <Link to={`/channels/${encodeURIComponent(channel.federatedId)}`} className="channel-card-link">
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
                    className={requestedChannels.includes(channel.federatedId) ? 'btn-following' : 'btn-request'}
                    onClick={() => toggleRequest(channel.federatedId)}
                  >
                    {requestedChannels.includes(channel.federatedId) ? 'Requested' : 'Request Access'}
                  </button>
                ) : (
                  <button
                    className={followingChannels[channel.federatedId] ? 'btn-following' : 'btn-join'}
                    onClick={() => handleFollow(channel.federatedId)}
                  >
                    {followingChannels[channel.federatedId] ? (channel.visibility === 'read-only' ? 'Following' : 'Joined') : (channel.visibility === 'read-only' ? 'Follow' : 'Join')}
                  </button>
                )}
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
              <p>No communities match your filters or search "<strong>{query}</strong>".</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Channels;
