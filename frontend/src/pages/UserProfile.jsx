import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PostList from '../components/PostList';
import { FiMapPin, FiCalendar, FiArrowLeft, FiUserPlus, FiUserMinus, FiX } from 'react-icons/fi';
import '../styles/Profile.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api");

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
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalUsers, setModalUsers] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

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
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(decodedId)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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

    // fetch user's posts — use authorFederatedId query param instead of fetching all posts
    // and filtering client-side (which also fails for remote users not in the local DB)
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/posts?authorFederatedId=${encodeURIComponent(decodedId)}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                const data = await res.json();
                if (data.success) {
                    setPosts(data.posts);
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

    const openUserListModal = async (type) => {
        setModalOpen(true);
        setModalTitle(type === 'followers' ? 'Followers' : 'Following');
        setModalLoading(true);
        setModalUsers([]);
        try {
            const token = localStorage.getItem('token');
            // For another user's profile, fetch their followers/following via their federatedId
            const endpoint = type === 'followers'
                ? `user/${encodeURIComponent(decodedId)}/followers`
                : `user/${encodeURIComponent(decodedId)}/following`;
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setModalUsers(data[type] || []);
        } catch (err) {
            console.error(`Error fetching ${type}:`, err);
        } finally {
            setModalLoading(false);
        }
    };

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

    const handleLikePost = async (postFederatedId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/posts/like/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ postFederatedId })
            });
            const data = await res.json();
            if (data.success) {
                setPosts(posts.map(post =>
                    post.federatedId === postFederatedId
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
        <>
            <Layout>
                <div className="profile-container">
                    <div className="profile-header">
                        <div
                            className="profile-cover"
                            style={userProfile?.bannerUrl ? { backgroundImage: `url(${userProfile.bannerUrl})` } : {}}
                        >
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
                                    <span>
                                        <FiCalendar /> Joined {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                                    </span>
                                    <span>
                                        <FiMapPin /> {userProfile.originServer || userProfile.serverName || 'Unknown server'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-stats">
                        <div className="stat">
                            <span className="stat-number">{posts.length}</span>
                            <span className="stat-label">Posts</span>
                        </div>
                        <div className="stat stat-clickable" onClick={() => openUserListModal('followers')}>
                            <span className="stat-number">{followersCount}</span>
                            <span className="stat-label">Followers</span>
                        </div>
                        <div className="stat stat-clickable" onClick={() => openUserListModal('following')}>
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
                                onRepostSuccess={(newPost) => setPosts([newPost, ...posts])}
                            />
                        )}
                    </div>
                </div>
            </Layout>

            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalTitle}</h3>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            {modalLoading ? (
                                <p className="modal-empty">Loading...</p>
                            ) : modalUsers.length === 0 ? (
                                <p className="modal-empty">
                                    {modalTitle === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
                                </p>
                            ) : (
                                <ul className="user-list">
                                    {modalUsers.map((u) => (
                                        <li key={u.federatedId} className="user-list-item">
                                            <div className="user-list-avatar">
                                                {getInitials(u.displayName)}
                                            </div>
                                            <div className="user-list-info">
                                                <span className="user-list-name">{u.displayName}</span>
                                                <span className="user-list-id">{u.federatedId}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default UserProfile;