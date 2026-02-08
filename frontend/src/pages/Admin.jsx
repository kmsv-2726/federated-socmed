import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiShield, FiBarChart2, FiUsers, FiTv, FiMessageCircle,
  FiSlash, FiLock, FiServer, FiFileText, FiTrendingUp,
  FiHome, FiLogOut, FiTrash2, FiEdit, FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import '../styles/Admin.css';

const API_BASE_URL = "http://localhost:5000/api";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    reports: 0,
    engagement: 0
  });

  const [usersList, setUsersList] = useState([]);
  const [channelsList, setChannelsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state for editing channels
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [editFormData, setEditFormData] = useState({ description: '', rules: '' });

  // Modal state for creating channels
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    rules: '',
    visibility: 'public',
    image: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        const [usersRes, postsRes, channelsRes, reportsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/user`, config),
          axios.get(`${API_BASE_URL}/posts`, config),
          axios.get(`${API_BASE_URL}/channels`, config),
          axios.get(`${API_BASE_URL}/reports?limit=100`, config)
        ]);

        let usedMock = false;
        let newStats = { ...stats };

        if (usersRes.status === 'fulfilled') {
          setUsersList(usersRes.value.data.users || []);
          newStats.users = usersRes.value.data.users.length;
        } else {
          usedMock = true;
        }

        if (postsRes.status === 'fulfilled') {
          newStats.posts = postsRes.value.data.posts.length;
        }

        if (channelsRes.status === 'fulfilled') {
          setChannelsList(channelsRes.value.data.channels || []);
        }

        if (reportsRes.status === 'fulfilled') {
          const reports = reportsRes.value.data.reports || [];
          setReportsList(reports);
          const activeReports = reports.filter(r => r.status === 'pending').length;
          newStats.reports = activeReports;
        }

        if (usedMock || usersRes.status === 'rejected' || postsRes.status === 'rejected') {
          throw new Error("Backend unavailable, switching to mock data");
        }

        setStats(prev => ({ ...prev, ...newStats }));

      } catch (err) {
        console.warn("Backend unavailable or error fetching data.");
        setStats({ users: 0, posts: 0, reports: 0, engagement: 0 });
        setUsersList([]);
        setChannelsList([]);
        setReportsList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        engagement: Math.floor(Math.random() * 20) + 50
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const manageUser = (username) => {
    alert(`Managing user: ${username}\n\nOptions:\n- Edit profile\n- Suspend account\n- Delete account\n- View activity`);
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/channels/${channelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChannelsList(prev => prev.filter(c => c._id !== channelId));
      alert('Channel deleted successfully.');
    } catch (err) {
      console.error('Error deleting channel:', err);
      alert('Failed to delete channel.');
    }
  };

  const openEditModal = (channel) => {
    setEditingChannel(channel);
    setEditFormData({
      description: channel.description || '',
      rules: Array.isArray(channel.rules) ? channel.rules.join('\n') : ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingChannel) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(`${API_BASE_URL}/channels/description/${editingChannel.name}`,
        { description: editFormData.description }, config);

      const rulesArray = editFormData.rules.split('\n').filter(r => r.trim() !== '');
      await axios.put(`${API_BASE_URL}/channels/rules/${editingChannel.name}`,
        { rules: rulesArray }, config);

      setChannelsList(prev => prev.map(c =>
        c._id === editingChannel._id
          ? { ...c, description: editFormData.description, rules: rulesArray }
          : c
      ));

      setEditModalOpen(false);
      setEditingChannel(null);
      alert('Channel updated successfully.');
    } catch (err) {
      console.error('Error updating channel:', err);
      alert('Failed to update channel.');
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!createFormData.name.trim()) {
      alert('Channel name is required.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const rulesArray = createFormData.rules.split('\n').filter(r => r.trim() !== '');

      const response = await axios.post(`${API_BASE_URL}/channels`, {
        name: createFormData.name.trim(),
        description: createFormData.description,
        rules: rulesArray,
        visibility: createFormData.visibility,
        image: createFormData.image
      }, config);

      if (response.data.success) {
        setChannelsList(prev => [...prev, response.data.channel]);
        setCreateModalOpen(false);
        setCreateFormData({ name: '', description: '', rules: '', visibility: 'public', image: '' });
        alert('Channel created successfully!');
      }
    } catch (err) {
      console.error('Error creating channel:', err);
      alert(err.response?.data?.message || 'Failed to create channel.');
    }
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

      setReportsList(prev => prev.map(r =>
        r._id === reportId ? { ...r, status: status } : r
      ));

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
            <FiShield size={20} />
            <span>Admin Portal</span>
          </div>

          <nav className="admin-nav">
            <div
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <FiBarChart2 size={18} />
              <span>Dashboard</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <FiUsers size={18} />
              <span>Users</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveTab('channels')}
            >
              <FiTv size={18} />
              <span>Channels</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FiMessageCircle size={18} />
              <span>Reports</span>
            </div>

            <div className="admin-nav-section">Management</div>

            <div
              className={`admin-nav-item ${activeTab === 'blocked' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocked')}
            >
              <FiSlash size={18} />
              <span>Blocked Accounts</span>
            </div>

            <div className="admin-nav-section">Settings</div>

            <div
              className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FiLock size={18} />
              <span>Security</span>
            </div>

            <div
              className={`admin-nav-item ${activeTab === 'server' ? 'active' : ''}`}
              onClick={() => setActiveTab('server')}
            >
              <FiServer size={18} />
              <span>Server Info</span>
            </div>

            <div className="admin-nav-section">Navigation</div>

            <div className="admin-nav-item" onClick={handleGoHome}>
              <FiHome size={18} />
              <span>Go to Home</span>
            </div>

            <div className="admin-nav-item logout-btn" onClick={handleLogout}>
              <FiLogOut size={18} />
              <span>Logout</span>
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
                    <FiUsers size={18} />
                    <span>Total Users</span>
                  </div>
                  <div className="stat-value">{stats.users.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <FiArrowUp size={14} />
                    <span>Real-time</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <FiFileText size={18} />
                    <span>Total Posts</span>
                  </div>
                  <div className="stat-value">{stats.posts.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <FiArrowUp size={14} />
                    <span>Global</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <FiMessageCircle size={18} />
                    <span>Active Reports</span>
                  </div>
                  <div className="stat-value">{stats.reports}</div>
                  <div className="stat-trend trend-down">
                    <FiArrowDown size={14} />
                    <span>Pending Action</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <FiTrendingUp size={18} />
                    <span>Engagement Rate</span>
                  </div>
                  <div className="stat-value">{stats.engagement}%</div>
                  <div className="stat-trend trend-up">
                    <FiArrowUp size={14} />
                    <span>Estimated</span>
                  </div>
                </div>
              </div>

              {/* Recent Users Table */}
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

              {/* Recent Reports Table */}
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
                    <th>Avatar</th>
                    <th>Display Name</th>
                    <th>Federated ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(user => (
                    <tr key={user._id || user.federatedId}>
                      <td>
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ddd' }}></div>
                        )}
                      </td>
                      <td>{user.displayName}</td>
                      <td>{user.federatedId}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>
                        <span className={`status-badge`} style={{ backgroundColor: user.role === 'admin' ? '#dbeafe' : '#d1fae5', color: user.role === 'admin' ? '#1e40af' : '#065f46' }}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isSuspended ? 'status-suspended' : 'status-active'}`}>
                          {user.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td><button className="action-btn-sm" onClick={() => manageUser(user.displayName)}>Manage</button></td>
                    </tr>
                  ))}
                  {usersList.length === 0 && <tr><td colSpan="7">No users found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Channels</h2>
                <button className="primary-btn" onClick={() => setCreateModalOpen(true)}>Create New Channel</button>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Channel Name</th>
                    <th>Description</th>
                    <th>Status (Visibility)</th>
                    <th>Followers</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channelsList.map(channel => (
                    <tr key={channel._id}>
                      <td>#{channel.name}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.description}</td>
                      <td>
                        <span className={`status-badge ${channel.visibility === 'public' ? 'status-active' : 'status-pending'}`}>
                          {channel.visibility}
                        </span>
                      </td>
                      <td>{channel.followersCount}</td>
                      <td>{formatDate(channel.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="action-btn-sm" onClick={() => openEditModal(channel)} title="Update">
                            <FiEdit size={14} /> Update
                          </button>
                          <button className="action-btn-sm" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => handleDeleteChannel(channel._id)} title="Delete">
                            <FiTrash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {channelsList.length === 0 && <tr><td colSpan="6">No channels found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reports' && (
            <section className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Reports</h2>
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
                  {reportsList.map(report => (
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
                    <FiServer size={24} />
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

          {(activeTab === 'blocked' || activeTab === 'security') && (
            <div className="admin-section">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h2>
              <p>Coming soon...</p>
            </div>
          )}

        </main>
      </div>

      {/* Edit Channel Modal */}
      {editModalOpen && editingChannel && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Channel: #{editingChannel.name}</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Channel description..."
                />
              </div>
              <div className="form-group">
                <label>Rules (one per line)</label>
                <textarea
                  value={editFormData.rules}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, rules: e.target.value }))}
                  placeholder="Enter rules, one per line..."
                  rows={5}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="action-btn-sm" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Channel</h2>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Channel Name *</label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., recipes, sports-news"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Channel description..."
                />
              </div>
              <div className="form-group">
                <label>Rules (one per line)</label>
                <textarea
                  value={createFormData.rules}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, rules: e.target.value }))}
                  placeholder="Enter rules, one per line..."
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Visibility</label>
                <select
                  value={createFormData.visibility}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, visibility: e.target.value }))}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="form-group">
                <label>Image URL (optional)</label>
                <input
                  type="text"
                  value={createFormData.image}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="action-btn-sm" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Create Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
