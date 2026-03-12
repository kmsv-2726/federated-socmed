import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiShield, FiBarChart2, FiUsers, FiTv, FiMessageCircle,
  FiSlash, FiLock, FiServer, FiFileText, FiTrendingUp,
  FiHome, FiLogOut, FiTrash2, FiEdit, FiArrowUp, FiArrowDown,
  FiAlertTriangle, FiUser, FiX, FiCheckCircle
} from 'react-icons/fi';
import ImageCropperModal from '../components/ImageCropperModal';
import '../styles/Admin.css';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

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
  const [pendingRequests, setPendingRequests] = useState([]);
  const [serversList, setServersList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
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

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [cropperTarget, setCropperTarget] = useState(null); // 'create' or 'edit'

  // Modal state for adding servers
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverFormData, setServerFormData] = useState({
    name: '',
    url: '',
    category: 'general',
    description: ''
  });

  const [globalFederationEnabled, setGlobalFederationEnabled] = useState(true);

  // Report detail modal
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportTargetData, setReportTargetData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Suspended users
  const [suspendedUsers, setSuspendedUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        const [usersRes, postsRes, channelsRes, reportsRes, requestsRes, serversRes, federationRes, activitiesRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/user`, config),
          axios.get(`${API_BASE_URL}/posts`, config),
          axios.get(`${API_BASE_URL}/channels`, config),
          axios.get(`${API_BASE_URL}/reports?limit=100`, config),
          axios.get(`${API_BASE_URL}/channels/all-requests`, config),
          axios.get(`${API_BASE_URL}/servers`, config),
          axios.get(`${API_BASE_URL}/federation/status`, config).catch(() => ({ data: { isEnabled: true } })),
          axios.get(`${API_BASE_URL}/activities`, config).catch(() => ({ data: { activities: [] } }))
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

        if (requestsRes.status === 'fulfilled') {
          setPendingRequests(requestsRes.value.data.requests || []);
        }

        if (serversRes.status === 'fulfilled') {
          setServersList(serversRes.value.data.servers || []);
        }

        if (federationRes && federationRes.status === 'fulfilled' && federationRes.value.data) {
          setGlobalFederationEnabled(federationRes.value.data.isEnabled !== false);
        }

        if (activitiesRes && activitiesRes.status === 'fulfilled' && activitiesRes.value.data) {
          setActivitiesList(activitiesRes.value.data.activities || []);
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

  // Auto-fetch suspended users when switching to blocked tab
  useEffect(() => {
    if (activeTab === 'blocked') {
      fetchSuspendedUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        engagement: Math.floor(Math.random() * 20) + 50
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
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
      rules: Array.isArray(channel.rules) ? channel.rules.join('\n') : '',
      image: channel.image || ''
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

      if (editFormData.image !== editingChannel.image) {
        await axios.put(`${API_BASE_URL}/channels/image/${editingChannel.name}`,
          { image: editFormData.image || '' }, config);
      }

      setChannelsList(prev => prev.map(c =>
        c._id === editingChannel._id
          ? { ...c, description: editFormData.description, rules: rulesArray, image: editFormData.image }
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

  const handleChannelImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Max 10MB allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageSrc(reader.result);
      setCropperTarget('create');
      setShowCropper(true);
      e.target.value = null;
    };
    reader.readAsDataURL(file);
  };

  const handleEditChannelImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Max 10MB allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageSrc(reader.result);
      setCropperTarget('edit');
      setShowCropper(true);
      e.target.value = null;
    };
    reader.readAsDataURL(file);
  };

  const handleCropperComplete = (croppedImageBase64) => {
    if (cropperTarget === 'create') {
      setCreateFormData(prev => ({ ...prev, image: croppedImageBase64 }));
    } else if (cropperTarget === 'edit') {
      setEditFormData(prev => ({ ...prev, image: croppedImageBase64 }));
    }
    setShowCropper(false);
    setTempImageSrc(null);
    setCropperTarget(null);
  };

  const handleResolveRequest = async (channelName, userFederatedId, action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_BASE_URL}/channels/resolve-request/${encodeURIComponent(channelName)}`,
        { userFederatedId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPendingRequests(prev => prev.filter(r => !(r.channelName === channelName && r.userFederatedId === userFederatedId)));
      } else {
        alert(res.data.message || 'Failed to resolve request');
      }
    } catch (err) {
      console.error('Error resolving request:', err);
      alert('Failed to resolve request');
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

  const openReportDetail = async (report) => {
    setSelectedReport(report);
    setReportTargetData(null);
    setReportDetailOpen(true);
    setReportLoading(true);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (report.targetType === 'post') {
        // Fetch all posts and find the one matching the reportedId
        const res = await axios.get(`${API_BASE_URL}/posts`, config);
        const posts = res.data.posts || [];
        const post = posts.find(p => p.federatedId === report.reportedId);
        setReportTargetData(post || null);
      } else if (report.targetType === 'user') {
        const encoded = encodeURIComponent(report.reportedId);
        const res = await axios.get(`${API_BASE_URL}/user/${encoded}`, config);
        setReportTargetData(res.data.user || res.data || null);
      }
    } catch (err) {
      console.error('Error fetching report target:', err);
      setReportTargetData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleResolvePost = async () => {
    if (!selectedReport) return;
    if (!window.confirm('Are you sure you want to remove this post? The author will be notified via email.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/reports/${selectedReport._id}/resolve-post`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportsList(prev => prev.map(r => r._id === selectedReport._id ? { ...r, status: 'resolved' } : r));
      setStats(prev => ({ ...prev, reports: Math.max(0, prev.reports - 1) }));
      setReportDetailOpen(false);
      alert('Post removed and report resolved. Author has been notified via email.');
    } catch (err) {
      console.error('Error resolving post report:', err);
      alert(err.response?.data?.message || 'Failed to resolve report');
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedReport) return;
    if (!window.confirm('Are you sure you want to suspend this user? They will be logged out and notified via email.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/reports/${selectedReport._id}/resolve-user`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportsList(prev => prev.map(r => r._id === selectedReport._id ? { ...r, status: 'resolved' } : r));
      setStats(prev => ({ ...prev, reports: Math.max(0, prev.reports - 1) }));
      setReportDetailOpen(false);
      alert('User suspended and report resolved. User has been notified via email.');
    } catch (err) {
      console.error('Error resolving user report:', err);
      alert(err.response?.data?.message || 'Failed to resolve report');
    }
  };

  const handleDismissReport = async () => {
    if (!selectedReport) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/reports/${selectedReport._id}/status`, { status: 'dismissed' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportsList(prev => prev.map(r => r._id === selectedReport._id ? { ...r, status: 'dismissed' } : r));
      setStats(prev => ({ ...prev, reports: Math.max(0, prev.reports - 1) }));
      setReportDetailOpen(false);
      alert('Report dismissed.');
    } catch (err) {
      console.error('Error dismissing report:', err);
      alert('Failed to dismiss report');
    }
  };

  const fetchSuspendedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/user/suspended`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuspendedUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching suspended users:', err);
    }
  };

  const handleUnsuspend = async (federatedId) => {
    if (!window.confirm('Are you sure you want to unsuspend this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/user/${encodeURIComponent(federatedId)}/unsuspend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuspendedUsers(prev => prev.filter(u => u.federatedId !== federatedId));
      alert('User unsuspended successfully.');
    } catch (err) {
      console.error('Error unsuspending user:', err);
      alert('Failed to unsuspend user.');
    }
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!serverFormData.name.trim() || !serverFormData.url.trim()) {
      alert('Name and URL are required.');
      return;
    }

    const submissionData = { ...serverFormData };
    if (!submissionData.description || !submissionData.description.trim()) {
      submissionData.description = "No description provided.";
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.post(`${API_BASE_URL}/servers`, submissionData, config);

      if (response.data.success) {
        setServersList(prev => [...prev, response.data.server]);
        setServerModalOpen(false);
        setServerFormData({ name: '', url: '', category: 'general', description: '' });
        alert('Server added successfully!');
      }
    } catch (err) {
      console.error('Error adding server:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to add server.';
      alert(`Error: ${msg}`);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!window.confirm('Are you sure you want to delete this server connection?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/servers/${serverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServersList(prev => prev.filter(s => s._id !== serverId));
      alert('Server deleted successfully.');
    } catch (err) {
      console.error('Error deleting server:', err);
      alert('Failed to delete server.');
    }
  };

  const handleGlobalFederationToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/federation/status`,
        { isEnabled: !globalFederationEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && typeof response.data.isEnabled === 'boolean') {
        setGlobalFederationEnabled(response.data.isEnabled);
      } else {
        setGlobalFederationEnabled(!globalFederationEnabled);
      }
    } catch (err) {
      console.error('Error toggling federation:', err);
      setGlobalFederationEnabled(!globalFederationEnabled);
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
              className={`admin-nav-item ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <FiLock size={18} />
              <span>Channel Requests</span>
              {pendingRequests.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 7px',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  {pendingRequests.length}
                </span>
              )}
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

          {/* ===== DASHBOARD TAB ===== */}
          {activeTab === 'dashboard' && (
            <>
              <div className="admin-header">
                <h1 className="page-title">Dashboard Overview</h1>
              </div>

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
                    <FiLock size={18} />
                    <span>Pending Requests</span>
                  </div>
                  <div className="stat-value">{pendingRequests.length}</div>
                  <div className={`stat-trend ${pendingRequests.length > 0 ? 'trend-down' : 'trend-up'}`}>
                    {pendingRequests.length > 0 ? <FiArrowDown size={14} /> : <FiArrowUp size={14} />}
                    <span
                      style={{ cursor: pendingRequests.length > 0 ? 'pointer' : 'default', textDecoration: pendingRequests.length > 0 ? 'underline' : 'none' }}
                      onClick={() => pendingRequests.length > 0 && setActiveTab('requests')}
                    >
                      {pendingRequests.length > 0 ? 'Needs Action' : 'All clear'}
                    </span>
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

              {/* Recent Activity Table */}
              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Recent Login/Logout Activity</h2>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Federated ID</th>
                      <th>Action</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitiesList.slice(0, 5).map(activity => (
                      <tr key={activity._id}>
                        <td>{activity.username}</td>
                        <td>{activity.federatedId}</td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: activity.action === 'LOGIN' ? '#d1fae5' : '#fee2e2', color: activity.action === 'LOGIN' ? '#065f46' : '#991b1b' }}>
                            {activity.action}
                          </span>
                        </td>
                        <td>{formatTimeAgo(activity.createdAt)}</td>
                      </tr>
                    ))}
                    {activitiesList.length === 0 && <tr><td colSpan="4">No recent activity.</td></tr>}
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
                          <button className="action-btn-sm" style={{ marginLeft: '5px', color: 'green', borderColor: 'green' }} onClick={() => openReportDetail(report)}>Resolve</button>
                        </td>
                      </tr>
                    ))}
                    {reportsList.length === 0 && <tr><td colSpan="5">No reports found.</td></tr>}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {/* ===== USERS TAB ===== */}
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
                        <span className="status-badge" style={{ backgroundColor: user.role === 'admin' ? '#dbeafe' : '#d1fae5', color: user.role === 'admin' ? '#1e40af' : '#065f46' }}>
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

          {/* ===== CHANNELS TAB ===== */}
          {activeTab === 'channels' && (
            <div className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Channels</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="primary-btn" onClick={() => setCreateModalOpen(true)}>Create New Channel</button>
                  <button
                    className="action-btn-sm"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const config = { headers: { Authorization: `Bearer ${token}` } };
                        const samples = [
                          { name: 'announcements', description: 'Company-wide announcements and notices', rules: ['Be respectful', 'No spam'], visibility: 'read-only', image: '' },
                          { name: 'press', description: 'Press releases and media statements', rules: ['Official content only'], visibility: 'read-only', image: '' },
                          { name: 'hr', description: 'HR policies and internal updates', rules: ['Internal use'], visibility: 'private', image: '' },
                          { name: 'finance', description: 'Finance planning and budget reviews', rules: ['Confidential'], visibility: 'private', image: '' }
                        ];
                        for (const ch of samples) {
                          try {
                            await axios.post(`${API_BASE_URL}/channels`, ch, config);
                          } catch {
                            console.warn('Failed to seed a sample channel');
                          }
                        }
                        const refreshed = await axios.get(`${API_BASE_URL}/channels`, config);
                        setChannelsList(refreshed.data.channels || []);
                        alert('Sample channels seeded.');
                      } catch {
                        alert('Failed to seed channels.');
                      }
                    }}
                  >
                    Seed Sample Channels
                  </button>
                </div>
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

          {/* ===== REQUESTS TAB ===== */}
          {activeTab === 'requests' && (
            <div className="admin-section">
              <div className="admin-header">
                <h1 className="page-title">Channel Access Requests</h1>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {pendingRequests.length} pending
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <FiLock size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <p style={{ fontSize: '16px', fontWeight: '600' }}>No pending requests</p>
                  <p style={{ fontSize: '14px', marginTop: '4px' }}>Access requests for private channels will appear here.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>User</th>
                      <th>Federated ID</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(req => (
                      <tr key={req._id}>
                        <td>
                          <span style={{ fontWeight: '600', color: '#6366f1' }}>#{req.channelName}</span>
                          <span style={{ marginLeft: '6px', fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '999px' }}>private</span>
                        </td>
                        <td style={{ fontWeight: '500' }}>{req.userDisplayName}</td>
                        <td style={{ fontSize: '13px', color: '#6b7280' }}>{req.userFederatedId}</td>
                        <td>{formatTimeAgo(req.createdAt)}</td>
                        <td>
                          <button
                            className="action-btn-sm"
                            style={{ color: '#10b981', borderColor: '#10b981', marginRight: '8px' }}
                            onClick={() => handleResolveRequest(req.channelName, req.userFederatedId, 'approve')}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="action-btn-sm"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => handleResolveRequest(req.channelName, req.userFederatedId, 'reject')}
                          >
                            ✕ Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ===== REPORTS TAB ===== */}
          {activeTab === 'reports' && (
            <section className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">All Reports</h2>
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
                            <button className="action-btn-sm" style={{ marginLeft: '5px', color: 'green', borderColor: 'green' }} onClick={() => openReportDetail(report)}>Resolve</button>
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

          {/* ===== SERVER TAB ===== */}
          {activeTab === 'server' && (
            <>
              <div className="admin-header">
                <h1 className="page-title">Server Management</h1>
              </div>

              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Local Server Identity (This Node)</h2>
                </div>
                <div className="server-info-content">
                  <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Server Name</h3>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiServer size={24} />
                    <span>{(() => {
                      try {
                        const user = JSON.parse(localStorage.getItem('user'));
                        return user?.serverName || 'Unknown Server';
                      } catch {
                        return 'Unknown Server';
                      }
                    })()}</span>
                  </div>
                </div>
              </section>

              <section className="admin-section">
                <div className="section-header">
                  <h2 className="section-h2">Remote / Connected Servers</h2>
                  <button className="primary-btn" onClick={() => setServerModalOpen(true)}>Add New Server</button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>URL</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serversList.map(server => (
                      <tr key={server._id}>
                        <td><strong>{server.name}</strong></td>
                        <td>{server.url}</td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                            {server.category}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {server.description}
                        </td>
                        <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button className="action-btn-sm" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => handleDeleteServer(server._id)}>
                            <FiTrash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {serversList.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                          No remote servers connected. Add one to enable federation!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#374151', fontSize: '16px' }}>Network Federation</h3>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Toggle entire network federation dynamically</p>
                  </div>
                  <button
                    className="primary-btn"
                    onClick={handleGlobalFederationToggle}
                    style={{
                      backgroundColor: globalFederationEnabled ? '#10b981' : '#ef4444',
                      minWidth: '150px',
                      display: 'flex',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    {globalFederationEnabled ? 'FEDERATION: ON' : 'FEDERATION: OFF'}
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ===== BLOCKED / SUSPENDED ACCOUNTS TAB ===== */}
          {(activeTab === 'blocked' || activeTab === 'security') && (
            <div className="admin-section">
              <div className="section-header">
                <h2 className="section-h2">Suspended Accounts</h2>
                <button className="action-btn-sm" onClick={fetchSuspendedUsers}>Refresh</button>
              </div>
              {suspendedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <FiSlash size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <p style={{ fontSize: '16px', fontWeight: '600' }}>No suspended accounts</p>
                  <p style={{ fontSize: '14px', marginTop: '4px' }}>Suspended users will appear here.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>Display Name</th>
                      <th>Federated ID</th>
                      <th>Email</th>
                      <th>Suspended Since</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspendedUsers.map(user => (
                      <tr key={user._id || user.federatedId}>
                        <td>
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FiUser size={16} color="#ef4444" />
                            </div>
                          )}
                        </td>
                        <td>{user.displayName}</td>
                        <td style={{ fontSize: '13px', color: '#6b7280' }}>{user.federatedId}</td>
                        <td>{user.email || 'N/A'}</td>
                        <td>{formatTimeAgo(user.updatedAt)}</td>
                        <td>
                          <button
                            className="action-btn-sm"
                            style={{ color: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleUnsuspend(user.federatedId)}
                          >
                            <FiCheckCircle size={14} style={{ marginRight: '4px' }} /> Unsuspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
              <div className="form-group">
                <label>Channel Image</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditChannelImageChange}
                    style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  {editFormData.image && (
                    <div style={{ position: 'relative', width: '200px', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img
                        src={editFormData.image}
                        alt="Channel Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setEditFormData(prev => ({ ...prev, image: '' }))}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
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
                  <option value="read-only">Read-only</option>
                </select>
              </div>
              <div className="form-group">
                <label>Channel Image</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleChannelImageChange}
                    style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  {createFormData.image && (
                    <div style={{ position: 'relative', width: '200px', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img
                        src={createFormData.image}
                        alt="Channel Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setCreateFormData(prev => ({ ...prev, image: '' }))}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="action-btn-sm" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Create Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCropper && tempImageSrc && (
        <ImageCropperModal
          imageSrc={tempImageSrc}
          aspect={2 / 1}
          onComplete={handleCropperComplete}
          onCancel={() => {
            setShowCropper(false);
            setTempImageSrc(null);
            setCropperTarget(null);
          }}
        />
      )}

      {/* Add Server Modal */}
      {serverModalOpen && (
        <div className="modal-overlay" onClick={() => setServerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Server</h2>
            <form onSubmit={handleAddServer}>
              <div className="form-group">
                <label>Server Name *</label>
                <input
                  type="text"
                  value={serverFormData.name}
                  onChange={(e) => setServerFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Food Server, Sports Hub"
                  required
                />
              </div>
              <div className="form-group">
                <label>Server URL *</label>
                <input
                  type="text"
                  value={serverFormData.url}
                  onChange={(e) => setServerFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com or http://localhost:5001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={serverFormData.category}
                  onChange={(e) => setServerFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="general, sports, food, etc."
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={serverFormData.description}
                  onChange={(e) => setServerFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell us about this server..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="action-btn-sm" onClick={() => setServerModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" style={{ backgroundColor: '#5865f2' }}>Add Server</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {reportDetailOpen && selectedReport && (
        <div className="modal-overlay" onClick={() => setReportDetailOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiAlertTriangle color="#f59e0b" />
                Report Details
              </h2>
              <button onClick={() => setReportDetailOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <FiX size={20} />
              </button>
            </div>

            {/* Report Info */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Type</span>
                  <p style={{ margin: '4px 0 0', fontWeight: '600', color: selectedReport.targetType === 'post' ? '#7c3aed' : '#dc2626' }}>
                    {selectedReport.targetType === 'post' ? 'Post Report' : 'User Report'}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Reason</span>
                  <p style={{ margin: '4px 0 0', fontWeight: '500' }}>{selectedReport.reason?.replace('_', ' ')}</p>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Reported By</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{selectedReport.reporterId}</p>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Date</span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{formatTimeAgo(selectedReport.createdAt)}</p>
                </div>
              </div>
              {selectedReport.description && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Description</span>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#334155' }}>{selectedReport.description}</p>
                </div>
              )}
            </div>

            {/* Target Content */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>
                {selectedReport.targetType === 'post' ? 'Reported Post' : 'Reported User'}
              </h3>

              {reportLoading ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Loading...</p>
              ) : !reportTargetData ? (
                <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>
                  {selectedReport.targetType === 'post' ? 'Post not found or already deleted.' : 'User not found.'}
                </p>
              ) : selectedReport.targetType === 'post' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiUser size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{reportTargetData.userDisplayName || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{reportTargetData.authorFederatedId || reportTargetData.federatedId}</div>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '12px', fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                    {reportTargetData.description || reportTargetData.content || 'No content'}
                  </div>
                  {reportTargetData.isChannelPost && reportTargetData.channelName && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6366f1' }}>
                      Posted in #{reportTargetData.channelName}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                    Posted {formatTimeAgo(reportTargetData.createdAt)}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {reportTargetData.avatarUrl ? (
                        <img src={reportTargetData.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <FiUser size={20} color="#ef4444" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>{reportTargetData.displayName}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{reportTargetData.federatedId}</div>
                      {reportTargetData.email && <div style={{ fontSize: '13px', color: '#9ca3af' }}>{reportTargetData.email}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="action-btn-sm"
                onClick={handleDismissReport}
                style={{ padding: '10px 20px' }}
              >
                Dismiss Report
              </button>
              {selectedReport.targetType === 'post' && reportTargetData && (
                <button
                  className="primary-btn"
                  onClick={handleResolvePost}
                  style={{ backgroundColor: '#ef4444', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiTrash2 size={14} /> Remove Post
                </button>
              )}
              {selectedReport.targetType === 'user' && reportTargetData && (
                <button
                  className="primary-btn"
                  onClick={handleSuspendUser}
                  style={{ backgroundColor: '#ef4444', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiSlash size={14} /> Suspend Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;