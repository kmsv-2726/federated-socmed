import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Admin.css';

const API_BASE_URL = "http://localhost:5000/api";

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    reports: 0,
    engagement: 0 // Still simulated as per requirement
  });

  const [usersList, setUsersList] = useState([]);
  const [channelsList, setChannelsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        // Fetch all required data in parallel
        const [usersRes, postsRes, channelsRes, reportsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/users`, config),
          axios.get(`${API_BASE_URL}/posts`, config),
          axios.get(`${API_BASE_URL}/channels`, config),
          axios.get(`${API_BASE_URL}/reports?limit=100`, config) // Increased limit for admin view
        ]);

        let usedMock = false;
        let newStats = { ...stats };

        // Process Users
        if (usersRes.status === 'fulfilled') {
          setUsersList(usersRes.value.data.users || []);
          newStats.users = usersRes.value.data.users.length;
        } else {
          // Fallback to mock data
          usedMock = true;
        }

        // Process Posts (for stats only)
        if (postsRes.status === 'fulfilled') {
          // utilizing getAllPosts endpoint to get count
          newStats.posts = postsRes.value.data.posts.length;
        }

        // Process Channels
        if (channelsRes.status === 'fulfilled') {
          setChannelsList(channelsRes.value.data.channels || []);
        }

        // Process Reports
        if (reportsRes.status === 'fulfilled') {
          const reports = reportsRes.value.data.reports || [];
          setReportsList(reports);
          // Count active (pending) reports
          const activeReports = reports.filter(r => r.status === 'pending').length;
          newStats.reports = activeReports;
        }

        if (usedMock || usersRes.status === 'rejected' || postsRes.status === 'rejected') {
          throw new Error("Backend unavailable, switching to mock data");
        }

        setStats(prev => ({ ...prev, ...newStats }));

      } catch (err) {
        console.warn("Backend unavailable or error fetching data. Loading mock data for demonstration.");

        // MOCK DATA FALLBACK
        // MOCK DATA FALLBACK
        // Setting to 0 as requested since backend is offline and no real data exists
        setStats({
          users: 0,
          posts: 0,
          reports: 0,
          engagement: 0
        });

        setUsersList([]);
        setChannelsList([]);
        setReportsList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Run once on mount

  // Simulate real-time engagement updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        engagement: Math.floor(Math.random() * 20) + 50 // Random 50-70%
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const manageUser = (username) => {
    // Placeholder for user management actions
    alert(`Managing user: ${username}\n\nOptions:\n- Edit profile\n- Suspend account\n- Delete account\n- View activity`);
  };

  const reviewReport = async (reportId, action) => {
    if (!action) {
      alert(`Reviewing report: ${reportId}\n\nActions available: Approve, Reject`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const status = action === 'dismiss' ? 'dismissed' : 'resolved';

      await axios.put(`${API_BASE_URL}/reports/${reportId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setReportsList(prev => prev.map(r =>
        r._id === reportId ? { ...r, status: status } : r
      ));

      // Update stats if resolving a pending report
      const report = reportsList.find(r => r._id === reportId);
      if (report && report.status === 'pending') {
        setStats(prev => ({ ...prev, reports: Math.max(0, prev.reports - 1) }));
      }

      alert(`Report ${reportId} marked as ${status}`);

    } catch (err) {
      console.error("Error updating report:", err);
      alert("Failed to update report status");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return Math.floor(seconds) + " seconds ago";
  };

  if (loading) return <div className="admin-loading">Loading Admin Dashboard...</div>;

  return (
    <div className="admin-wrapper">
      <div className="admin-container">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <span>🛡️</span>
            <span>Admin Portal</span>
          </div>

          <nav className="admin-nav">
            <div
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span>📊</span>
              <span>Dashboard</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span>👥</span>
              <span>Users</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveTab('channels')}
            >
              <span>📺</span>
              <span>Channels</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span>💬</span>
              <span>Reports</span>
            </div>

            <div className="admin-nav-section">Management</div>

            <div
              className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`}
              onClick={() => setActiveTab('moderation')}
            >
              <span>🛡️</span>
              <span>Moderation</span>
            </div>
            {/* Adding Queue Item as requested */}
            <div
              className={`admin-nav-item ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              <span>📋</span>
              <span>Queue</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'blocked' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocked')}
            >
              <span>🚫</span>
              <span>Blocked Accounts</span>
            </div>

            <div className="admin-nav-section">Settings</div>

            <div
              className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span>🔐</span>
              <span>Security</span>
            </div>

            <div
              className={`admin-nav-item ${activeTab === 'server' ? 'active' : ''}`}
              onClick={() => setActiveTab('server')}
            >
              <span>🖥️</span>
              <span>Server Info</span>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-content">

          {activeTab === 'dashboard' && (
            <>
              <div className="admin-header">
                <h1 className="page-title">Dashboard Overview</h1>
                <button className="primary-btn" onClick={() => alert('Generating report...')}>Generate Report</button>
              </div>

              {/* Stats Grid */}
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span>👥</span>
                    <span>Total Users</span>
                  </div>
                  <div className="stat-value">{stats.users.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <span>↑</span>
                    <span>Real-time</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>📝</span>
                    <span>Total Posts</span>
                  </div>
                  <div className="stat-value">{stats.posts.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <span>↑</span>
                    <span>Global</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>💬</span>
                    <span>Active Reports</span>
                  </div>
                  <div className="stat-value">{stats.reports}</div>
                  <div className="stat-trend trend-down">
                    {/* Placeholder trend */}
                    <span>↓</span>
                    <span>Pending Action</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>📈</span>
                    <span>Engagement Rate</span>
                  </div>
                  <div className="stat-value">{stats.engagement}%</div>
                  <div className="stat-trend trend-up">
                    <span>↑</span>
                    <span>Estimated</span>
                  </div>
                </div>
              </div>

              {/* Recent Users Table (First 5) */}
              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Recent User Registrations</h2>
                  <button className="action-btn-sm" onClick={() => setActiveTab('users')}>View All</button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Federated ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.slice(0, 5).map(user => (
                      <tr key={user._id || user.federatedId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {user.avatarUrl && <img src={user.avatarUrl} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
                            {user.displayName}
                          </div>
                        </td>
                        <td>{user.federatedId}</td>
                        <td><button className="action-btn-sm" onClick={() => manageUser(user.displayName)}>Manage</button></td>
                      </tr>
                    ))}
                    {usersList.length === 0 && <tr><td colSpan="3">No users found.</td></tr>}
                  </tbody>
                </table>
              </section>

              {/* Recent Reports Table (First 3) */}
              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Recent Reports</h2>
                  <button className="action-btn-sm" onClick={() => setActiveTab('reports')}>View All Reports</button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsList.slice(0, 3).map(report => (
                      <tr key={report._id}>
                        <td>{report.targetType}</td>
                        <td>{report.reason}</td>
                        <td>
                          <span className={`status-badge ${report.status === 'pending' ? 'status-active' : ''}`} style={{ backgroundColor: report.status === 'resolved' ? '#d1fae5' : report.status === 'dismissed' ? '#f3f4f6' : '#fee2e2', color: report.status === 'resolved' ? '#065f46' : report.status === 'dismissed' ? '#374151' : '#991b1b' }}>
                            {report.status}
                          </span>
                        </td>
                        <td>{formatTimeAgo(report.createdAt)}</td>
                        <td>
                          <button className="action-btn-sm" onClick={() => reviewReport(report._id, 'dismiss')}>Dismiss</button>
                          <button className="action-btn-sm" style={{ marginLeft: '5px', color: 'green', borderColor: 'green' }} onClick={() => reviewReport(report._id, 'resolve')}>Resolve</button>
                        </td>
                      </tr>
                    ))}
                    {reportsList.length === 0 && <tr><td colSpan="5">No reports found.</td></tr>}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {activeTab === 'users' && (
            <div className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Users</h2>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Federated ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(user => (
                    <tr key={user._id || user.federatedId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ddd' }}></div>
                          )}
                          {user.displayName}
                        </div>
                      </td>
                      <td>{user.federatedId}</td>
                      <td><button className="action-btn-sm" onClick={() => manageUser(user.displayName)}>Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Channels</h2>
                <button className="primary-btn">Create New Channel</button>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Channel Name</th>
                    <th>Privacy</th>
                    <th>Members</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channelsList.map(channel => (
                    <tr key={channel._id}>
                      <td>#{channel.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{channel.visibility}</td>
                      <td>{channel.followersCount}</td>
                      <td>{formatDate(channel.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="action-btn-sm">Edit</button>
                          <button className="action-btn-sm" style={{ color: '#ef4444', borderColor: '#fee2e2' }}>Archive</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {channelsList.length === 0 && <tr><td colSpan="5">No channels found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Combined Report/Queue View Logic */}
          {(activeTab === 'reports' || activeTab === 'queue' || activeTab === 'moderation') && (
            <section className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">{activeTab === 'queue' ? 'Moderation Queue' : 'All Reports'}</h2>
                <button className="action-btn-sm" onClick={() => { }}>Refetch</button>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Filter for Queue/Moderation if needed, or show all */}
                  {reportsList
                    .filter(r => (activeTab === 'queue' || activeTab === 'moderation') ? r.status === 'pending' : true)
                    .map(report => (
                      <tr key={report._id}>
                        <td>#{report._id.slice(-6)}</td>
                        <td>{report.targetType}</td>
                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.reportedId}</td>
                        <td>{report.reason}</td>
                        <td>
                          <span className={`status-badge ${report.status === 'pending' ? 'status-active' : ''}`} style={{ backgroundColor: report.status === 'resolved' ? '#d1fae5' : report.status === 'dismissed' ? '#f3f4f6' : '#fee2e2', color: report.status === 'resolved' ? '#065f46' : report.status === 'dismissed' ? '#374151' : '#991b1b' }}>
                            {report.status}
                          </span>
                        </td>
                        <td>{report.reporterId}</td>
                        <td>{formatTimeAgo(report.createdAt)}</td>
                        <td>
                          {report.status === 'pending' && (
                            <>
                              <button className="action-btn-sm" onClick={() => reviewReport(report._id, 'dismiss')}>Dismiss</button>
                              <button className="action-btn-sm" style={{ marginLeft: '5px', color: 'green', borderColor: 'green' }} onClick={() => reviewReport(report._id, 'resolve')}>Resolve</button>
                            </>
                          )}
                          {report.status !== 'pending' && <span style={{ color: '#6b7280', fontSize: '0.8em' }}>Archived</span>}
                        </td>
                      </tr>
                    ))}
                  {reportsList.length === 0 && <tr><td colSpan="8">No reports found.</td></tr>}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'server' && (
            <>
              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Server Identity</h2>
                  <button className="primary-btn" onClick={() => alert('Edit functionality coming soon')}>Edit</button>
                </div>
                <div className="server-info-content">
                  <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Server Name</h3>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🖥️</span>
                    <span>Connected Main Server</span>
                  </div>
                </div>
              </section>

              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Description</h2>
                </div>
                <div className="server-info-content">
                  <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    This is the primary community server for Connected. All general discussions, updates, and public channels are hosted here.
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Placeholders for unused tabs */}
          {(activeTab === 'blocked' || activeTab === 'security') && (
            <div className="admin-section">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h2>
              <p>Coming soon...</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Admin;
