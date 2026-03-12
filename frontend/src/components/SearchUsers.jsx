import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiUserCheck, FiUserPlus, FiGlobe, FiHome as FiLocal, FiAlertCircle, FiFlag } from 'react-icons/fi';
import '../styles/SearchUsers.css';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

const SearchUsers = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchMeta, setSearchMeta] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Reporting state
    const [reportingUser, setReportingUser] = useState(null);
    const [reportReason, setReportReason] = useState('spam');
    const [reportDescription, setReportDescription] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportSuccess, setReportSuccess] = useState('');

    // Follow List state
    const [listTarget, setListTarget] = useState(null); // { id, name, type }
    const [listUsers, setListUsers] = useState([]);
    const [listLoading, setListLoading] = useState(false);


    // Debounced search
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length < 1) {
            setResults([]);
            setSearchMeta(null);
            setHasSearched(false);
            setError('');
            return;
        }

        setLoading(true);
        setError('');
        setHasSearched(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/user?search=${encodeURIComponent(searchQuery.trim())}&limit=20`,
                {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const data = await res.json();

            if (data.success) {
                setResults(data.users || []);
                setSearchMeta({
                    searchType: data.searchType || (searchQuery.includes('@') ? 'federated' : 'local'),
                    count: data.count || (data.users ? data.users.length : 0),
                    query: data.query || searchQuery
                });
            } else {
                setError(data.message || 'Search failed');
                setResults([]);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setResults([]);
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce input
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(query);
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [query, performSearch]);

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setSearchMeta(null);
        setHasSearched(false);
        setError('');
        inputRef.current?.focus();
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

    const handleFollowToggle = async (user) => {
        try {
            const token = localStorage.getItem('token');
            const method = user.is_following ? 'DELETE' : 'POST';

            const res = await fetch(
                `${API_BASE_URL}/user/${encodeURIComponent(user.federatedId)}/follow`,
                {
                    method,
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const data = await res.json();
            if (data.success) {
                setResults(prev =>
                    prev.map(u =>
                        u.federatedId === user.federatedId
                            ? {
                                ...u,
                                is_following: !u.is_following,
                                followersCount: (u.followersCount || 0) + (u.is_following ? -1 : 1)
                            }
                            : u
                    )
                );
            }
        } catch (err) {
            console.error('Follow/unfollow error:', err);
        }
    };

    const fetchFollowList = async (userId, userName, type) => {
        setListTarget({ id: userId, name: userName, type });
        setListLoading(true);
        setListUsers([]);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/user/${userId}/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setListUsers(type === 'followers' ? data.followers : data.following);
            }
        } catch (err) {
            console.error('Fetch follow list error:', err);
        } finally {
            setListLoading(false);
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!reportingUser) return;

        setReportSubmitting(true);
        setReportSuccess('');
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reportedId: reportingUser.federatedId,
                    targetType: 'user',
                    reason: reportReason,
                    description: reportDescription
                })
            });

            const data = await res.json();
            if (data.success) {
                setReportSuccess('Report submitted successfully.');
                setTimeout(() => {
                    setReportingUser(null);
                    setReportSuccess('');
                    setReportDescription('');
                    setReportReason('spam');
                }, 2000);
            } else {
                setError(data.message || 'Failed to submit report');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setReportSubmitting(false);
        }
    };

    const handleCardClick = (federatedId) => {
        navigate(`/user/${encodeURIComponent(federatedId)}`);
    };

    const SkeletonCard = () => (
        <div className="search-result-card skeleton">
            <div className="search-result-left">
                <div className="search-result-avatar skeleton-bg"></div>
                <div className="search-result-info">
                    <div className="skeleton-line skeleton-title"></div>
                    <div className="skeleton-line skeleton-subtitle"></div>
                    <div className="skeleton-line skeleton-text"></div>
                </div>
            </div>
            <div className="search-result-actions">
                <div className="skeleton-button"></div>
            </div>
        </div>
    );

    return (
        <div className="search-users-container" id="search-users">
            {/* Search Input */}
            <div className="search-input-wrapper">
                <FiSearch className="search-icon" />
                <input
                    ref={inputRef}
                    id="search-users-input"
                    type="text"
                    placeholder="Search users... (e.g. alice or alice@sports)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                    autoComplete="off"
                />
                {query && (
                    <button className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
                        <FiX />
                    </button>
                )}
            </div>

            {/* Search hint */}
            {!hasSearched && !query && (
                <div className="search-hint">
                    <p><strong>💡 Tip:</strong> Type a username to search locally, or use <code>username@server</code> to search a remote server.</p>
                </div>
            )}

            {/* Search type badge */}
            {searchMeta && (
                <div className="search-meta">
                    <span className={`search-type-badge ${searchMeta.searchType}`}>
                        {searchMeta.searchType === 'local' ? <FiLocal size={12} /> : <FiGlobe size={12} />}
                        {searchMeta.searchType === 'local' ? 'Local Search' : 'Remote Search'}
                    </span>
                    <span className="search-count">
                        {searchMeta.count} {searchMeta.count === 1 ? 'result' : 'results'} found
                    </span>
                </div>
            )}

            {/* Loading / Empty Skeleton State */}
            {(loading || (hasSearched && results.length === 0)) && (
                <div className="search-results-skeleton">
                    {[1].map(i => <SkeletonCard key={i} />)}
                    {loading && (
                        <div className="search-loading-text">
                            <div className="search-spinner"></div>
                            <span>Fetching more results...</span>
                        </div>
                    )}
                </div>
            )}


            {/* Results (Show if we have them, regardless of errors from other servers) */}
            {!loading && results.length > 0 && (
                <div className="search-results" id="search-results-list">
                    {results.map((user, index) => (
                        <div
                            key={user.federatedId || index}
                            className={`search-result-card ${user.is_following ? 'following' : ''}`}
                            id={`search-result-${index}`}
                            onClick={() => handleCardClick(user.federatedId)}
                        >
                            <div className="search-result-left">
                                <div className="search-result-avatar">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.displayName} />
                                    ) : (
                                        <span>{getInitials(user.displayName)}</span>
                                    )}
                                </div>
                                <div className="search-result-info">
                                    <div className="search-result-name">
                                        {user.displayName}
                                        {user.is_following && (
                                            <span className="following-badge">Following</span>
                                        )}
                                    </div>
                                    <div className="search-result-federated-id">
                                        @{user.federatedId}
                                    </div>
                                    <div className="search-result-stats">
                                        <span onClick={() => fetchFollowList(user.federatedId, user.displayName, 'followers')} className="clickable-stat">
                                            {user.followersCount ?? 0} followers
                                        </span>
                                        <span className="stat-dot">·</span>
                                        <span onClick={() => fetchFollowList(user.federatedId, user.displayName, 'following')} className="clickable-stat">
                                            {user.followingCount ?? 0} following
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="search-result-actions">
                                <button
                                    className={`search-follow-btn ${user.is_following ? 'following' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFollowToggle(user);
                                    }}
                                    id={`follow-btn-${index}`}
                                >
                                    {user.is_following ? (
                                        <>
                                            <FiUserCheck size={14} />
                                            <span>Following</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiUserPlus size={14} />
                                            <span>Follow</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    className="search-report-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setReportingUser(user);
                                    }}
                                    title="Report Profile"
                                >
                                    <FiFlag size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Report Modal */}
            {reportingUser && (
                <div className="report-modal-overlay">
                    <div className="report-modal">
                        <div className="report-modal-header">
                            <h3>Report Profile</h3>
                            <button className="close-btn" onClick={() => setReportingUser(null)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="report-modal-body">
                            <p className="report-target-info">
                                Reporting: <strong>{reportingUser.displayName}</strong>
                                <span className="target-id">@{reportingUser.federatedId}</span>
                            </p>

                            <form onSubmit={handleReportSubmit}>
                                <div className="form-group">
                                    <label htmlFor="report-reason">Reason for reporting</label>
                                    <select
                                        id="report-reason"
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        required
                                    >
                                        <option value="spam">Spam / Excessive Posting</option>
                                        <option value="harassment">Harassment / Bullying</option>
                                        <option value="inappropriate">Inappropriate Content</option>
                                        <option value="impersonation">Impersonation</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="report-description">Details (Optional)</label>
                                    <textarea
                                        id="report-description"
                                        placeholder="Please provide more details about why you are reporting this user..."
                                        value={reportDescription}
                                        onChange={(e) => setReportDescription(e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                {reportSuccess && <p className="success-msg">{reportSuccess}</p>}
                                {error && !reportSuccess && <p className="error-msg">{error}</p>}

                                <div className="report-modal-actions">
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => setReportingUser(null)}
                                        disabled={reportSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="submit-report-btn"
                                        disabled={reportSubmitting}
                                    >
                                        {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {/* Final Empty Message (only if truly nothing after loading finishes) */}
            {!loading && !error && hasSearched && results.length === 0 && (
                <div className="search-empty-fade">
                    <p>No more results found for "<strong>{query}</strong>"</p>
                </div>
            )}

            {/* Follow List Modal (The "Pop") */}
            {listTarget && (
                <div className="list-modal-overlay" onClick={() => setListTarget(null)}>
                    <div className="list-modal" onClick={e => e.stopPropagation()}>
                        <div className="list-modal-header">
                            <h3>{listTarget.name}'s {listTarget.type}</h3>
                            <button className="close-btn" onClick={() => setListTarget(null)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="list-modal-body">
                            {listLoading ? (
                                <div className="list-loading">
                                    <div className="search-spinner"></div>
                                    <p>Loading {listTarget.type}...</p>
                                </div>
                            ) : listUsers.length > 0 ? (
                                <div className="list-users-container">
                                    {listUsers.map((u, i) => (
                                        <div key={u.federatedId || i} className="list-user-item">
                                            <div className="list-user-avatar">
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt={u.displayName} />
                                                ) : (
                                                    <span>{getInitials(u.displayName)}</span>
                                                )}
                                            </div>
                                            <div className="list-user-info">
                                                <div className="list-user-name">{u.displayName}</div>
                                                <div className="list-user-id">@{u.federatedId}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="list-empty">
                                    <p>No {listTarget.type} found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchUsers;
