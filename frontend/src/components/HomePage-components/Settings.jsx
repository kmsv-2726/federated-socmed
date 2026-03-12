import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import {
  FiUser,
  FiMail,
  FiLock,
  FiCalendar,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiSave,
  FiAlertTriangle
} from 'react-icons/fi';
import ImageCropperModal from '../ImageCropperModal';
import axios from 'axios';
import '../../styles/Settings.css';

import { getApiBaseUrl } from '../../config/api';

const API_BASE_URL = getApiBaseUrl();

function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);

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
    displayName: user?.displayName || '',
    email: user?.email || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    bannerUrl: user?.bannerUrl || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // clear message when user starts editing
    setMessage({ text: '', type: '' });
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showMsg('Image is too large. Max 10MB allowed.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageSrc(reader.result);
      setShowCropper(true);
      e.target.value = null; // reset input
    };
    reader.readAsDataURL(file);
  };

  const handleCropperComplete = (croppedImageBase64) => {
    setFormData(prev => ({ ...prev, bannerUrl: croppedImageBase64 }));
    setShowCropper(false);
    setTempImageSrc(null);
  };

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email,
          dob: formData.dob,
          bannerUrl: formData.bannerUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        // update localStorage with new user data
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showMsg('Profile updated successfully!');
      } else {
        showMsg(data.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      showMsg('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      showMsg('Passwords do not match!', 'error');
      return;
    }
    if (formData.newPassword.length < 8) {
      showMsg('Password must be at least 8 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        showMsg('Password changed successfully!');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        showMsg(data.message || 'Failed to change password', 'error');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      showMsg('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/user/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
      } else {
        showMsg(data.message || 'Failed to delete account', 'error');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      showMsg('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
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

        {message.text && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}

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
          </div>


          {activeTab === 'account' && (
            <div className="settings-panel">
              <div className="settings-section">
                <h2>Profile Information</h2>

                <div className="form-group">
                  <label>
                    <FiUser className="label-icon" />
                    Display Name
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter display name"
                  />
                  <small>This is shown on your posts and profile</small>
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

                <div className="form-group">
                  <label>Profile Banner</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', background: 'white' }}
                    />
                    {formData.bannerUrl && (
                      <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                        <img
                          src={formData.bannerUrl}
                          alt="Banner Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, bannerUrl: '' }))}
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
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

                <button className="btn-primary" onClick={handleSavePassword} disabled={saving}>
                  <FiSave /> {saving ? 'Updating...' : 'Update Password'}
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
                disabled={saving}
                onClick={() => {
                  const input = document.getElementById('deleteConfirm');
                  if (input.value === 'DELETE') {
                    handleDeleteAccount();
                  } else {
                    alert('Please type DELETE to confirm');
                  }
                }}
              >
                <FiTrash2 /> {saving ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropper && tempImageSrc && (
        <ImageCropperModal
          imageSrc={tempImageSrc}
          aspect={3 / 1}
          onComplete={handleCropperComplete}
          onCancel={() => {
            setShowCropper(false);
            setTempImageSrc(null);
          }}
        />
      )}
    </Layout>
  );
}

export default Settings;
