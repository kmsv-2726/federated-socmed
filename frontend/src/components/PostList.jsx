import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiThumbsUp, FiMessageCircle, FiShare2, FiMoreHorizontal, FiTrash2, FiUserPlus, FiUserMinus } from 'react-icons/fi';

const API_BASE_URL = "http://localhost:5000/api";

const PostList = ({ posts, onLike, activeTimeline, onDeletePost, onFollowChanged }) => {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingList, setFollowingList] = useState([]);
  const menuRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Comments state
  const [expandedComments, setExpandedComments] = useState({});
  const [commentText, setCommentText] = useState({});

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

  // fetch who the current user follows
  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/user/following`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setFollowingList(data.following.map(u => u.federatedId));
        }
      } catch (err) {
        console.error('Error fetching following list:', err);
      }
    };
    fetchFollowing();
  }, []);

  // close menu when clicking outside
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

  // Use authorFederatedId directly — parsing post.federatedId breaks for channel posts
  // since their federatedId starts with channelName@server, not the author's ID
  const getAuthorFederatedId = (post) => {
    return post.authorFederatedId || null;
  };

  const handleFollow = async (post) => {
    const authorFedId = getAuthorFederatedId(post);
    if (!authorFedId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(authorFedId)}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFollowingList([...followingList, authorFedId]);
        setOpenMenuId(null);
        if (onFollowChanged) onFollowChanged();
      } else {
        alert(data.message || 'Failed to follow user');
      }
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleUnfollow = async (post) => {
    const authorFedId = getAuthorFederatedId(post);
    if (!authorFedId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(authorFedId)}/follow`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFollowingList(followingList.filter(id => id !== authorFedId));
        setOpenMenuId(null);
        if (onFollowChanged) onFollowChanged();
      } else {
        alert(data.message || 'Failed to unfollow user');
      }
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleCommentChange = (postId, text) => {
    setCommentText(prev => ({
      ...prev,
      [postId]: text
    }));
  };

  const handleAddComment = async (post) => {
    const text = commentText[post._id];
    if (!text || !text.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/posts/comment/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postFederatedId: post.federatedId, content: text.trim() })
      });

      const data = await res.json();

      if (data.success) {
        setCommentText(prev => ({ ...prev, [post._id]: '' }));

        // update local post state to show the new comment immediately
        const newComment = {
          displayName: currentUser?.displayName || 'Me',
          content: text.trim(),
          createdAt: new Date().toISOString()
        };

        if (!Array.isArray(post.comments)) {
          post.comments = [];
        }
        post.comments.push(newComment);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const isOwnPost = (post) => {
    if (!currentUser) return false;
    return post.federatedId?.includes(currentUser.federatedId) ||
      post.userDisplayName === currentUser.displayName;
  };

  const isFollowing = (post) => {
    const authorFedId = getAuthorFederatedId(post);
    return authorFedId ? followingList.includes(authorFedId) : false;
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
        {activeTimeline === 'home'
          ? 'No posts yet. Follow some users to see their posts here!'
          : 'No posts yet. Be the first to post!'}
      </div>
    );
  }

  return (
    <>
      <div className="posts-feed">
        {posts.map((post) => (
          <div key={post._id} className="post">
            <div className="post-header">
              <div className="post-author">
                <div className="user-avatar">
                  {getInitials(post.userDisplayName || post.author)}
                </div>
                <div>
                  <div className="author-name author-link" onClick={() => {
                    const authorFedId = getAuthorFederatedId(post);
                    if (authorFedId && currentUser && authorFedId === currentUser.federatedId) {
                      navigate('/profile');
                    } else if (authorFedId) {
                      navigate(`/user/${encodeURIComponent(authorFedId)}`);
                    }
                  }}>{post.userDisplayName || post.author || 'Anonymous'}</div>
                  <div className="post-meta-row">
                    <div className="post-time">{formatTime(post.createdAt)}</div>
                    {post.isChannelPost && post.channelName && (
                      <span
                        className="channel-tag"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/channels/${encodeURIComponent(post.channelName)}`);
                        }}
                      >
                        #{post.channelName}
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
                    {!isOwnPost(post) && (
                      isFollowing(post) ? (
                        <button
                          className="dropdown-item"
                          onClick={() => handleUnfollow(post)}
                        >
                          <FiUserMinus /> Unfollow {post.userDisplayName}
                        </button>
                      ) : (
                        <button
                          className="dropdown-item follow-item"
                          onClick={() => handleFollow(post)}
                        >
                          <FiUserPlus /> Follow {post.userDisplayName}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="post-content">{post.description || post.content}</div>

            {(() => {
              const postImages = post.images && post.images.length > 0
                ? post.images
                : post.image ? [post.image] : [];
              if (postImages.length === 0) return null;
              return (
                <div className={`post-images count-${Math.min(postImages.length, 4)}`}>
                  {postImages.slice(0, 4).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      onClick={() => {
                        setLightboxImages(postImages);
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                    />
                  ))}
                </div>
              );
            })()}

            <div className="post-footer">
              <button
                className="post-action"
                onClick={() => onLike(post.federatedId)}
              >
                <FiThumbsUp className="action-icon" />
                <span>Like</span>
                {(post.likeCount > 0 || post.likes > 0) && (
                  <span className="count">{post.likeCount || post.likes}</span>
                )}
              </button>
              <button className="post-action" onClick={() => toggleComments(post._id)}>
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

            {/* Comments Section */}
            {expandedComments[post._id] && (
              <div className="comments-section">
                <div className="comment-input-area">
                  <div className="user-avatar small">
                    {getInitials(currentUser?.displayName || '')}
                  </div>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText[post._id] || ''}
                    onChange={(e) => handleCommentChange(post._id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddComment(post);
                    }}
                  />
                  <button
                    className="post-btn small-btn"
                    onClick={() => handleAddComment(post)}
                    disabled={!commentText[post._id]?.trim()}
                  >
                    Post
                  </button>
                </div>

                {Array.isArray(post.comments) && post.comments.length > 0 && (
                  <div className="comments-list">
                    {post.comments.map((comment, idx) => (
                      <div key={idx} className="comment">
                        <div className="user-avatar tiny">
                          {getInitials(comment.displayName || 'A')}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{comment.displayName || 'Anonymous'}</span>
                            <span className="comment-time">{formatTime(comment.createdAt || new Date())}</span>
                          </div>
                          <div className="comment-text">{comment.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Lightbox */}
      {
        lightboxOpen && (
          <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
              <img src={lightboxImages[lightboxIndex]} alt="" className="lightbox-image" />
              {lightboxImages.length > 1 && (
                <>
                  <button
                    className="lightbox-nav lightbox-prev"
                    onClick={() => setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length)}
                  >
                    ‹
                  </button>
                  <button
                    className="lightbox-nav lightbox-next"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % lightboxImages.length)}
                  >
                    ›
                  </button>
                  <div className="lightbox-counter">
                    {lightboxIndex + 1} / {lightboxImages.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      }
    </>
  );
};

export default PostList;