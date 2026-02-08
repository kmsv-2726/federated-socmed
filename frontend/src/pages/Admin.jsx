import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiGrid, FiUsers, FiHash, FiMessageCircle, FiShield,
  FiList, FiSlash, FiLock, FiServer, FiTrendingUp,
  FiTrendingDown, FiEdit2, FiFileText, FiActivity, FiLogOut
} from 'react-icons/fi';
import '../styles/Admin.css';

const API_BASE_URL = 'http://localhost:5000/api';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: 12459,
    posts: 1847,
    reports: 23,
    engagement: 68
  });

  // Channel state
  const [channels, setChannels] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    visibility: 'public',
    rules: '',
    image: ''
  });
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState('');

  // Fetch channels when channels tab is active
  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels();
    }
  }, [activeTab]);

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setChannels(response.data.channels);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setChannelLoading(true);
    setChannelError('');

    try {
      const token = localStorage.getItem('token');
      const channelData = {
        name: newChannel.name,
        description: newChannel.description,
        visibility: newChannel.visibility,
        rules: newChannel.rules.split(',').map(r => r.trim()).filter(r => r),
        image: newChannel.image || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400'
      };

      const response = await axios.post(`${API_BASE_URL}/channels`, channelData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setNewChannel({ name: '', description: '', visibility: 'public', rules: '', image: '' });
        fetchChannels();
        alert('Channel created successfully!');
      }
    } catch (err) {
      setChannelError(err.response?.data?.message || 'Failed to create channel');
    } finally {
      setChannelLoading(false);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/channels/${channelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchChannels();
      alert('Channel deleted successfully!');
    } catch (err) {
      alert('Failed to delete channel');
    }
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setStats(prev => ({
          ...prev,
          reports: prev.reports + (Math.random() > 0.5 ? 1 : -1)
        }));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const manageUser = (username) => {
    alert(`Managing user: ${username}\n\nOptions:\n- Edit profile\n- Suspend account\n- Delete account\n- View activity`);
  };

  const reviewReport = (reportId) => {
    alert(`Reviewing report: ${reportId}\n\nActions available:\n- Approve\n- Reject\n- Take action\n- Request more info`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-wrapper">
      <div className="admin-container">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <FiShield size={24} />
            <span>Admin Portal</span>
          </div>

          <nav className="admin-nav">
            <div
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <FiGrid />
              <span>Dashboard</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <FiUsers />
              <span>Users</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveTab('channels')}
            >
              <FiHash />
              <span>Channels</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FiMessageCircle />
              <span>Reports</span>
            </div>

            <div className="admin-nav-section">Management</div>

            <div
              className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`}
              onClick={() => setActiveTab('moderation')}
            >
              <FiShield />
              <span>Moderation</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              <FiList />
              <span>Queue</span>
            </div>
            <div
              className={`admin-nav-item ${activeTab === 'blocked' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocked')}
            >
              <FiSlash />
              <span>Blocked Accounts</span>
            </div>

            <div className="admin-nav-section">Settings</div>

            <div
              className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FiLock />
              <span>Security</span>
            </div>

            <div
              className={`admin-nav-item ${activeTab === 'server' ? 'active' : ''}`}
              onClick={() => setActiveTab('server')}
            >
              <FiServer />
              <span>Server Info</span>
            </div>

            <div className="admin-nav-section">Account</div>

            <div
              className="admin-nav-item logout-btn"
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/auth');
              }}
            >
              <FiLogOut />
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
                    <FiUsers />
                    <span>Total Users</span>
                  </div>
                  <div className="stat-value">{stats.users.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <FiTrendingUp />
                    <span>12% from last month</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <FiFileText />
                    <span>Posts Today</span>
                  </div>
                  <div className="stat-value">{stats.posts.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <FiTrendingUp />
                    <span>8% from yesterday</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <FiMessageCircle />
                    <span>Active Reports</span>
                  </div>
                  <div className="stat-value">{stats.reports}</div>
                  <div className="stat-trend trend-down">
                    <FiTrendingDown />
                    <span>15% from last week</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <FiActivity />
                    <span>Engagement Rate</span>
                  </div>
                  <div className="stat-value">{stats.engagement}%</div>
                  <div className="stat-trend trend-up">
                    <FiTrendingUp />
                    <span>5% improvement</span>
                  </div>
                </div>
              </div>

              {/* Recent Users Table */}
              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Recent User Registrations</h2>
                  <button className="action-btn-sm" onClick={() => alert('Viewing all users...')}>View All</button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>@alice_wonder</td>
                      <td>alice@example.com</td>
                      <td>2 hours ago</td>
                      <td><button className="action-btn-sm" onClick={() => manageUser('@alice_wonder')}>Manage</button></td>
                    </tr>
                    <tr>
                      <td>@bob_builder</td>
                      <td>bob@example.com</td>
                      <td>5 hours ago</td>
                      <td><button className="action-btn-sm" onClick={() => manageUser('@bob_builder')}>Manage</button></td>
                    </tr>
                    <tr>
                      <td>@charlie_dev</td>
                      <td>charlie@example.com</td>
                      <td>1 day ago</td>
                      <td><button className="action-btn-sm" onClick={() => manageUser('@charlie_dev')}>Manage</button></td>
                    </tr>
                    <tr>
                      <td>@diana_designs</td>
                      <td>diana@example.com</td>
                      <td>1 day ago</td>
                      <td><button className="action-btn-sm" onClick={() => manageUser('@diana_designs')}>Manage</button></td>
                    </tr>
                    <tr>
                      <td>@eve_security</td>
                      <td>eve@example.com</td>
                      <td>2 days ago</td>
                      <td><button className="action-btn-sm" onClick={() => manageUser('@eve_security')}>Manage</button></td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Moderation Queue */}
              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Moderation Queue</h2>
                  <button className="action-btn-sm" onClick={() => alert('Viewing all reports...')}>View All Reports</button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Type</th>
                      <th>Reported By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>#RPT-1245</td>
                      <td>Spam Content</td>
                      <td>@moderator_01</td>
                      <td>30 mins ago</td>
                      <td><button className="action-btn-sm" onClick={() => reviewReport('#RPT-1245')}>Review</button></td>
                    </tr>
                    <tr>
                      <td>#RPT-1244</td>
                      <td>Harassment</td>
                      <td>@user_safety</td>
                      <td>2 hours ago</td>
                      <td><button className="action-btn-sm" onClick={() => reviewReport('#RPT-1244')}>Review</button></td>
                    </tr>
                    <tr>
                      <td>#RPT-1243</td>
                      <td>Inappropriate</td>
                      <td>@moderator_02</td>
                      <td>5 hours ago</td>
                      <td><button className="action-btn-sm" onClick={() => reviewReport('#RPT-1243')}>View</button></td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </>
          )}

          {activeTab === 'channels' && (
            <div className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Channels</h2>
                <button className="primary-btn" onClick={() => setShowCreateModal(true)}>Create New Channel</button>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Channel Name</th>
                    <th>Type</th>
                    <th>Members</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.length > 0 ? (
                    channels.map(channel => (
                      <tr key={channel._id}>
                        <td>#{channel.name}</td>
                        <td>{channel.visibility === 'public' ? 'Public' : 'Private'}</td>
                        <td>{channel.followersCount || 0}</td>
                        <td>{formatDate(channel.createdAt)}</td>
                        <td><span className="status-badge status-active">Active</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="action-btn-sm"><FiEdit2 size={14} /></button>
                            <button
                              className="action-btn-sm"
                              style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                              onClick={() => handleDeleteChannel(channel._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af' }}>
                        No channels found. Create one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Create Channel Modal */}
          {showCreateModal && (
            <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Create New Channel</h2>
                {channelError && <p className="error-text">{channelError}</p>}
                <form onSubmit={handleCreateChannel}>
                  <div className="form-group">
                    <label>Channel Name</label>
                    <input
                      type="text"
                      value={newChannel.name}
                      onChange={e => setNewChannel({ ...newChannel, name: e.target.value })}
                      placeholder="e.g., recipes, announcements"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={newChannel.description}
                      onChange={e => setNewChannel({ ...newChannel, description: e.target.value })}
                      placeholder="What is this channel about?"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Visibility</label>
                    <select
                      value={newChannel.visibility}
                      onChange={e => setNewChannel({ ...newChannel, visibility: e.target.value })}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rules (comma-separated)</label>
                    <input
                      type="text"
                      value={newChannel.rules}
                      onChange={e => setNewChannel({ ...newChannel, rules: e.target.value })}
                      placeholder="Be respectful, No spam, Stay on topic"
                    />
                  </div>
                  <div className="form-group">
                    <label>Image URL (optional)</label>
                    <input
                      type="text"
                      value={newChannel.image}
                      onChange={e => setNewChannel({ ...newChannel, image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="action-btn-sm" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-btn" disabled={channelLoading}>
                      {channelLoading ? 'Creating...' : 'Create Channel'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Queue Tab */}
          {activeTab === 'queue' && (
            <section className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">Review Queue</h2>
                <button className="action-btn-sm" onClick={() => alert('Viewing all reports...')}>View All Reports</button>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Type</th>
                    <th>Reported By</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>#RPT-1245</td>
                    <td>Spam Content</td>
                    <td>@moderator_01</td>
                    <td>30 mins ago</td>
                    <td><button className="action-btn-sm" onClick={() => reviewReport('#RPT-1245')}>Review</button></td>
                  </tr>
                  <tr>
                    <td>#RPT-1244</td>
                    <td>Harassment</td>
                    <td>@user_safety</td>
                    <td>2 hours ago</td>
                    <td><button className="action-btn-sm" onClick={() => reviewReport('#RPT-1244')}>Review</button></td>
                  </tr>
                  <tr>
                    <td>#RPT-1243</td>
                    <td>Inappropriate</td>
                    <td>@moderator_02</td>
                    <td>5 hours ago</td>
                    <td><button className="action-btn-sm" onClick={() => reviewReport('#RPT-1243')}>View</button></td>
                  </tr>
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

        </main>
      </div>
    </div>
  );
};

export default Admin;
