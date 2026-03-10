import React, { useState, useEffect } from 'react';
import TimelineTabs from '../components/TimelineTabs';
import PostCreator from '../components/PostCreator';
import PostList from '../components/PostList';
import Layout from '../components/Layout';
import '../styles/Home.css';

const API_BASE_URL = "http://localhost:5000/api";

function Home() {
  const [activeTimeline, setActiveTimeline] = useState('home');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = `${API_BASE_URL}/posts`; // Default for 'local'
      if (activeTimeline === 'home') {
        url = `${API_BASE_URL}/posts/timeline`;
      } else if (activeTimeline === 'federated') {
        // For now federated tab can just be an empty placeholder or a specific cross-server logic
        // But getTimeline actually already includes remote posts, so 'home' is the federated aware one.
        // We'll keep 'local' as strictly local /api/posts.
        // For 'federated' specifically, we can use a server-filtered query if implemented.
        setPosts([]);
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  useEffect(() => {
    fetchPosts();
  }, [activeTimeline]);

  const handleTimelineChange = (timeline) => {
    setActiveTimeline(timeline);
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');

      // Note: Backend like route expects postFederatedId in body for federated likes
      // But for local likes it can be toggled via _id. 
      // Current Home.jsx uses /posts/like/:id which might need alignment with backend expectations
      // Assuming existing backend route supports PUT /api/posts/like/ (which it does not, it uses PUT /like/)
      // I'll stick to the current frontend logic for now as requested.
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

  const getFilteredPosts = () => {
    // Return all posts since filtering is now handled by the server endpoints
    return posts;
  };

  return (
    <Layout>
      <div className="search-bar">
        <input type="text" placeholder="Type in search" />
      </div>

      <TimelineTabs
        activeTimeline={activeTimeline}
        onTimelineChange={handleTimelineChange}
      />

      <PostCreator onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="loading-state">Loading posts...</div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
      ) : (
        <PostList
          posts={getFilteredPosts()}
          onLike={handleLikePost}
          activeTimeline={activeTimeline}
          onDeletePost={(postId) => setPosts(posts.filter(p => p._id !== postId))}
        />
      )}
    </Layout>
  );
}

export default Home;