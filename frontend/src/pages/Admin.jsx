import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: 12459,
    posts: 1847,
    reports: 23,
    engagement: 68
  });

  // Simulate real-time updates as per user code
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update active reports (+1 or -1)
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
                    <span>12% from last month</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>📝</span>
                    <span>Posts Today</span>
                  </div>
                  <div className="stat-value">{stats.posts.toLocaleString()}</div>
                  <div className="stat-trend trend-up">
                    <span>↑</span>
                    <span>8% from yesterday</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span>💬</span>
                    <span>Active Reports</span>
                  </div>
                  <div className="stat-value">{stats.reports}</div>
                  <div className="stat-trend trend-down">
                    <span>↓</span>
                    <span>15% from last week</span>
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
                <button className="primary-btn">Create New Channel</button>
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
                  <tr>
                    <td>#general</td>
                    <td>Public</td>
                    <td>12,459</td>
                    <td>Jan 12, 2023</td>
                    <td><span className="status-badge status-active">Active</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="action-btn-sm">Edit</button>
                        <button className="action-btn-sm" style={{ color: '#ef4444', borderColor: '#fee2e2' }}>Archive</button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>#announcements</td>
                    <td>Public (ReadOnly)</td>
                    <td>12,459</td>
                    <td>Jan 12, 2023</td>
                    <td><span className="status-badge status-active">Active</span></td>
                    <td><button className="action-btn-sm">Edit</button></td>
                  </tr>
                  <tr>
                    <td>#dev-team</td>
                    <td>Private</td>
                    <td>45</td>
                    <td>Feb 05, 2023</td>
                    <td><span className="status-badge status-active">Active</span></td>
                    <td><button className="action-btn-sm">Edit</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* New Queue Tab Content - Reusing the Moderation Queue table logic */}
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

        </main>
      </div>
    </div>
  );
};

export default Admin;
