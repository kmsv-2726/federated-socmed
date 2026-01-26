import React from 'react';
import {
  FiMoreHorizontal,
  FiMessageCircle,
  FiShare2,
  FiThumbsUp,
  FiUser
} from 'react-icons/fi';

const PostList = ({ posts, onLike, activeTimeline }) => {
  const formatTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInMinutes = Math.floor((now - postDate) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min. ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return postDate.toLocaleDateString();
  };

  if (activeTimeline === 'federated' && posts.length === 0) {
    return (
      <div className="empty-state">
        Federated timeline is empty
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
                <FiUser />
              </div>

              <div>
                <div className="author-name">{post.author}</div>
                <div className="post-time">
                  {formatTime(post.createdAt)}
                </div>
              </div>
            </div>

            <button className="post-menu">
              <FiMoreHorizontal />
            </button>
          </div>

          <div className="post-content">{post.content}</div>

          {post.images && post.images.length > 0 && (
            <div className="post-images">
              {post.images.map((img, idx) => (
                <img key={idx} src={img} alt="" />
              ))}
            </div>
          )}

          <div className="post-footer">

            <button
              className="post-action"
              onClick={() => onLike(post._id)}
            >
              <FiThumbsUp />
              Liked
              {post.likes > 0 && (
                <span className="count">{post.likes}</span>
              )}
            </button>

            <button className="post-action">
              <FiMessageCircle />
              Comment
              {post.comments > 0 && (
                <span className="count">{post.comments}</span>
              )}
            </button>

            <button className="post-action">
              <FiShare2 />
              Share
              {post.shares > 0 && (
                <span className="count">{post.shares}</span>
              )}
            </button>

          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;
