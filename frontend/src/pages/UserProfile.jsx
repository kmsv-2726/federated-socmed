import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PostList from '../components/PostList';
import { FiMapPin, FiCalendar, FiArrowLeft, FiUserPlus, FiUserMinus } from 'react-icons/fi';
import '../styles/Profile.css';

const API_BASE_URL = "http://localhost:5000/api";

function UserProfile() {
    const { federatedId } = useParams();
    const navigate = useNavigate();
    const decodedId = decodeURIComponent(federatedId);

    const [userProfile, setUserProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);

    const currentUser = (() => {
        const u = localStorage.getItem('user');
        try { return u ? JSON.parse(u) : null; } catch { return null; }
    })();

    const isOwnProfile = currentUser?.federatedId === decodedId;

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // fetch the user's profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(decodedId)}`);
                const data = await res.json();
                if (data.success) {
                    setUserProfile(data.user);
                    setFollowersCount(data.user.followersCount || 0);
                    setFollowingCount(data.user.followingCount || 0);
                } else {
                    setError('User not found');
                }
            } catch {
                setError('Failed to load profile');
            }
        };
        fetchProfile();
    }, [decodedId]);

    // fetch user's posts
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/posts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    const userPosts = data.posts.filter(
                        p => p.federatedId?.startsWith(decodedId)
                    );
                    setPosts(userPosts);
                }
            } catch {
                console.error('Error fetching posts');
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [decodedId]);

    // check follow status
    useEffect(() => {
        if (isOwnProfile) return;
        const checkFollow = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/user/${encodeURIComponent(decodedId)}/follow/status`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                const data = await res.json();
                if (data.success) setIsFollowing(data.isFollowing);
            } catch {
                console.error('Error checking follow status');
            }
        };
        checkFollow();
    }, [decodedId, isOwnProfile]);

    const handleFollowToggle = async () => {
        setFollowLoading(true);
        try {
            const token = localStorage.getItem('token');
            const method = isFollowing ? 'DELETE' : 'POST';
            const res = await fetch(
                `${API_BASE_URL}/user/${encodeURIComponent(decodedId)}/follow`,
                { method, headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setIsFollowing(!isFollowing);
                setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);
            }
        } catch {
            console.error('Error toggling follow');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleLikePost = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/posts/like/${postId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPosts(posts.map(post =>
                    post._id === postId
                        ? { ...post, likeCount: data.likeCount, liked: data.liked }
                        : post
                ));
            }
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    if (error) {
        return (
            <Layout>
                <div className="profile-container">
                    <div className="coming-soon" style={{ color: '#dc2626' }}>{error}</div>
                </div>
            </Layout>
        );
    }

    if (!userProfile) {
        return (
            <Layout>
                <div className="profile-container">
                    <div className="coming-soon">Loading profile...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="profile-container">
                <div className="profile-header">
                    <div className="profile-cover">
                        <button className="back-btn" onClick={() => navigate(-1)}>
                            <FiArrowLeft /> Back
                        </button>
                    </div>
                    <div className="profile-info">
                        <div className="profile-avatar-large">
                            {getInitials(userProfile.displayName)}
                        </div>
                        <div className="profile-details">
                            <div className="profile-name-row">
                                <h1>{userProfile.displayName}</h1>
                                {!isOwnProfile && (
                                    <button
                                        className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                    >
                                        {isFollowing ? <><FiUserMinus /> Unfollow</> : <><FiUserPlus /> Follow</>}
                                    </button>
                                )}
                            </div>
                            <p className="username">@{userProfile.displayName}</p>
                            <p className="bio">{userProfile.federatedId}</p>
                            <div className="profile-meta">
                                <span><FiCalendar /> Joined recently</span>
                                <span><FiMapPin /> {userProfile.serverName || 'Unknown server'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-stats">
                    <div className="stat">
                        <span className="stat-number">{posts.length}</span>
                        <span className="stat-label">Posts</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">{followersCount}</span>
                        <span className="stat-label">Followers</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">{followingCount}</span>
                        <span className="stat-label">Following</span>
                    </div>
                </div>

                <div className="profile-content">
                    <h2>Posts</h2>
                    {loading ? (
                        <p className="coming-soon">Loading posts...</p>
                    ) : posts.length === 0 ? (
                        <p className="coming-soon">No posts yet.</p>
                    ) : (
                        <PostList
                            posts={posts}
                            onLike={handleLikePost}
                            activeTimeline="profile"
                            onDeletePost={(postId) => setPosts(posts.filter(p => p._id !== postId))}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default UserProfile;
