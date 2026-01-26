import React, { useState } from 'react';
import {
  FiUser,
  FiImage,
  FiLink,
  FiMapPin,
  FiSmile
} from 'react-icons/fi';

const PostCreator = ({ onPostCreated }) => {
  const [postContent, setPostContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;

    setLoading(true);
    try {
      await onPostCreated(postContent);
      setPostContent('');
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleCreatePost();
    }
  };

  return (
    <div className="post-creator">
      <div className="post-creator-header">
        <div className="user-avatar">
          <FiUser />
        </div>

        <textarea
          placeholder="What's on your mind?"
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="post-creator-footer">
        <div className="post-actions">
          <button className="action-btn" title="Add image">
            <FiImage />
          </button>

          <button className="action-btn" title="Add link">
            <FiLink />
          </button>

          <button className="action-btn" title="Add location">
            <FiMapPin />
          </button>

          <button className="action-btn" title="Add emoji">
            <FiSmile />
          </button>
        </div>

        <button
          className="post-btn"
          onClick={handleCreatePost}
          disabled={loading || !postContent.trim()}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default PostCreator;
