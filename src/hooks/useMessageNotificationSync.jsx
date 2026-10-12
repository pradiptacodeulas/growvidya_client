import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import { toast } from '../utils/customToast';
import { playNotificationChime } from '../utils/notificationAudio';

/**
 * Custom hook to keep global unread message counts & notifications
 * synchronized via Socket.IO and REST API across all portals.
 */
export const useMessageNotificationSync = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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

    // 1. Fetch initial unread count & unread conversations summary
    dispatch(fetchUnreadSummaryThunk());

    // 2. Initialize or retrieve persistent socket connection
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket) return;

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

      // Show interactive in-app toast notification
      const senderName =
        incomingMsg.sender_name ||
        (senderRole ? senderRole.charAt(0).toUpperCase() + senderRole.slice(1) : 'New Message');
      const rawText = incomingMsg.message || (incomingMsg.file ? '📎 Sent an attachment' : 'Sent you a message');
      const previewText = rawText.length > 70 ? rawText.substring(0, 67) + '...' : rawText;

      toast.info(
        <div
          style={{ cursor: 'pointer', minWidth: '220px' }}
          onClick={() => {
            const currentPath = window.location.pathname || '';
            let basePath = '/admin/message';
            if (currentPath.startsWith('/teacher')) basePath = '/teacher/messages';
            else if (currentPath.startsWith('/student')) basePath = '/student/messages';
            else if (currentPath.startsWith('/parent')) basePath = '/parent/messages';
            navigate(`${basePath}?contactId=${senderId}&contactRole=${senderRole}`);
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
            <span className="fw-bold fs-13 text-dark text-truncate">{senderName}</span>
            <span className="badge bg-primary text-white fs-10 text-capitalize flex-shrink-0">
              {senderRole}
            </span>
          </div>
          <div className="fs-12 text-muted text-truncate" style={{ maxWidth: '240px' }}>
            {previewText}
          </div>
        </div>,
        {
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        }
      );

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

      toast.info(
        <div
          style={{ cursor: 'pointer', minWidth: '220px' }}
          onClick={() => {
            const currentPath = window.location.pathname || '';
            let targetPath = '/admin/announcement/notice';
            if (currentPath.startsWith('/teacher')) targetPath = '/teacher/announcements/notices';
            else if (currentPath.startsWith('/student')) targetPath = '/student/notices';
            else if (currentPath.startsWith('/parent')) targetPath = '/parent/notices';
            navigate(targetPath);
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
            <span className="fw-bold fs-13 text-dark text-truncate">
              📢 {notice.title || 'New Notice'}
            </span>
            <span className="badge bg-warning text-dark fs-10 flex-shrink-0">
              Notice
            </span>
          </div>
          <div className="fs-12 text-muted text-truncate" style={{ maxWidth: '240px' }}>
            Click to view notice details
          </div>
        </div>,
        {
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        }
      );

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
      socket.off('receive_message', handleReceiveMessage);
      socket.off('unread_count_updated', handleUnreadCountUpdated);
      socket.off('new_notice', handleNewNotice);
      window.removeEventListener('chat_messages_marked_read', handleLocalMessagesRead);
    };
  }, [dispatch]);
};

export default useMessageNotificationSync;
