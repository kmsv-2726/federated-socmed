import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiCalendar,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiLogOut,
  FiShield,
  FiGlobe,
  FiSave,
  FiAlertTriangle
} from 'react-icons/fi';
import '../../styles/Settings.css';

function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getUserData = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user);
      } catch {
        return null;
      }
    }
    return null;
  };

  const user = getUserData();

  const [formData, setFormData] = useState({
    username: user?.displayName || '',
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    dob: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [visibility, setVisibility] = useState({
    profile: 'public',
    posts: 'public',
    email: 'friends',
    phone: 'private'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVisibilityChange = (field, value) => {
    setVisibility(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = () => {
    console.log('Saving profile:', formData);
    // API call would go here
    alert('Profile updated successfully!');
  };

  const handleSavePassword = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    console.log('Changing password');
    // API call would go here
    alert('Password changed successfully!');
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  const handleSavePrivacy = () => {
    console.log('Saving privacy settings:', visibility);
    // API call would go here
    alert('Privacy settings updated!');
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account');
    // API call would go here
    alert('Account deletion initiated. You will receive a confirmation email.');
    setShowDeleteModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <Layout>
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        <div className="settings-content">
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <FiUser /> Account
            </button>
            <button
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FiLock /> Security
            </button>
            <button
              className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <FiShield /> Privacy
            </button>
          </div>


          {activeTab === 'account' && (
            <div className="settings-panel">
              <div className="settings-section">
                <h2>Profile Information</h2>

                <div className="form-group">
                  <label>
                    <FiUser className="label-icon" />
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                  />
                  <small>This is your unique identifier on the platform</small>
                </div>

                <div className="form-group">
                  <label>
                    <FiUser className="label-icon" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiMail className="label-icon" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <FiCalendar className="label-icon" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                  />
                </div>

                <button className="btn-primary" onClick={handleSaveProfile}>
                  <FiSave /> Save Changes
                </button>
              </div>
            </div>
          )}


          {activeTab === 'security' && (
            <div className="settings-panel">
              <div className="settings-section">
                <h2>Change Password</h2>

                <div className="form-group">
                  <label>
                    <FiLock className="label-icon" />
                    Current Password
                  </label>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <FiLock className="label-icon" />
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                  />
                  <small>Must be at least 8 characters long</small>
                </div>

                <div className="form-group">
                  <label>
                    <FiLock className="label-icon" />
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                  />
                </div>

                <button className="btn-primary" onClick={handleSavePassword}>
                  <FiSave /> Update Password
                </button>
              </div>

              <div className="settings-section danger-zone">
                <h2>Session Management</h2>
                <button className="btn-secondary" onClick={handleLogout}>
                  <FiLogOut /> Logout
                </button>
                <small>Sign out of your account on this device</small>
              </div>
            </div>
          )}


          {activeTab === 'privacy' && (
            <div className="settings-panel">
              <div className="settings-section">
                <h2>Visibility Settings</h2>
                <p className="section-description">
                  Control who can see your information and content
                </p>

                <div className="visibility-group">
                  <label>
                    <FiGlobe className="label-icon" />
                    Profile Visibility
                  </label>
                  <select
                    value={visibility.profile}
                    onChange={(e) => handleVisibilityChange('profile', e.target.value)}
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private - Only me</option>
                  </select>
                </div>

                <div className="visibility-group">
                  <label>
                    <FiGlobe className="label-icon" />
                    Post Visibility
                  </label>
                  <select
                    value={visibility.posts}
                    onChange={(e) => handleVisibilityChange('posts', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="visibility-group">
                  <label>
                    <FiMail className="label-icon" />
                    Email Visibility
                  </label>
                  <select
                    value={visibility.email}
                    onChange={(e) => handleVisibilityChange('email', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="visibility-group">
                  <label>
                    <FiPhone className="label-icon" />
                    Phone Visibility
                  </label>
                  <select
                    value={visibility.phone}
                    onChange={(e) => handleVisibilityChange('phone', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <button className="btn-primary" onClick={handleSavePrivacy}>
                  <FiSave /> Save Privacy Settings
                </button>
              </div>

              <div className="settings-section danger-zone">
                <h2>Danger Zone</h2>
                <p className="danger-text">
                  <FiAlertTriangle /> Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  className="btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <FiTrash2 /> Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Account</h3>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <FiAlertTriangle className="warning-icon" />
                <p>
                  Are you absolutely sure you want to delete your account? This action cannot be undone.
                  All your posts, comments, and data will be permanently deleted.
                </p>
              </div>
              <p>Type <strong>DELETE</strong> to confirm:</p>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                className="confirm-input"
                id="deleteConfirm"
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  const input = document.getElementById('deleteConfirm');
                  if (input.value === 'DELETE') {
                    handleDeleteAccount();
                  } else {
                    alert('Please type DELETE to confirm');
                  }
                }}
              >
                <FiTrash2 /> Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Settings;