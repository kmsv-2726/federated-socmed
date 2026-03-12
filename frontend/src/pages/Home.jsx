import React, { useState, useEffect } from 'react';
import TimelineTabs from '../components/TimelineTabs';
import PostCreator from '../components/PostCreator';
import PostList from '../components/PostList';
import SearchUsers from '../components/SearchUsers';
import Layout from '../components/Layout';
import '../styles/Home.css';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

function Home() {
  const [activeTimeline, setActiveTimeline] = useState('home');
  const [posts, setPosts] = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // fetch all local posts (for the "Local" tab)
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = `${API_BASE_URL}/posts/timeline`; // Default — personalised feed
      if (activeTimeline === 'home') {
        url = `${API_BASE_URL}/posts/timeline`;
      } else if (activeTimeline === 'mine') {
        // "My Posts" tab — own posts only via the new /posts/users endpoint
        url = `${API_BASE_URL}/posts/users`;
      } else if (activeTimeline === 'federated') {
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
  }, [activeTimeline]);

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

  const handleMuteUser = (mutedFederatedId) => {
    // Filter out posts from both timelines where the author's federatedId matches the muted one
    // Some posts might have `authorFederatedId`, others might use `federatedId` split
    setPosts(posts.filter(p => {
      const targetFedId = p.authorFederatedId || (p.federatedId && p.federatedId.split('/post/')[0]);
      return targetFedId !== mutedFederatedId;
    }));

    setFollowingPosts(followingPosts.filter(p => {
      const targetFedId = p.authorFederatedId || (p.federatedId && p.federatedId.split('/post/')[0]);
      return targetFedId !== mutedFederatedId;
    }));
  };

  const getFilteredPosts = () => {
    // Return all posts since filtering is now handled by the server endpoints
    return posts;
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
          onRepostSuccess={handlePostCreated}
          onFollowChanged={fetchFollowingPosts}
          onMuteUser={handleMuteUser}
        />
      )}
    </Layout>
  );
}

export default Home;
