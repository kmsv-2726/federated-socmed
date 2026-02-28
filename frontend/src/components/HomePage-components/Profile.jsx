import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import PostList from '../PostList';
import { FiMapPin, FiCalendar, FiMail } from 'react-icons/fi';
import '../../styles/Profile.css';

const API_BASE_URL = "http://localhost:5000/api";

function Profile() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      const res = await fetch(`${API_BASE_URL}/posts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        const userPosts = data.posts.filter(
          post => post.userDisplayName === user?.displayName
        );
        setPosts(userPosts);
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

  useEffect(() => {
    fetchUserPosts();
  }, []);

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/posts/like/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-cover"></div>
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
          <div className="stat">
            <span className="stat-number">0</span> {/*to add later*/}
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat">
            <span className="stat-number">0</span> {/*to add later*/}
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
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Profile;