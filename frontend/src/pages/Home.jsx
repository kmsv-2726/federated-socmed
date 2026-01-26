import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import TimelineTabs from '../components/TimelineTabs';
import PostCreator from '../components/PostCreator';
import PostList from '../components/PostList';
import { postApi } from '../services/postApi';
import '../styles/app.css';

function Home() {
  const [posts, setPosts] = useState([]);
  const [activeTimeline, setActiveTimeline] = useState('home');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeTimeline]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await postApi.fetchPosts(activeTimeline);
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (content) => {
    try {
      await postApi.createPost({
        content,
        author: 'Ben Goro',
        authorAvatar: '👤'
      });
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const handleLikePost = async (postId) => {
    try {
      await postApi.likePost(postId);
      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleTimelineChange = (timeline) => {
    setActiveTimeline(timeline);
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

      <PostCreator onPostCreated={handleCreatePost} />

      {loading ? (
        <div className="loading-state">Loading posts...</div>
      ) : (
        <PostList 
          posts={posts} 
          onLike={handleLikePost}
          activeTimeline={activeTimeline}
        />
      )}
    </Layout>
  );
}

export default Home;