import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import axios from 'axios';
import {
  FiServer,
  FiInfo,
  FiUser,
  FiShield,
  FiAlertCircle
} from 'react-icons/fi';
import '../../styles/ServerDetails.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api");

function ServerDetails() {
  const [serverConfig, setServerConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/server-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.config) {
          setServerConfig(response.data.config);
        }
      } catch (error) {
        console.error('Error fetching server config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const adminName = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.isAdmin ? user.username : 'Server Administrator';
    } catch {
      return 'Server Administrator';
    }
  })();

  const fallbackServerName = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.serverName || 'Unknown Server';
    } catch {
      return 'Unknown Server';
    }
  })();

  const rulesList = serverConfig?.rules 
    ? serverConfig.rules.split('\n').filter(r => r.trim() !== '')
    : [];

  return (
    <Layout>
      <div className="server-container">
        <div className="server-header">
          <h1>
            <FiServer /> Server Details
          </h1>
          <p>Information and rules for this server</p>
        </div>

        {loading ? (
          <div className="server-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading server details...</div>
        ) : (
          <div className="server-card">
            <div className="server-section">
              <h2>
                <FiInfo /> Server Information
              </h2>
              <div className="server-info">
                <p>
                  <strong>Name:</strong> {serverConfig?.serverName || fallbackServerName}
                </p>
                <div style={{ marginTop: '10px' }}>
                  <strong>Description:</strong> 
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: '5px' }}>{serverConfig?.description || 'No description provided.'}</p>
                </div>
              </div>
            </div>

            <div className="server-section">
              <h2>
                <FiUser /> Administrator
              </h2>
              <p>{adminName}</p>
            </div>

            <div className="server-section">
              <h2>
                <FiShield /> Server Rules
              </h2>
              {rulesList.length > 0 ? (
                <ul className="rules-list">
                  {rulesList.map((rule, index) => (
                    <li key={index}>
                      <FiAlertCircle /> {rule}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#6b7280', fontStyle: 'italic', marginTop: '10px' }}>No specific rules provided.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ServerDetails;