import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PostCreator from '../components/PostCreator';
import PostList from '../components/PostList';
import { FiHash, FiLock, FiUsers } from 'react-icons/fi';
import '../styles/ChannelPage.css';

const API_BASE_URL = "http://localhost:5000/api";

const ChannelPage = () => {
  const { channelName } = useParams();
  const decodedChannelName = decodeURIComponent(channelName || '');

  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role || 'user');
      }
    } catch {
      setUserRole('user');
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
        setCurrentChannel(data.channel);
      }
    } catch (err) {
      console.error('Error fetching channel details:', err);
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

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/posts/like/${postId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(post =>
          post._id === postId
            ? { ...post, likeCount: data.likeCount, liked: data.liked }
            : post
        ));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
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
      const req = JSON.parse(localStorage.getItem('requestedChannels') || '[]');
      setRequested(Array.isArray(req) ? req.includes(decodedChannelName) : false);
      fetchChannelDetails(decodedChannelName);
      fetchChannelPosts(decodedChannelName);
      checkFollowStatus(decodedChannelName);
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

            {currentChannel?.visibility === 'private' ? (
              <button
                className={requested ? "btn-follow-toggle following" : "btn-follow-toggle join"}
                onClick={() => {
                  const prev = JSON.parse(localStorage.getItem('requestedChannels') || '[]');
                  const next = Array.isArray(prev)
                    ? (requested ? prev.filter(n => n !== decodedChannelName) : [...prev, decodedChannelName])
                    : [decodedChannelName];
                  localStorage.setItem('requestedChannels', JSON.stringify(next));
                  setRequested(!requested);
                }}
              >
                {requested ? 'Requested' : 'Request Access'}
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

        {/* Create Post Section */}
        {(currentChannel?.visibility === 'public' ||
          (currentChannel?.visibility === 'read-only' && userRole === 'admin')) ? (
          <PostCreator
            isChannelPost={true}
            channelName={decodedChannelName}
            onPostCreated={(newPost) => setPosts([newPost, ...posts])}
          />
        ) : (
          <div className="empty-state" style={{ marginBottom: '16px' }}>
            {currentChannel?.visibility === 'private'
              ? 'This channel is private. You cannot post here.'
              : 'This channel is read-only.'}
          </div>
        )}

        {/* Posts Feed Section */}
        {loading ? (
          <div className="loading-state">Loading posts...</div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
        ) : currentChannel?.visibility === 'private' && !isFollowing && userRole !== 'admin' ? (
          <div className="empty-state">
            This is a private channel. Request access to view posts.
          </div>
        ) : (
          <PostList
            posts={posts}
            onLike={handleLikePost}
            onDelete={handleDeletePost}
          />
        )}
      </div>
    </Layout>
  );
};

export default ChannelPage;
