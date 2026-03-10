import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PostCreator from '../components/PostCreator';
import PostList from '../components/PostList';
import { FiHash, FiLock, FiUsers, FiAlertCircle } from 'react-icons/fi';
import '../styles/ChannelPage.css';
import { canPostInChannel, canViewChannelContent } from '../utils/rbac';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api");

const ChannelPage = () => {
  const { channelName } = useParams();
  const decodedChannelName = decodeURIComponent(channelName || '');

  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [currentUserFedId, setCurrentUserFedId] = useState(null);
  const [requestStatus, setRequestStatus] = useState('none');
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role || 'user');
        setCurrentUserFedId(user.federatedId || null);
      }
    } catch {
      setUserRole('user');
      setCurrentUserFedId(null);
    }
  }, []);

  // Fetch posts and filter for current channel
  const fetchChannelPosts = async (name) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/posts`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        const filtered = data.posts.filter(
          (p) => p.isChannelPost && p.channelName === name
        );
        setPosts(filtered);
      } else {
        setError(data.message || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching channel posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch channel details
  const fetchChannelDetails = async (name) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/${encodeURIComponent(name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        let channelObj = Array.isArray(data.channels)
          ? data.channels.find(c => c.name === name) || data.channels[0]
          : (data.channels || data.channel);
        if (channelObj) {
          setCurrentChannel(channelObj);
        }
      }
    } catch (err) {
      console.error('Error fetching channel details:', err);
    }
  };

  // Fetch pending requests (for admin only)
  const fetchPendingRequests = async (name) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/requests/${encodeURIComponent(name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  // Check user's request status
  const checkRequestStatus = async (name) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/request-status/${encodeURIComponent(name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequestStatus(data.status); // "none", "pending", "rejected"
      }
    } catch (err) {
      console.error('Error checking request status:', err);
    }
  };

  // Check follow status
  const checkFollowStatus = async (name) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/follow/${encodeURIComponent(name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.isFollowing);
      }
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };

  // Toggle follow
  const handleFollowToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isFollowing
        ? `${API_BASE_URL}/channels/unfollow/${encodeURIComponent(decodedChannelName)}`
        : `${API_BASE_URL}/channels/follow/${encodeURIComponent(decodedChannelName)}`;

      const res = await fetch(endpoint, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(!isFollowing);
        // Refresh channel details to get updated follower count
        fetchChannelDetails(decodedChannelName);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  // Request Access
  const handleRequestAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/request-access/${encodeURIComponent(decodedChannelName)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequestStatus('pending');
      } else {
        alert(data.message || 'Failed to request access');
      }
    } catch (err) {
      console.error('Error requesting access:', err);
    }
  };

  // Resolve Request (admin)
  const handleResolveRequest = async (userFederatedId, action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/resolve-request/${encodeURIComponent(decodedChannelName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userFederatedId, action })
      });
      const data = await res.json();
      if (data.success) {
        setPendingRequests(prev => prev.filter(r => r.userFederatedId !== userFederatedId));
      } else {
        alert(data.message || 'Failed to resolve request');
      }
    } catch (err) {
      console.error('Error resolving request:', err);
    }
  };

  const handleLikePost = async (postId) => {
    // PostList.jsx handles liking internally now — this is a fallback no-op
    // kept for prop compatibility
  };

  const handleDeletePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.filter(p => p._id !== postId));
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };
  useEffect(() => {
    if (decodedChannelName) {
      fetchChannelDetails(decodedChannelName);
      fetchChannelPosts(decodedChannelName);
      checkFollowStatus(decodedChannelName);
      checkRequestStatus(decodedChannelName);
    }
  }, [decodedChannelName]);

  const getDisplayName = (name) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <Layout>
      <div className="channel-page-container">
        {/* Channel Hero Section */}
        <div className="channel-hero">
          <div className={currentChannel?.image ? "hero-banner" : "hero-banner placeholder"}
            style={currentChannel?.image ? { backgroundImage: `url(${currentChannel.image})` } : {}}>
            {currentChannel?.image && <div className="banner-overlay"></div>}
            {!currentChannel?.image && (currentChannel?.visibility === 'private' ? <FiLock /> : <FiHash />)}
          </div>

          <div className={currentChannel?.image ? "hero-content has-image" : "hero-content"}>
            <div className="hero-main">
              {currentChannel?.image && (
                <div className="channel-avatar-large">
                  <img src={currentChannel.image} alt="" />
                </div>
              )}
              <div className={currentChannel?.image ? "hero-text on-dark" : "hero-text on-light"}>
                <div className={currentChannel?.image ? "channel-meta on-dark" : "channel-meta on-light"}>
                  {currentChannel?.visibility === 'public'
                    ? 'Public Community'
                    : currentChannel?.visibility === 'read-only'
                      ? 'Read-only Community'
                      : 'Private Community'} • {currentChannel?.followersCount || 0} followers
                </div>
                <h1>{getDisplayName(decodedChannelName)}</h1>
              </div>
            </div>

            {(userRole === 'admin' || currentChannel?.createdBy === currentUserFedId) ? (
              <button className="btn-follow-toggle following" disabled style={{ opacity: 0.8, cursor: 'default' }}>
                {userRole === 'admin' ? 'Admin Access' : 'Creator Access'}
              </button>
            ) : currentChannel?.visibility === 'private' ? (
              <button
                className={`btn-follow-toggle ${requestStatus === 'pending' ? 'following' : isFollowing ? 'following' : 'join'}`}
                onClick={isFollowing ? handleFollowToggle : (requestStatus === 'none' || requestStatus === 'rejected') ? handleRequestAccess : undefined}
                disabled={requestStatus === 'pending'}
                title={requestStatus === 'rejected' ? 'Your previous request was rejected. Click to request again.' : ''}
              >
                {isFollowing ? 'Joined' : requestStatus === 'pending' ? 'Requested' : requestStatus === 'rejected' ? 'Request Again' : 'Request Access'}
              </button>
            ) : (
              <button
                className={isFollowing ? "btn-follow-toggle following" : "btn-follow-toggle join"}
                onClick={handleFollowToggle}
              >
                {isFollowing ? 'Joined' : 'Join Community'}
              </button>
            )}
          </div>

          {currentChannel?.description && (
            <div className="hero-description">
              {currentChannel.description}
            </div>
          )}
        </div>

        {/* Create Post Section - RBAC enforced */}
        {canPostInChannel({ role: userRole }, currentChannel, isFollowing) ? (
          <PostCreator
            isChannelPost={true}
            channelName={decodedChannelName}
            onPostCreated={(newPost) => setPosts([newPost, ...posts])}
          />
        ) : (
          <div className="empty-state channel-restricted-msg">
            <FiAlertCircle size={20} />
            <span>
              {currentChannel?.visibility === 'read-only'
                ? 'This channel is read-only. Only admins can post here.'
                : currentChannel?.visibility === 'private' && !isFollowing
                  ? 'Join this community to participate in discussions.'
                  : 'You do not have permission to post in this channel.'}
            </span>
          </div>
        )}

        {/* Posts Feed Section */}
        {loading ? (
          <div className="loading-state">Loading posts...</div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
        ) : !canViewChannelContent({ role: userRole }, currentChannel, isFollowing) && userRole !== 'admin' ? (
          <div className="empty-state">
            <FiLock size={48} style={{ marginBottom: '16px', color: '#6b7280' }} />
            <h3>This is a private community</h3>
            <p>Request access or join to view discussions and posts.</p>
          </div>
        ) : (
          <PostList
            posts={posts}
            onLike={handleLikePost}
            onDeletePost={handleDeletePost}
            onRepostSuccess={(newPost) => setPosts([newPost, ...posts])}
          />
        )}
      </div>
    </Layout>
  );
};

export default ChannelPage;