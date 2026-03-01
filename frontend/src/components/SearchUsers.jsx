import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiUserCheck, FiUserPlus, FiGlobe, FiHome as FiLocal, FiAlertCircle } from 'react-icons/fi';
import '../styles/SearchUsers.css';

const API_BASE_URL = "http://localhost:5000/api";

const SearchUsers = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchMeta, setSearchMeta] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);
    const inputRef = useRef(null);

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
                `${API_BASE_URL}/search/users?q=${encodeURIComponent(searchQuery.trim())}&limit=20`,
                {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const data = await res.json();

            if (data.success) {
                setResults(data.users || []);
                setSearchMeta({
                    searchType: data.searchType,
                    count: data.count,
                    query: data.query
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
                `${API_BASE_URL}/user/${user.federatedId}/follow`,
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
                            ? { ...u, is_following: !u.is_following }
                            : u
                    )
                );
            }
        } catch (err) {
            console.error('Follow/unfollow error:', err);
        }
    };

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

            {/* Loading */}
            {loading && (
                <div className="search-loading">
                    <div className="search-spinner"></div>
                    <span>Searching...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="search-error">
                    <FiAlertCircle />
                    <span>{error}</span>
                </div>
            )}

            {/* Results */}
            {!loading && !error && results.length > 0 && (
                <div className="search-results" id="search-results-list">
                    {results.map((user, index) => (
                        <div
                            key={user.federatedId || index}
                            className={`search-result-card ${user.is_following ? 'following' : ''}`}
                            id={`search-result-${index}`}
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
                                        <span>{user.followersCount ?? 0} followers</span>
                                        <span className="stat-dot">·</span>
                                        <span>{user.followingCount ?? 0} following</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                className={`search-follow-btn ${user.is_following ? 'following' : ''}`}
                                onClick={() => handleFollowToggle(user)}
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
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && hasSearched && results.length === 0 && (
                <div className="search-empty">
                    <FiSearch size={40} />
                    <p>No users found for "<strong>{query}</strong>"</p>
                    {!query.includes('@') && (
                        <p className="search-empty-hint">
                            Try searching with <code>{query}@servername</code> to find users on a remote server
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchUsers;
