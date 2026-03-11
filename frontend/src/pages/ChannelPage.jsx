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
  const [requested, setRequested] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [followStatus, setFollowStatus] = useState(null); // 'active', 'pending', or null

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
  const fetchChannelPosts = async (name, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/posts/channels?channelFederatedId=${encodeURIComponent(name)}&limit=10&page=${pageNum}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        if (pageNum === 1) {
          setPosts(data.posts);
        } else {
          setPosts(prev => [...prev, ...data.posts]);
        }
        setHasMore(data.hasMore || false);
      } else {
        setError(data.message || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching channel posts:', err);
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchChannelPosts(decodedChannelName, nextPage);
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
        let channelObj = null;
        if (data.channel) {
          channelObj = data.channel;
        } else if (data.channels) {
          if (Array.isArray(data.channels)) {
            channelObj = data.channels.find(c => c.name === name) || data.channels[0];
          } else {
            channelObj = data.channels;
          }
        }
        setCurrentChannel(channelObj);
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
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.isFollowing);
        setFollowStatus(data.status);
      }
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };

  const handleRequestAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/channels/request/${encodeURIComponent(decodedChannelName)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFollowStatus('pending');
        setRequested(true);
      } else {
        setError(data.message || 'Failed to request access');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
        // Also update followStatus if it was 'active' and now unfollowed
        if (isFollowing) {
          setFollowStatus(null);
        } else {
          setFollowStatus('active');
        }
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

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  useEffect(() => {
    if (decodedChannelName) {
      const req = JSON.parse(localStorage.getItem('requestedChannels') || '[]');
      setRequested(Array.isArray(req) ? req.includes(decodedChannelName) : false);
      setPage(1);
      setPosts([]);
      fetchChannelDetails(decodedChannelName);
      fetchChannelPosts(decodedChannelName, 1);
      checkFollowStatus(decodedChannelName);
    }
  }, [decodedChannelName]);

  const getDisplayName = (name) => {
    if (!name) return '';
    const cleanName = name.includes('@') ? name.split('@')[0] : name;
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  };

  const user = { role: userRole }; // For RBAC checks

  return (
    <Layout>
      <div className="channel-page-container">
        {currentChannel ? (
          <div className="channel-hero">
            <div className={`hero-banner ${currentChannel.image ? '' : 'placeholder'}`}
                 style={currentChannel.image ? { backgroundImage: `url(${currentChannel.image})` } : {}}>
              {!currentChannel.image && (currentChannel.visibility === 'private' ? <FiLock /> : <FiHash />)}
              <div className="banner-overlay"></div>
            </div>

            <div className="hero-content has-image">
              <div className="hero-main">
                <div className="channel-avatar-large">
                   <img src={currentChannel.image || 'https://via.placeholder.com/150'} alt={currentChannel.name} />
                </div>
                <div className="hero-text on-dark">
                  <div className="channel-meta on-dark">
                    <span>{currentChannel.visibility.charAt(0).toUpperCase() + currentChannel.visibility.slice(1)} Channel</span>
                    <span> • </span>
                    <span>{currentChannel.followersCount || 0} followers</span>
                  </div>
                  <h1>{getDisplayName(currentChannel.name)}</h1>
                </div>
              </div>

              <div className="hero-actions">
                {currentChannel.visibility === 'private' && followStatus !== 'active' ? (
                  <button
                    className={`btn-follow-toggle ${followStatus === 'pending' ? 'following' : 'join'}`}
                    onClick={followStatus === 'pending' ? null : handleRequestAccess}
                    disabled={followStatus === 'pending'}
                  >
                    {followStatus === 'pending' ? 'Request Pending' : 'Request Access'}
                  </button>
                ) : (
                  <button
                    className={`btn-follow-toggle ${isFollowing ? 'following' : 'join'}`}
                    onClick={handleFollowToggle}
                  >
                    {isFollowing ? (currentChannel.visibility === 'read-only' ? 'Following' : 'Joined') : (currentChannel.visibility === 'read-only' ? 'Follow' : 'Join')}
                  </button>
                )}
              </div>
            </div>

            <div className="hero-description">
              <p>{currentChannel.description}</p>
            </div>
          </div>
        ) : null}

        {error && <div className="error-message">{error}</div>}

        {/* Create Post Section - RBAC enforced */}
        {canPostInChannel(user, currentChannel, isFollowing) ? (
          <PostCreator
            isChannelPost={true}
            channelName={decodedChannelName}
            onPostCreated={handlePostCreated}
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
        ) : !canViewChannelContent(user, currentChannel, isFollowing) ? (
          <div className="empty-state">
            <FiLock size={48} style={{ marginBottom: '16px', color: '#6b7280' }} />
            <h3>This is a private community</h3>
            <p>Request access or join to view discussions and posts.</p>
          </div>
        ) : (
          <>
            <PostList
              posts={posts}
              onLike={handleLikePost}
              onDelete={handleDeletePost}
            />
            {hasMore && (
              <div className="load-more-container">
                <button className="btn-load-more" onClick={handleLoadMore}>
                  View More
                </button>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="no-more-posts">
                No more posts to show
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ChannelPage;
