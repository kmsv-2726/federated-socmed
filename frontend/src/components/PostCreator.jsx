import React, { useState, useRef } from 'react';
import {
  FiUser,
  FiImage,
  FiLink,
  FiSmile,
  FiX
} from 'react-icons/fi';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

const PostCreator = ({ onPostCreated, isChannelPost = false, channelName = null }) => {
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const textareaRef = useRef(null);

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const availableSlots = 4 - selectedImages.length;

    if (files.length > availableSlots) {
      setError(`You can only add up to 4 images. Adding first ${availableSlots} image(s).`);
    } else {
      setError('');
    }

    const filesToAdd = files.slice(0, availableSlots);

    filesToAdd.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(prev => prev ? prev + ' One image is too large (Max 10MB).' : 'Image too large. Max 10MB each.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, reader.result].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
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

  const handleCreatePost = async () => {
    if (!postContent.trim() && selectedImages.length === 0) return;

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
          images: selectedImages
        })
      });

      const data = await res.json();

      if (data.success) {
        setPostContent('');
        setSelectedImages([]);
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
          ref={textareaRef}
        />
      </div>

      {selectedImages.length > 0 && (
        <div className="image-preview-grid">
          {selectedImages.map((img, i) => (
            <div key={i} className="image-preview-item">
              <img src={img} alt="Preview" className="preview-image" />
              <button className="remove-image-btn" onClick={() => removeImage(i)}>
                <FiX />
              </button>
            </div>
          ))}
          {selectedImages.length < 4 && (
            <button className="add-more-images" onClick={handleImageClick}>
              <FiImage /> Add More
            </button>
          )}
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
            multiple
            style={{ display: 'none' }}
          />
          <button className="action-btn" title="Add image" onClick={handleImageClick}>
            <FiImage />
          </button>

          <button className="action-btn" title="Add link" onClick={() => setShowLinkInput(!showLinkInput)}>
            <FiLink />
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

        <button
          className="post-btn"
          onClick={handleCreatePost}
          disabled={loading || (!postContent.trim() && selectedImages.length === 0)}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default PostCreator;
