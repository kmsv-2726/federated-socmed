import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PostList from '../components/PostList';
import { FiMapPin, FiCalendar, FiArrowLeft, FiUserPlus, FiUserMinus, FiX, FiVolumeX, FiVolume2, FiUserX, FiSlash, FiFlag } from 'react-icons/fi';
import '../styles/Profile.css';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

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
    const [isMuted, setIsMuted] = useState(false);
    const [muteLoading, setMuteLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportLoading, setReportLoading] = useState(false);

    const currentUser = (() => {
        const u = localStorage.getItem('user');
        try { return u ? JSON.parse(u) : null; } catch { return null; }
    })();

    const isOwnProfile = currentUser?.federatedId === decodedId;

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Recently';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
                    `${API_BASE_URL}/posts/users?authorFederatedId=${encodeURIComponent(decodedId)}`,
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

    // check mute status
    useEffect(() => {
        if (isOwnProfile) return;
        const checkMute = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/mutes/${encodeURIComponent(decodedId)}/status`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                const data = await res.json();
                if (data.success) setIsMuted(data.isMuted);
            } catch {
                console.error('Error checking mute status');
            }
        };
        checkMute();
    }, [decodedId, isOwnProfile]);

    // check block status
    useEffect(() => {
        if (isOwnProfile) return;
        const checkBlock = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/blocks/${encodeURIComponent(decodedId)}/status`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                const data = await res.json();
                if (data.success) setIsBlocked(data.isBlocked);
            } catch {
                console.error('Error checking block status');
            }
        };
        checkBlock();
    }, [decodedId, isOwnProfile]);

    const handleBlockToggle = async () => {
        if (!isBlocked && !window.confirm(`Are you sure you want to block ${userProfile?.displayName}? You will no longer be able to send or receive direct messages from them.`)) return;

        setBlockLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/blocks/${encodeURIComponent(decodedId)}/toggle`,
                { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setIsBlocked(data.isBlocked);
            }
        } catch {
            console.error('Error toggling block');
        } finally {
            setBlockLoading(false);
        }
    };

    const handleMuteToggle = async () => {
        setMuteLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/mutes/${encodeURIComponent(decodedId)}/toggle`,
                { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setIsMuted(data.isMuted);
            }
        } catch {
            console.error('Error toggling mute');
        } finally {
            setMuteLoading(false);
        }
    };

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

    const handleReportUser = async () => {
        if (!reportReason) {
            alert('Please select a reason for the report.');
            return;
        }
        setReportLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reportedId: decodedId,
                    targetType: 'user',
                    reason: reportReason,
                    description: reportDescription
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Report submitted successfully. Our admin team will review it.');
                setReportModalOpen(false);
                setReportReason('');
                setReportDescription('');
            } else {
                alert(data.message || 'Failed to submit report.');
            }
        } catch (err) {
            console.error('Error reporting user:', err);
            alert('Failed to submit report.');
        } finally {
            setReportLoading(false);
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
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                                onClick={handleFollowToggle}
                                                disabled={followLoading}
                                            >
                                                {isFollowing ? <><FiUserMinus /> Unfollow</> : <><FiUserPlus /> Follow</>}
                                            </button>
                                            <button
                                                className={`follow-btn ${isMuted ? 'muted' : ''}`}
                                                onClick={handleMuteToggle}
                                                disabled={muteLoading}
                                                style={isMuted ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' } : {}}
                                            >
                                                {isMuted ? <><FiVolume2 /> Unmute</> : <><FiVolumeX /> Mute</>}
                                            </button>
                                            <button
                                                className={`follow-btn ${isBlocked ? 'blocked' : ''}`}
                                                onClick={handleBlockToggle}
                                                disabled={blockLoading}
                                                style={isBlocked ? { backgroundColor: '#000', color: '#fff', borderColor: '#000' } : {}}
                                            >
                                                {isBlocked ? <><FiSlash /> Unblock</> : <><FiUserX /> Block</>}
                                            </button>
                                            <button
                                                className="follow-btn"
                                                onClick={() => setReportModalOpen(true)}
                                                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                            >
                                                <FiFlag /> Report
                                            </button>
                                        </div>
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

            {/* Report User Modal */}
            {reportModalOpen && (
                <div className="modal-overlay" onClick={() => setReportModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3><FiFlag style={{ marginRight: '8px' }} /> Report {userProfile?.displayName}</h3>
                            <button className="modal-close" onClick={() => setReportModalOpen(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>Reason *</label>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none' }}
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="spam">Spam</option>
                                    <option value="harassment">Harassment</option>
                                    <option value="hate_speech">Hate Speech</option>
                                    <option value="violence">Violence</option>
                                    <option value="nudity">Nudity</option>
                                    <option value="misinformation">Misinformation</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>Additional Details</label>
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    placeholder="Provide any additional context..."
                                    rows={3}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setReportModalOpen(false)}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportUser}
                                    disabled={reportLoading || !reportReason}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', opacity: reportLoading || !reportReason ? 0.5 : 1 }}
                                >
                                    {reportLoading ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default UserProfile;