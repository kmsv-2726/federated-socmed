const API_URL = 'http://localhost:5000/api';

export const postApi = {
  // Fetch posts by timeline
  async fetchPosts(timeline) {
    const response = await fetch(`${API_URL}/posts/${timeline}`);
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return response.json();
  },

  // Create a new post
  async createPost(postData) {
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!response.ok) {
      throw new Error('Failed to create post');
    }
    return response.json();
  },

  // Like a post
  async likePost(postId) {
    const response = await fetch(`${API_URL}/posts/${postId}/like`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to like post');
    }
    return response.json();
  },

  // Comment on a post
  async commentPost(postId) {
    const response = await fetch(`${API_URL}/posts/${postId}/comment`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to comment on post');
    }
    return response.json();
  },

  // Share a post
  async sharePost(postId) {
    const response = await fetch(`${API_URL}/posts/${postId}/share`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to share post');
    }
    return response.json();
  }
};