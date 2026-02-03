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
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/posts`, {
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
  }, []);

  const handleTimelineChange = (timeline) => {
    setActiveTimeline(timeline);
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

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

  const getFilteredPosts = () => {
    switch (activeTimeline) {
      case 'home':
      case 'local':
        return posts;
      case 'federated':
        return []; // to change later when we integrate federation
      default:
        return posts;
    }
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
        />
      )}
    </Layout>
  );
}

export default Home;