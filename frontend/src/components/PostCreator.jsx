import React, { useState, useRef } from 'react';
import {
  FiUser,
  FiImage,
  FiLink,
  FiSmile,
  FiX
} from 'react-icons/fi';

const API_BASE_URL = "http://localhost:5000/api";

const PostCreator = ({ onPostCreated, isChannelPost = false, channelName = null }) => {
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = ['😀','😂','😍','👍','🔥','🎉','🙏','🏆','🍕','⚽'];

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image is too large. Max 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addLinkToContent = () => {
    const url = linkUrl.trim();
    if (!url) return;
    try {
      const valid = /^https?:\/\/\S+$/i.test(url);
      if (!valid) {
        setError('Enter a valid http(s) URL');
        return;
      }
      setPostContent(prev => `${prev}${prev ? '\n' : ''}${url}`);
      setLinkUrl('');
      setShowLinkInput(false);
    } catch {
      setError('Invalid URL');
    }
  };

  const addEmoji = (emoji) => {
    setPostContent(prev => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedImage) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: postContent.trim(),
          isChannelPost: isChannelPost,
          channelName: channelName,
          image: selectedImage
        })
      });

      const data = await res.json();

      if (data.success) {
        setPostContent('');
        setSelectedImage(null);
        if (onPostCreated) {
          onPostCreated(data.post);
        }
      } else {
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error creating post:', err);
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
          onChange={(e) => { setPostContent(e.target.value); setError(''); }}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      {selectedImage && (
        <div className="image-preview-container">
          <img src={selectedImage} alt="Preview" className="preview-image" />
          <button className="remove-image-btn" onClick={removeImage}>
            <FiX />
          </button>
        </div>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '10px', marginTop: '10px' }}>{error}</p>}

      <div className="post-creator-footer">
        <div className="post-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button className="action-btn" title="Add image" onClick={handleImageClick}>
            <FiImage />
          </button>

          <button className="action-btn" title="Add link" onClick={() => { setShowLinkInput(!showLinkInput); setShowEmojiPicker(false); }}>
            <FiLink />
          </button>

          <button className="action-btn" title="Add emoji" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowLinkInput(false); }}>
            <FiSmile />
          </button>
        </div>

        {showLinkInput && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <button className="post-btn" onClick={addLinkToContent}>Add</button>
          </div>
        )}

        {showEmojiPicker && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {emojis.map(e => (
              <button
                key={e}
                className="action-btn"
                style={{ width: 36, height: 36, borderRadius: 8, fontSize: 18 }}
                onClick={() => addEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <button
          className="post-btn"
          onClick={handleCreatePost}
          disabled={loading || (!postContent.trim() && !selectedImage)}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default PostCreator;
