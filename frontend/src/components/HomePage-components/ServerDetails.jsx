import React from 'react';
import Layout from '../Layout';
import {
  FiServer,
  FiInfo,
  FiUser,
  FiShield,
  FiAlertCircle
} from 'react-icons/fi';
import '../../styles/ServerDetails.css';

function ServerDetails() {
  const server = {
    name: 'Food Community Server',
    description:
      'A vibrant community for food lovers! Share recipes, restaurant reviews, cooking tips, and culinary adventures. Connect with fellow foodies from around the world.',
    admin: 'Nutzz',
    rules: [
      'Be respectful and supportive of all cooking skill levels.',
      'Share original recipes and give credit when using others.',
      'No spam or promotional content without approval.',
      'Keep discussions food-related and family-friendly.',
      'Constructive criticism only - no food shaming!',
      'Tag posts with dietary info (vegan, gluten-free, etc.) when applicable.'
    ]
  };

  return (
    <Layout>
      <div className="server-container">
        <div className="server-header">
          <h1>
            <FiServer /> Server Details
          </h1>
          <p>Information and rules for this server</p>
        </div>

        <div className="server-card">
          <div className="server-section">
            <h2>
              <FiInfo /> Server Information
            </h2>
            <div className="server-info">
              <p>
                <strong>Name:</strong> {server.name}
              </p>
              <p>
                <strong>Description:</strong> {server.description}
              </p>
            </div>
          </div>

          <div className="server-section">
            <h2>
              <FiUser /> Administrator
            </h2>
            <p>{server.admin}</p>
          </div>

          <div className="server-section">
            <h2>
              <FiShield /> Server Rules
            </h2>
            <ul className="rules-list">
              {server.rules.map((rule, index) => (
                <li key={index}>
                  <FiAlertCircle /> {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ServerDetails;