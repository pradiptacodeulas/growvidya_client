import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchUnreadSummaryThunk,
  addIncomingMessage,
  markConversationRead,
} from '../store/slices/messageNotificationSlice';
import { getSocket, getActiveAuthToken } from '../services/socket.service';
import {
  registerServiceWorker,
  subscribeToWebPush,
  getNotificationPermission,
} from '../services/webPush.service';
import { playNotificationChime } from '../utils/notificationAudio';

/**
 * Custom hook to keep global unread message counts & notifications
 * synchronized via Socket.IO and REST API across all portals.
 */
export const useMessageNotificationSync = () => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = getActiveAuthToken();
    const currentPath = typeof window !== 'undefined' ? window.location.pathname || '' : '';
    const isAdminPath = currentPath.startsWith('/admin');

    if (!token && !isAdminPath) return;

    // Background registration of Service Worker and Web Push Sync
    try {
      if (getNotificationPermission() === 'granted') {
        subscribeToWebPush(false).catch(() => {});
      } else {
        registerServiceWorker().catch(() => {});
      }
    } catch (_) {}

    // Listen for Web Push notifications forwarded by sw.js (e.g. Support Ticket updates)
    const handleSwPushMessage = (event) => {
      if (event.data?.type === 'GROWVIDYA_PUSH_RECEIVED') {
        const payload = event.data.payload || {};
        const category = payload.data?.category || payload.data?.type;
        if (category === 'support_ticket') {
          playNotificationChime();
          const msg = payload.body
            ? `${payload.title || 'Support Update'}: ${payload.body}`
            : payload.title || 'New Support Ticket Update';
          toast.info(msg);
        }
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwPushMessage);
    }

    // 1. Fetch initial unread count & unread conversations summary
    dispatch(fetchUnreadSummaryThunk());

    // 2. Initialize or retrieve persistent socket connection
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket) {
      return () => {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', handleSwPushMessage);
        }
      };
    }

    // 3. Socket event handler for incoming messages
    const handleReceiveMessage = (incomingMsg) => {
      if (!incomingMsg) return;

      const activeChat = window.__GROWVIDYA_ACTIVE_CHAT__;
      const senderId = Number(incomingMsg.sender);
      const senderRole = String(incomingMsg.sender_role || '').toLowerCase();

      // If the user currently has this exact conversation open, don't increment unread count
      if (
        activeChat &&
        Number(activeChat.id) === senderId &&
        String(activeChat.role).toLowerCase() === senderRole
      ) {
        return;
      }

      // Add to global unread state
      dispatch(addIncomingMessage(incomingMsg));

      // Play soft audio chime
      playNotificationChime();

      // Dispatch window event in case other listeners want to respond
      try {
        window.dispatchEvent(
          new CustomEvent('new_chat_message_received', { detail: incomingMsg })
        );
      } catch {
        // window dispatch error fallback
      }
    };

    // 4. Socket event handler for multi-tab unread count sync
    const handleUnreadCountUpdated = (data) => {
      if (data?.senderId && data?.senderRole) {
        dispatch(
          markConversationRead({
            senderId: data.senderId,
            senderRole: data.senderRole,
          })
        );
      } else {
        dispatch(fetchUnreadSummaryThunk());
      }
    };

    // 5. Window event listener when current tab's ChatBox marks a conversation as read
    const handleLocalMessagesRead = (event) => {
      const { senderId, senderRole } = event.detail || {};
      if (senderId && senderRole) {
        dispatch(markConversationRead({ senderId, senderRole }));
      } else {
        dispatch(fetchUnreadSummaryThunk());
      }
    };

    // 6. Socket event handler for real-time notice / announcement broadcast
    const handleNewNotice = (notice) => {
      if (!notice) return;
      playNotificationChime();

      try {
        window.dispatchEvent(
          new CustomEvent('growvidya:new_notice', { detail: notice })
        );
      } catch (_) {}
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('unread_count_updated', handleUnreadCountUpdated);
    socket.on('new_notice', handleNewNotice);
    window.addEventListener('chat_messages_marked_read', handleLocalMessagesRead);

    return () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwPushMessage);
      }
      socket.off('receive_message', handleReceiveMessage);
      socket.off('unread_count_updated', handleUnreadCountUpdated);
      socket.off('new_notice', handleNewNotice);
      window.removeEventListener('chat_messages_marked_read', handleLocalMessagesRead);
    };
  }, [dispatch]);
};

export default useMessageNotificationSync;
