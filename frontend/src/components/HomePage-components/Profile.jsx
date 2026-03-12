import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import PostList from '../PostList';
import { FiMapPin, FiCalendar, FiMail, FiX } from 'react-icons/fi';
import '../../styles/Profile.css';

import { getApiBaseUrl } from '../../config/api';

const API_BASE_URL = getApiBaseUrl();

function Profile() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // modal state for displaying following/followers info
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

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

  const formatJoinDate = () => {
    return 'Joined recently';
  };

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/posts/users?authorFederatedId=${encodeURIComponent(user?.federatedId)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      } else {
        setError(data.message || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // fetch real follower and following counts
  const fetchSocialCounts = async () => {
    try {
      const token = localStorage.getItem('token');

      const [followersRes, followingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/user/followers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/user/following`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const followersData = await followersRes.json();
      const followingData = await followingRes.json();

      if (followersData.success) {
        setFollowersCount(followersData.followers.length);
      }
      if (followingData.success) {
        setFollowingCount(followingData.following.length);
      }
    } catch (err) {
      console.error('Error fetching social counts:', err);
    }
  };

  // open modal with followers or following list
  const openUserListModal = async (type) => {
    setModalOpen(true);
    setModalTitle(type === 'followers' ? 'Followers' : 'Following');
    setModalLoading(true);
    setModalUsers([]);

    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'followers' ? 'followers' : 'following';
      const res = await fetch(`${API_BASE_URL}/user/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setModalUsers(data[endpoint] || []);
      }
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPosts();
    fetchSocialCounts();
  }, []);

  const handleLikePost = async (postFederatedId) => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/posts/like/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postFederatedId })
      });

      const data = await res.json();

      if (data.success) {
        setPosts(posts.map(post =>
          post.federatedId === postFederatedId
            ? { ...post, likeCount: data.likeCount, liked: data.liked }
            : post
        ));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-header">
          <div
            className="profile-cover"
            style={user?.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : {}}
          ></div>
          <div className="profile-info">
            <div className="profile-avatar-large">
              {getInitials(user?.displayName)}
            </div>
            <div className="profile-details">
              <h1>{user?.displayName || 'User'}</h1>
              <p className="username">@{user?.displayName || 'username'}</p>
              <p className="bio">
                {user?.federatedId || 'Federated ID not available'}
              </p>
              <div className="profile-meta">
                <span><FiMail /> {user?.email || 'No email'}</span>
                <span><FiCalendar /> {formatJoinDate()}</span>
                <span><FiMapPin /> {user?.serverName || 'Unknown server'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat stat-clickable" onClick={() => openUserListModal('followers')}>
            <span className="stat-number">{followersCount}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat stat-clickable" onClick={() => openUserListModal('following')}>
            <span className="stat-number">{followingCount}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>

        <div className="profile-content">
          <h2>My Posts</h2>
          {loading ? (
            <p className="coming-soon">Loading posts...</p>
          ) : error ? (
            <p className="coming-soon" style={{ color: '#dc2626' }}>{error}</p>
          ) : posts.length === 0 ? (
            <p className="coming-soon">You haven't created any posts yet.</p>
          ) : (
            <PostList
              posts={posts}
              onLike={handleLikePost}
              activeTimeline="profile"
              onDeletePost={(postId) => setPosts(posts.filter(p => p._id !== postId))}
              onFollowChanged={fetchSocialCounts}
            />
          )}
        </div>
      </div>

      {/* Followers / Following Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              {modalLoading ? (
                <p className="modal-empty">Loading...</p>
              ) : modalUsers.length === 0 ? (
                <p className="modal-empty">
                  {modalTitle === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              ) : (
                <ul className="user-list">
                  {modalUsers.map((u) => (
                    <li key={u.federatedId} className="user-list-item">
                      <div className="user-list-avatar">
                        {getInitials(u.displayName)}
                      </div>
                      <div className="user-list-info">
                        <span className="user-list-name">{u.displayName}</span>
                        <span className="user-list-id">{u.federatedId}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Profile;