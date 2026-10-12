import { apiFetch } from './fetch.config';
import { getApiBaseUrl } from '../utils/url.util';

/**
 * Message REST API Client
 */

export const fetchContactsApi = async () => {
  return apiFetch('/messages/contacts', { method: 'GET' });
};

export const fetchConversationApi = async (contactRole, contactId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const endpoint = `/messages/conversation/${contactRole}/${contactId}${query ? `?${query}` : ''}`;
  return apiFetch(endpoint, { method: 'GET' });
};

export const sendMessageApi = async (data) => {
  return apiFetch('/messages/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const markMessagesAsReadApi = async (senderId, senderRole) => {
  return apiFetch('/messages/read', {
    method: 'POST',
    body: JSON.stringify({ senderId, senderRole }),
  });
};

export const fetchUnreadCountApi = async () => {
  return apiFetch('/messages/unread-count', { method: 'GET' });
};

/**
 * Upload chat attachment (image/document)
 */
export const uploadChatAttachmentApi = async (file) => {
  let token = null;
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname || '';
    if (currentPath.startsWith('/parent')) {
      token = localStorage.getItem('parent_token');
    } else if (currentPath.startsWith('/teacher')) {
      token = localStorage.getItem('teacher_token');
    } else if (currentPath.startsWith('/student')) {
      token = localStorage.getItem('student_token');
    } else {
      token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    }
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'messages');

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/messages/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'File upload failed');
  }
  return data;
};

/**
 * Delete a message
 */
export const deleteMessageApi = async (messageId) => {
  return apiFetch(`/messages/${messageId}`, {
    method: 'DELETE',
  });
};

