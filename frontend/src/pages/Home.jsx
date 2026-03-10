import React, { useState, useEffect } from 'react';
import TimelineTabs from '../components/TimelineTabs';
import PostCreator from '../components/PostCreator';
import PostList from '../components/PostList';
import SearchUsers from '../components/SearchUsers';
import Layout from '../components/Layout';
import '../styles/Home.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api");

function Home() {
  const [activeTimeline, setActiveTimeline] = useState('home');
  const [posts, setPosts] = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // fetch all local posts (for the "Local" tab)
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

  // fetch personalised timeline (local + remote followed users & channels) for the "Home" tab
  const fetchFollowingPosts = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/posts/timeline`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setFollowingPosts(data.posts);
      }
    } catch (err) {
      console.error('Error fetching timeline posts:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchFollowingPosts();
  }, []);

  const handleTimelineChange = (timeline) => {
    setActiveTimeline(timeline);
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setFollowingPosts([newPost, ...followingPosts]);
  };

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
        const updateLike = post =>
          post.federatedId === postFederatedId
            ? { ...post, likeCount: data.likeCount, liked: data.liked }
            : post;
        setPosts(posts.map(updateLike));
        setFollowingPosts(followingPosts.map(updateLike));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleDeletePost = (postId) => {
    setPosts(posts.filter(p => p._id !== postId));
    setFollowingPosts(followingPosts.filter(p => p._id !== postId));
  };

  const getFilteredPosts = () => {
    switch (activeTimeline) {
      case 'home':
        return followingPosts;
      case 'local':
        return posts;
      default:
        return followingPosts;
    }
  };

  return (
    <Layout>
      <SearchUsers />

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
          onDeletePost={handleDeletePost}
          onFollowChanged={fetchFollowingPosts}
        />
      )}
    </Layout>
  );
}

export default Home;
