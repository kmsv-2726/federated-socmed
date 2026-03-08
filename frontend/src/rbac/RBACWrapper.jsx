import React, { useState, useEffect } from 'react';
import { canPostInChannel, canViewChannelContent, ROLES } from '../utils/rbac';

/**
 * A wrapper component that conditionally renders its children based on permissions.
 */
export const PermissionGuard = ({ 
  children, 
  permission, 
  fallback = null,
  channel = null,
  isFollowing = false
}) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  let hasPermission = false;

  switch (permission) {
    case 'post':
      hasPermission = canPostInChannel(user, channel, isFollowing);
      break;
    case 'view':
      hasPermission = canViewChannelContent(user, channel, isFollowing);
      break;
    case 'admin':
      hasPermission = user?.role === ROLES.ADMIN;
      break;
    default:
      hasPermission = false;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Custom hook for permission checks
 */
export const usePermissions = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  return {
    user,
    role: user?.role || ROLES.USER,
    isAdmin: user?.role === ROLES.ADMIN,
    isModerator: user?.role === ROLES.MODERATOR,
    canPost: (channel, isFollowing) => canPostInChannel(user, channel, isFollowing),
    canView: (channel, isFollowing) => canViewChannelContent(user, channel, isFollowing),
  };
};
