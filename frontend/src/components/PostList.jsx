import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiThumbsUp, FiMessageCircle, FiRepeat, FiMoreHorizontal, FiTrash2, FiSend, FiChevronUp, FiChevronDown, FiVolumeX } from 'react-icons/fi';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

const PostList = ({ posts, onLike, activeTimeline, onDeletePost, onRepostSuccess, onMuteUser }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});   // { postId: string }
  const [commentLoading, setCommentLoading] = useState({}); // { postId: bool }
  const [localComments, setLocalComments] = useState({});   // { postId: [comment, ...] }
  const [localLikes, setLocalLikes] = useState({});         // { postId: { count, liked, loading } }
  const [repostLoading, setRepostLoading] = useState({});   // { postId: bool }
  const menuRef = useRef(null);
  const navigate = useNavigate();

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

  // Seed localComments from props when posts change
  useEffect(() => {
    if (!posts) return;
    setLocalComments(prev => {
      const next = { ...prev };
      posts.forEach(post => {
        if (!next[post._id]) {
          next[post._id] = Array.isArray(post.comments) ? post.comments : [];
        }
      });
      return next;
    });
    setLocalLikes(prev => {
      const next = { ...prev };
      posts.forEach(post => {
        if (!next[post._id]) {
          const currentFederatedId = (() => {
            try { return JSON.parse(localStorage.getItem('user'))?.federatedId; } catch { return null; }
          })();
          next[post._id] = {
            count: post.likeCount || post.likes || 0,
            liked: Array.isArray(post.likedBy) && currentFederatedId
              ? post.likedBy.includes(currentFederatedId)
              : false,
            loading: false
          };
        }
      });
      return next;
    });
  }, [posts]);

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

  const toggleComments = (postId) => {
    setOpenCommentsId(openCommentsId === postId ? null : postId);
  };

  const handleCommentInput = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const handleSubmitComment = async (post) => {
    const content = (commentInputs[post._id] || '').trim();
    if (!content) return;

    setCommentLoading(prev => ({ ...prev, [post._id]: true }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/posts/comment/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postFederatedId: post.federatedId,
          content
        })
      });

      const data = await response.json();

      if (data.success) {
        // Optimistically add comment to local state
        const newComment = {
          displayName: currentUser?.displayName || 'You',
          image: currentUser?.image || null,
          content,
          commentFederatedId: data.commentFederatedId,
          originServer: currentUser?.serverName,
          createdAt: new Date().toISOString()
        };
        setLocalComments(prev => ({
          ...prev,
          [post._id]: [...(prev[post._id] || []), newComment]
        }));
        setCommentInputs(prev => ({ ...prev, [post._id]: '' }));
      } else {
        alert(data.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setCommentLoading(prev => ({ ...prev, [post._id]: false }));
    }
  };

  const handleKeyDown = (e, post) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment(post);
    }
  };

  const handleLike = async (post) => {
    if (localLikes[post._id]?.loading) return;

    const current = localLikes[post._id] || { count: 0, liked: false };
    const optimisticLiked = !current.liked;
    const optimisticCount = optimisticLiked ? current.count + 1 : Math.max(0, current.count - 1);

    // Optimistic update
    setLocalLikes(prev => ({
      ...prev,
      [post._id]: { count: optimisticCount, liked: optimisticLiked, loading: true }
    }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/posts/like/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postFederatedId: post.federatedId })
      });

      const data = await response.json();

      if (data.success) {
        setLocalLikes(prev => ({
          ...prev,
          [post._id]: {
            count: data.likeCount ?? optimisticCount,
            liked: data.liked ?? optimisticLiked,
            loading: false
          }
        }));
        // Notify parent if provided
        if (onLike) onLike(post._id);
      } else {
        // Revert on failure
        setLocalLikes(prev => ({
          ...prev,
          [post._id]: { ...current, loading: false }
        }));
      }
    } catch (err) {
      console.error('Error liking post:', err);
      // Revert on error
      setLocalLikes(prev => ({
        ...prev,
        [post._id]: { ...current, loading: false }
      }));
    }
  };

  const handleRepost = async (post) => {
    if (repostLoading[post._id]) return;

    setRepostLoading(prev => ({ ...prev, [post._id]: true }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/posts/repost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postFederatedId: post.federatedId })
      });

      const data = await response.json();

      if (data.success) {
        alert('Post reposted successfully!');
        if (onRepostSuccess) {
          onRepostSuccess(data.post);
        }
      } else {
        alert(data.message || 'Failed to repost');
      }
    } catch (err) {
      console.error('Error reposting:', err);
      alert('Failed to repost. Please try again.');
    } finally {
      setRepostLoading(prev => ({ ...prev, [post._id]: false }));
    }
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
        if (onDeletePost) onDeletePost(postId);
        setOpenMenuId(null);
      } else {
        alert(data.message || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post. Please try again.');
    }
  };

  const handleMute = async (post) => {
    if (!window.confirm(`Are you sure you want to mute ${post.userDisplayName || post.author}? Their posts will no longer appear in your timeline.`)) return;

    try {
      const token = localStorage.getItem('token');
      // The federatedId is usually authorFederatedId. Fall back if not present.
      const targetFedId = post.authorFederatedId || post.federatedId.split('/post/')[0];

      const response = await fetch(`${API_BASE_URL}/mutes/${targetFedId}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        if (onMuteUser) {
          onMuteUser(targetFedId);
        }
        setOpenMenuId(null);
        alert(data.message);
      } else {
        alert(data.message || 'Failed to mute user');
      }
    } catch (err) {
      console.error('Error muting user:', err);
      alert('Failed to mute user. Please try again.');
    }
  };

  const isOwnPost = (post) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return post.federatedId?.includes(currentUser.federatedId) ||
      post.userDisplayName === currentUser.displayName ||
      post.author === currentUser.displayName;
  };

  const isActuallyOwnPost = (post) => {
    if (!currentUser) return false;
    return post.federatedId?.includes(currentUser.federatedId) ||
      post.userDisplayName === currentUser.displayName ||
      post.author === currentUser.displayName;
  };

  const handleNavigateToProfile = (federatedId) => {
    if (!federatedId) return;
    navigate(`/user/${encodeURIComponent(federatedId)}`);
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
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="empty-state">
        {activeTimeline === 'home'
          ? 'No posts yet. Follow some users to see their posts here!'
          : 'No posts yet. Be the first to post!'}
      </div>
    );
  }

  return (
    <div className="posts-feed">
      {posts.map((post) => {
        const comments = localComments[post._id] || [];
        const commentCount = comments.length;
        const isCommentsOpen = openCommentsId === post._id;
        const likeData = localLikes[post._id] || { count: post.likeCount || 0, liked: false, loading: false };
        const isReposting = repostLoading[post._id];

        return (
          <div key={post._id} className="post">
            {/* ── Repost Header ── */}
            {post.isRepost && (
              <div className="repost-header">
                <FiRepeat className="repost-icon" />
                <span>{post.userDisplayName || 'Someone'} reposted</span>
              </div>
            )}

            {/* ── Header ── */}
            <div className="post-header">
              <div className="post-author" onClick={() => handleNavigateToProfile(post.authorFederatedId)} style={{ cursor: 'pointer' }}>
                <div className="user-avatar">
                  {getInitials(post.userDisplayName || post.author)}
                </div>
                <div>
                  <div className="author-name">
                    {post.userDisplayName || post.author || 'Anonymous'}
                    {post.isChannelPost && post.channelName && (
                      <span className="post-channel-link"> in #{post.channelName}</span>
                    )}
                  </div>
                  <div className="post-time">
                    {formatTime(post.createdAt)}
                    {post.isRemote && (
                      <span className="post-server-tag">
                        {' • '}{post.isChannelPost && post.channelName
                          ? `${post.channelName}@${post.originServer}`
                          : post.authorFederatedId || `${post.userDisplayName || post.author}@${post.originServer}`}
                      </span>
                    )}
                  </div>
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
                    {!isActuallyOwnPost(post) && (
                      <button
                        className="dropdown-item"
                        onClick={() => handleMute(post)}
                      >
                        <FiVolumeX /> Mute User
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Content ── */}
            <div className="post-content">{post.description || post.content}</div>

            {post.images && post.images.length > 0 ? (
              <div className="image-preview-grid">
                {post.images.map((img, idx) => (
                  <div key={idx} className="image-preview-item">
                    <img src={img} alt={`Post attachment ${idx + 1}`} className="preview-image" />
                  </div>
                ))}
              </div>
            ) : post.image && (
              <div className="post-images">
                <img src={post.image} alt="" />
              </div>
            )}

            {/* ── Footer ── */}
            <div className="post-footer">
              <button
                className={`post-action${likeData.liked ? ' liked' : ''}`}
                onClick={() => handleLike(post)}
                disabled={likeData.loading}
              >
                <FiThumbsUp className="action-icon" />
                <span>{likeData.liked ? 'Liked' : 'Like'}</span>
                {likeData.count > 0 && (
                  <span className="count">{likeData.count}</span>
                )}
              </button>

              <button className="post-action" onClick={() => toggleComments(post._id)}>
                <FiMessageCircle className="action-icon" />
                <span>Comment</span>
                {commentCount > 0 && <span className="count">{commentCount}</span>}
                {isCommentsOpen
                  ? <FiChevronUp style={{ marginLeft: 4, fontSize: 12 }} />
                  : <FiChevronDown style={{ marginLeft: 4, fontSize: 12 }} />
                }
              </button>

              <button
                className="post-action"
                onClick={() => handleRepost(post)}
                disabled={isReposting}
              >
                <FiRepeat className={`action-icon ${isReposting ? 'animate-spin' : ''}`} />
                <span>{isReposting ? 'Reposting...' : 'Repost'}</span>
              </button>
            </div>

            {/* ── Comments Section ── */}
            {isCommentsOpen && (
              <div className="comments-section">

                {/* Existing comments */}
                {commentCount > 0 ? (
                  <div className="comments-list">
                    {comments.map((comment, idx) => (
                      <div key={comment.commentFederatedId || idx} className="comment">
                        <div className="comment-avatar">
                          {comment.image
                            ? <img src={comment.image} alt={comment.displayName} />
                            : getInitials(comment.displayName)
                          }
                        </div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{comment.displayName}</span>
                            {comment.originServer && (
                              <span className="comment-server"> • {comment.originServer}</span>
                            )}
                            <span className="comment-time"> • {formatTime(comment.createdAt)}</span>
                          </div>
                          <div className="comment-content">{comment.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-comments">No comments yet. Be the first!</div>
                )}

                {/* New comment input */}
                <div className="comment-input-row">
                  <div className="comment-input-avatar">
                    {getInitials(currentUser?.displayName)}
                  </div>
                  <div className="comment-input-wrapper">
                    <textarea
                      className="comment-input"
                      placeholder="Write a comment…"
                      value={commentInputs[post._id] || ''}
                      onChange={(e) => handleCommentInput(post._id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, post)}
                      rows={1}
                      disabled={commentLoading[post._id]}
                    />
                    <button
                      className="comment-submit"
                      onClick={() => handleSubmitComment(post)}
                      disabled={!commentInputs[post._id]?.trim() || commentLoading[post._id]}
                      title="Post comment (Enter)"
                    >
                      {commentLoading[post._id]
                        ? <span className="comment-spinner" />
                        : <FiSend />
                      }
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PostList;