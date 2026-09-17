import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchUnreadSummaryThunk,
  addIncomingMessage,
  markConversationRead,
} from '../store/slices/messageNotificationSlice';
import { getSocket, getActiveAuthToken } from '../services/socket.service';

/**
 * Custom hook to keep global unread message counts & notifications
 * synchronized via Socket.IO and REST API across all portals.
 */
export const useMessageNotificationSync = () => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = getActiveAuthToken();
    if (!token) return;

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

      // Dispatch window event in case other listeners want to show a toast or play chime
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

    socket.on('receive_message', handleReceiveMessage);
    socket.on('unread_count_updated', handleUnreadCountUpdated);
    window.addEventListener('chat_messages_marked_read', handleLocalMessagesRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('unread_count_updated', handleUnreadCountUpdated);
      window.removeEventListener('chat_messages_marked_read', handleLocalMessagesRead);
    };
  }, [dispatch]);
};

export default useMessageNotificationSync;
