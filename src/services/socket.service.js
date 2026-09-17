import { io } from 'socket.io-client';
import { getServerBaseUrl } from '../utils/url.util';

let socket = null;

/**
 * Get active auth token based on current portal path or stored token
 */
export const getActiveAuthToken = () => {
  if (typeof window === 'undefined') return null;
  const currentPath = window.location.pathname || '';

  if (currentPath.startsWith('/parent')) {
    return localStorage.getItem('parent_token');
  }
  if (currentPath.startsWith('/teacher')) {
    return localStorage.getItem('teacher_token');
  }
  if (currentPath.startsWith('/student')) {
    return localStorage.getItem('student_token');
  }
  return (
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('teacher_token') ||
    localStorage.getItem('parent_token') ||
    localStorage.getItem('student_token')
  );
};

/**
 * Initialize and connect Socket.IO client
 */
export const connectSocket = () => {
  const token = getActiveAuthToken();
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  // If socket exists but disconnected, reconnect
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const serverUrl = getServerBaseUrl();

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });

  socket.on('connect', () => {
    // Connected to server
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket Connection Warning]:', error.message);
  });

  return socket;
};

/**
 * Get the current socket instance
 */
export const getSocket = () => {
  if (!socket || !socket.connected) {
    return connectSocket();
  }
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Send real-time message via socket with fallback callback
 */
export const emitSendMessage = (payload, callback) => {
  const s = getSocket();
  if (s && s.connected) {
    let responded = false;
    const timer = setTimeout(() => {
      if (!responded) {
        responded = true;
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Socket response timed out after 5 seconds' });
        }
      }
    }, 5000);

    try {
      s.emit('send_message', payload, (response) => {
        if (!responded) {
          responded = true;
          clearTimeout(timer);
          if (typeof callback === 'function') {
            callback(response);
          }
        }
      });
    } catch (err) {
      if (!responded) {
        responded = true;
        clearTimeout(timer);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    }
  } else if (typeof callback === 'function') {
    callback({ success: false, error: 'Socket not connected' });
  }
};

/**
 * Emit typing status
 */
export const emitTyping = (receiverId, receiverRole) => {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('typing', { receiverId, receiverRole });
  }
};

/**
 * Emit stop typing status
 */
export const emitStopTyping = (receiverId, receiverRole) => {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('stop_typing', { receiverId, receiverRole });
  }
};

/**
 * Emit mark as read
 */
export const emitMarkRead = (senderId, senderRole, callback) => {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('mark_read', { senderId, senderRole }, callback);
  } else if (typeof callback === 'function') {
    callback({ success: false });
  }
};
