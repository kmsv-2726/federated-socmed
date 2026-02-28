import React, { useState, useEffect, useRef } from 'react';
import { FiThumbsUp, FiMessageCircle, FiShare2, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';

const API_BASE_URL = "http://localhost:5000/api";

const PostList = ({ posts, onLike, activeTimeline, onDeletePost }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        setCurrentUser(null);
      }
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (postId) => {
    setOpenMenuId(openMenuId === postId ? null : postId);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        if (onDeletePost) {
          onDeletePost(postId);
        }
        setOpenMenuId(null);
      } else {
        alert(data.message || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post. Please try again.');
    }
  };

  const isOwnPost = (post) => {
    if (!currentUser) return false;
    // Check if the post's federatedId contains the user's federatedId
    return post.federatedId?.includes(currentUser.federatedId) ||
      post.userDisplayName === currentUser.displayName;
  };

  const formatTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInMinutes = Math.floor((now - postDate) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min. ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return postDate.toLocaleDateString();
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="empty-state">
        {activeTimeline === 'federated'
          ? 'Federated timeline is empty'
          : 'No posts yet. Be the first to post!'}
      </div>
    );
  }

  return (
    <div className="posts-feed">
      {posts.map((post) => (
        <div key={post._id} className="post">
          <div className="post-header">
            <div className="post-author">
              <div className="user-avatar">
                {getInitials(post.userDisplayName || post.author)}
              </div>
              <div>
                <div className="author-name">{post.userDisplayName || post.author || 'Anonymous'}</div>
                <div className="post-time">{formatTime(post.createdAt)}</div>
              </div>
            </div>
            <div className="post-menu-container" ref={openMenuId === post._id ? menuRef : null}>
              <button className="post-menu" onClick={() => toggleMenu(post._id)}>
                <FiMoreHorizontal />
              </button>
              {openMenuId === post._id && (
                <div className="post-dropdown-menu">
                  {isOwnPost(post) && (
                    <button
                      className="dropdown-item delete-item"
                      onClick={() => handleDelete(post._id)}
                    >
                      <FiTrash2 /> Delete Post
                    </button>
                  )}
                  {!isOwnPost(post) && (
                    <div className="dropdown-item disabled">No actions available</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="post-content">{post.description || post.content}</div>

          {post.image && (
            <div className="post-images">
              <img src={post.image} alt="" />
            </div>
          )}

          <div className="post-footer">
            <button
              className="post-action"
              onClick={() => onLike(post._id)}
            >
              <FiThumbsUp className="action-icon" />
              <span>Like</span>
              {(post.likeCount > 0 || post.likes > 0) && (
                <span className="count">{post.likeCount || post.likes}</span>
              )}
            </button>
            <button className="post-action">
              <FiMessageCircle className="action-icon" />
              <span>Comment</span>
              {((post.comments && post.comments.length > 0) || (typeof post.comments === 'number' && post.comments > 0)) && (
                <span className="count">
                  {Array.isArray(post.comments) ? post.comments.length : post.comments}
                </span>
              )}
            </button>
            <button className="post-action">
              <FiShare2 className="action-icon" />
              <span>Share</span>
              {post.shares > 0 && <span className="count">{post.shares}</span>}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;
