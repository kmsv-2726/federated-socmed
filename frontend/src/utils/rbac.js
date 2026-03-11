/**
 * RBAC (Role-Based Access Control) utility for the Federated Social Platform.
 * 
 * Roles:
 * - 'admin': Full access to all server and channel functions.
 * - 'user': Standard user permissions, scoped by channel visibility and membership.
 * 
 * Channel Visibilities:
 * - 'public': Open to everyone for reading. Posting might be restricted to members or open to all.
 * - 'read-only': Only admins (and potentially moderators) can post.
 * - 'private': Only members can read or post.
 */

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator', // Placeholder for future use
};

export const VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  READ_ONLY: 'read-only',
};

/**
 * Checks if a user has permission to post in a channel.
 * 
 * @param {Object} user - The current user object.
 * @param {Object} channel - The current channel object.
 * @param {boolean} isFollowing - Whether the user is a member/follower of the channel.
 * @returns {boolean} - True if allowed to post, false otherwise.
 */
export const canPostInChannel = (user, channel, isFollowing) => {
  if (!user) return false;
  if (!channel) return false;

  const role = user.role || ROLES.USER;

  // Admins can post anywhere
  if (role === ROLES.ADMIN) return true;

  // For regular users, check channel visibility and membership
  switch (channel.visibility) {
    case VISIBILITY.PUBLIC:
      // In a public channel, either anyone can post or only followers can post.
      // Based on common patterns, often anyone can post in "public" channels
      // unless it's explicitly "read-only".
      return true;

    case VISIBILITY.READ_ONLY:
      // Only admins can post in read-only channels (checked above)
      return false;

    case VISIBILITY.PRIVATE:
      // Only people who have been accepted (isFollowing) can post in private channels
      // Note: isFollowing should imply an 'active' status from the backend
      return isFollowing;

    default:
      return false;
  }
};

/**
 * Checks if a user has permission to view posts in a channel.
 */
export const canViewChannelContent = (user, channel, isFollowing) => {
  if (!channel) return false;
  
  const role = user?.role || ROLES.USER;
  
  // Admins can see everything
  if (role === ROLES.ADMIN) return true;

  if (channel.visibility === VISIBILITY.PRIVATE) {
    return isFollowing;
  }

  return true; // Public and Read-only are visible to everyone
};
