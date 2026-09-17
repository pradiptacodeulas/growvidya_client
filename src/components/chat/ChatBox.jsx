import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Circle,
  ArrowLeft,
  Users,
  Shield,
  GraduationCap,
  HeartHandshake,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Trash2,
  Ban,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import {
  fetchContactsApi,
  fetchConversationApi,
  sendMessageApi,
  uploadChatAttachmentApi,
  deleteMessageApi,
} from '../../api/message.api';
import {
  connectSocket,
  getSocket,
  emitSendMessage,
  emitTyping,
  emitStopTyping,
  emitMarkRead,
} from '../../services/socket.service';
import { resolveImageUrl } from '../../utils/url.util';

/**
 * Format message date separators (Today, Yesterday, or DD/MM/YYYY)
 */
const formatDateSeparator = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format message timestamp (e.g. 10:45 AM)
 */
const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Get role badge styling and label
 */
const getRoleBadge = (role) => {
  switch (String(role).toLowerCase()) {
    case 'admin':
      return { label: 'Admin', bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: Shield };
    case 'teacher':
      return { label: 'Teacher', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: GraduationCap };
    case 'parent':
      return { label: 'Parent', bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8', icon: HeartHandshake };
    case 'student':
      return { label: 'Student', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: Users };
    default:
      return { label: role, bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb', icon: Users };
  }
};

const ChatBox = ({ currentUserRole = 'admin', currentUserId = null, title = 'Messages' }) => {
  const [contacts, setContacts] = useState([]);
  const [contactsError, setContactsError] = useState(null);
  const [conversationError, setConversationError] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // for teacher: 'all' | 'admin' | 'parent' | 'student'
  const [onlineUsersMap, setOnlineUsersMap] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedContactRef = useRef(selectedContact);
  const activeRequestIdRef = useRef(0);
  const handledUrlQueryRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const isPrependingOlderRef = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const queryContactId = searchParams.get('contactId');
  const queryContactRole = searchParams.get('contactRole');

  const selectedContactId = selectedContact?.id ? Number(selectedContact.id) : null;
  const selectedContactRole = selectedContact?.role ? String(selectedContact.role).toLowerCase() : null;

  // Handle selecting a contact (safely avoids resetting if already active)
  const handleSelectContact = useCallback((contact) => {
    if (!contact) return;
    setSelectedContact((prev) => {
      if (
        prev &&
        Number(prev.id) === Number(contact.id) &&
        String(prev.role).toLowerCase() === String(contact.role).toLowerCase()
      ) {
        return prev;
      }
      return contact;
    });
    setMobileShowChat(true);
  }, []);

  // Keep selectedContactRef and global active chat pointer updated
  useEffect(() => {
    selectedContactRef.current = selectedContact;
    if (selectedContact) {
      window.__GROWVIDYA_ACTIVE_CHAT__ = {
        id: Number(selectedContact.id),
        role: String(selectedContact.role).toLowerCase(),
      };
    } else {
      window.__GROWVIDYA_ACTIVE_CHAT__ = null;
    }
    return () => {
      window.__GROWVIDYA_ACTIVE_CHAT__ = null;
    };
  }, [selectedContact]);

  // Reset initial load flag whenever contact changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [selectedContactId, selectedContactRole]);

  // Auto-select contact from URL search parameters (e.g. clicked from navbar notification)
  useEffect(() => {
    if (!queryContactId || !queryContactRole) {
      handledUrlQueryRef.current = null;
      return;
    }

    const queryKey = `${queryContactId}_${queryContactRole.toLowerCase()}`;
    if (handledUrlQueryRef.current === queryKey) return;

    if (contacts.length > 0) {
      const match = contacts.find(
        (c) =>
          String(c.id) === String(queryContactId) &&
          String(c.role).toLowerCase() === String(queryContactRole).toLowerCase()
      );

      handledUrlQueryRef.current = queryKey;

      if (match) {
        handleSelectContact(match);
      } else if (!loadingContacts) {
        handleSelectContact({
          id: Number(queryContactId),
          role: queryContactRole.toLowerCase(),
          name: `${queryContactRole.charAt(0).toUpperCase() + queryContactRole.slice(1)} #${queryContactId}`,
        });
      }

      // Clean up searchParams so URL parameters don't cause infinite re-renders or sticky selection
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('contactId');
      nextParams.delete('contactRole');
      setSearchParams(nextParams, { replace: true });
    } else if (!loadingContacts) {
      handledUrlQueryRef.current = queryKey;
      handleSelectContact({
        id: Number(queryContactId),
        role: queryContactRole.toLowerCase(),
        name: `${queryContactRole.charAt(0).toUpperCase() + queryContactRole.slice(1)} #${queryContactId}`,
      });
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('contactId');
      nextParams.delete('contactRole');
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    queryContactId,
    queryContactRole,
    contacts,
    loadingContacts,
    searchParams,
    setSearchParams,
    handleSelectContact,
  ]);

  // Load contacts list from server/database
  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    setContactsError(null);
    try {
      const res = await fetchContactsApi();
      if (res?.success && Array.isArray(res?.data)) {
        setContacts(res.data);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error('[ChatBox] Failed to load contacts from database:', err.message);
      setContacts([]);
      setContactsError(err.message || 'Unable to connect to the backend server. Please verify database connection.');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Load conversation messages for the currently selected contact (with race condition protection)
  const loadConversation = useCallback(async () => {
    if (!selectedContactId || !selectedContactRole) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    setLoadingMessages(true);
    setConversationError(null);
    setIsTyping(false);
    isInitialLoadRef.current = true;

    try {
      const res = await fetchConversationApi(selectedContactRole, selectedContactId, { limit: 50, offset: 0 });
      if (currentRequestId !== activeRequestIdRef.current) return;

      if (res?.success && Array.isArray(res?.data?.messages)) {
        setMessages(res.data.messages);
        setHasMoreMessages(Boolean(res?.data?.hasMore));
      } else {
        setMessages([]);
        setHasMoreMessages(false);
      }

      // Reset unread count for this contact locally only if greater than 0 to avoid unnecessary state mutations
      setContacts((prev) => {
        const target = prev.find(
          (c) =>
            Number(c.id) === selectedContactId &&
            String(c.role).toLowerCase() === selectedContactRole
        );
        if (!target || !target.unread_count) return prev;
        return prev.map((c) =>
          Number(c.id) === selectedContactId &&
          String(c.role).toLowerCase() === selectedContactRole
            ? { ...c, unread_count: 0 }
            : c
        );
      });

      // Emit mark read over socket
      emitMarkRead(selectedContactId, selectedContactRole);

      // Notify global navbar and sidebar notification listeners to clear badge
      try {
        window.dispatchEvent(
          new CustomEvent('chat_messages_marked_read', {
            detail: {
              senderId: selectedContactId,
              senderRole: selectedContactRole,
            },
          })
        );
      } catch (_) {}
    } catch (err) {
      if (currentRequestId !== activeRequestIdRef.current) return;
      console.error('[ChatBox] Failed to load conversation from database:', err.message);
      setMessages([]);
      setHasMoreMessages(false);
      setConversationError(err.message || 'Unable to load message history from database.');
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoadingMessages(false);
      }
    }
  }, [selectedContactId, selectedContactRole]);

  // Load older messages for infinite history scroll
  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreMessages || !selectedContactId || !selectedContactRole) return;

    try {
      setLoadingOlder(true);
      isPrependingOlderRef.current = true;
      const scrollContainer = chatScrollContainerRef.current;
      const prevScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

      const res = await fetchConversationApi(selectedContactRole, selectedContactId, {
        limit: 50,
        offset: messages.length,
      });

      if (res?.success && Array.isArray(res?.data?.messages)) {
        const older = res.data.messages;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlder = older.filter((m) => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
        setHasMoreMessages(Boolean(res?.data?.hasMore));

        // Maintain previous scroll position after prepending older items
        requestAnimationFrame(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = newScrollHeight - prevScrollHeight;
          }
          setTimeout(() => {
            isPrependingOlderRef.current = false;
          }, 150);
        });
      } else {
        isPrependingOlderRef.current = false;
      }
    } catch (err) {
      console.error('[ChatBox] Failed to load older messages:', err);
      isPrependingOlderRef.current = false;
    } finally {
      setLoadingOlder(false);
    }
  };

  // Fetch contacts on mount
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Fetch conversation when selectedContact changes
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Socket connection and event listeners
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    // Listen to online users list
    const handleOnlineList = (list) => {
      if (Array.isArray(list)) {
        setOnlineUsersMap(new Set(list));
      }
    };

    // Listen to user connecting
    const handleUserOnline = ({ userId, role }) => {
      setOnlineUsersMap((prev) => new Set(prev).add(`${role}_${userId}`));
    };

    // Listen to user disconnecting
    const handleUserOffline = ({ userId, role }) => {
      setOnlineUsersMap((prev) => {
        const next = new Set(prev);
        next.delete(`${role}_${userId}`);
        return next;
      });
    };

    // Listen to incoming real-time messages
    const handleReceiveMessage = (newMsg) => {
      const currentActive = selectedContactRef.current;
      const isFromActiveContact =
        currentActive &&
        Number(currentActive.id) === Number(newMsg.sender) &&
        String(currentActive.role).toLowerCase() === String(newMsg.sender_role).toLowerCase();

      if (isFromActiveContact) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read immediately
        emitMarkRead(newMsg.sender, newMsg.sender_role);
      }

      // Update contacts list last message, unread badge & re-sort active to top
      setContacts((prev) => {
        let contactFound = false;
        const updated = prev.map((c) => {
          if (
            Number(c.id) === Number(newMsg.sender) &&
            String(c.role).toLowerCase() === String(newMsg.sender_role).toLowerCase()
          ) {
            contactFound = true;
            return {
              ...c,
              last_message: newMsg.message || (newMsg.file ? '📎 Attachment' : ''),
              last_message_time: newMsg.time,
              last_message_seen: isFromActiveContact ? 1 : 0,
              last_message_is_outgoing: false,
              unread_count: isFromActiveContact ? 0 : (c.unread_count || 0) + 1,
            };
          }
          return c;
        });

        // If contact is not yet in list (brand new sender), trigger reload
        if (!contactFound) {
          loadContacts();
          return prev;
        }

        return [...updated].sort((a, b) => {
          if (a.last_message_time && b.last_message_time) {
            return new Date(b.last_message_time) - new Date(a.last_message_time);
          }
          if (a.last_message_time) return -1;
          if (b.last_message_time) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
      });
    };

    // Listen to message sent confirmation
    const handleMessageSent = (sentMsg) => {
      const currentActive = selectedContactRef.current;
      // If we are chatting with this contact, add or replace optimistic temp message
      if (
        currentActive &&
        Number(currentActive.id) === Number(sentMsg.reciver) &&
        String(currentActive.role).toLowerCase() === String(sentMsg.receiver_role).toLowerCase()
      ) {
        setMessages((prev) => {
          // If already in list, do not duplicate
          if (prev.some((m) => m.id === sentMsg.id)) return prev;

          // Replace existing pending optimistic message if present
          const tempIdx = prev.findIndex((m) => String(m.id).startsWith('temp_'));
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = sentMsg;
            return updated;
          }

          return [...prev, sentMsg];
        });
      }

      // Update contact last message & re-sort to top
      setContacts((prev) => {
        const updated = prev.map((c) => {
          if (
            Number(c.id) === Number(sentMsg.reciver) &&
            String(c.role).toLowerCase() === String(sentMsg.receiver_role).toLowerCase()
          ) {
            return {
              ...c,
              last_message: sentMsg.message || (sentMsg.file ? '📎 Attachment' : ''),
              last_message_time: sentMsg.time,
              last_message_seen: sentMsg.seen,
              last_message_is_outgoing: true,
            };
          }
          return c;
        });

        return [...updated].sort((a, b) => {
          if (a.last_message_time && b.last_message_time) {
            return new Date(b.last_message_time) - new Date(a.last_message_time);
          }
          if (a.last_message_time) return -1;
          if (b.last_message_time) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
      });
    };

    // Listen to typing event
    const handleUserTyping = ({ senderId, senderRole }) => {
      const currentActive = selectedContactRef.current;
      if (
        currentActive &&
        Number(currentActive.id) === Number(senderId) &&
        String(currentActive.role).toLowerCase() === String(senderRole).toLowerCase()
      ) {
        setIsTyping(true);
      }
    };

    // Listen to stop typing event
    const handleUserStopTyping = ({ senderId, senderRole }) => {
      const currentActive = selectedContactRef.current;
      if (
        currentActive &&
        Number(currentActive.id) === Number(senderId) &&
        String(currentActive.role).toLowerCase() === String(senderRole).toLowerCase()
      ) {
        setIsTyping(false);
      }
    };

    // Listen to read receipts
    const handleMessagesRead = ({ readerId, readerRole }) => {
      const currentActive = selectedContactRef.current;
      if (
        currentActive &&
        Number(currentActive.id) === Number(readerId) &&
        String(currentActive.role).toLowerCase() === String(readerRole).toLowerCase()
      ) {
        setMessages((prev) => prev.map((m) => ({ ...m, seen: 1 })));
      }
    };

    // Listen to message deletion event
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          Number(m.id) === Number(messageId)
            ? { ...m, message: 'This message was deleted', file: null, file_type: null, status: 0 }
            : m
        )
      );
    };

    socket.on('online_users_list', handleOnlineList);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('online_users_list', handleOnlineList);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, []);

  // Auto scroll to bottom on new messages or typing (skip when prepending older messages)
  useEffect(() => {
    if (loadingOlder || isPrependingOlderRef.current) return;
    if (!messagesEndRef.current) return;

    if (isInitialLoadRef.current) {
      if (messages.length > 0) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        isInitialLoadRef.current = false;
      }
    } else {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, loadingOlder]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageInput(val);

    if (!selectedContact) return;

    emitTyping(selectedContact.id, selectedContact.role);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(selectedContact.id, selectedContact.role);
    }, 1500);
  };

  // Handle file select
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAttachmentUploading(true);
      const res = await uploadChatAttachmentApi(file);
      if (res?.success && res?.data?.file_path) {
        setAttachment({
          url: res.data.file_path,
          name: res.data.file_name || file.name,
          type: res.data.mimetype || file.type,
          size: res.data.size || file.size,
        });
      }
    } catch (err) {
      alert(err.message || 'Attachment upload failed');
    } finally {
      setAttachmentUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this message for everyone?');
    if (!confirmDelete) return;

    try {
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? { ...m, message: 'This message was deleted', file: null, file_type: null, status: 0 }
            : m
        )
      );
      await deleteMessageApi(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert(err.message || 'Failed to delete message. Please try again.');
      if (selectedContact) {
        loadConversation(selectedContact, false);
      }
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !attachment) || sending || !selectedContact) return;

    const payload = {
      receiverId: selectedContact.id,
      receiverRole: selectedContact.role,
      message: messageInput.trim(),
      file: attachment?.url || null,
      fileType: attachment?.type || null,
    };

    setSending(true);
    emitStopTyping(selectedContact.id, selectedContact.role);

    // Optimistic message entry
    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      id: tempId,
      sender: currentUserId,
      sender_role: currentUserRole,
      reciver: selectedContact.id,
      receiver_role: selectedContact.role,
      message: payload.message,
      file: payload.file,
      file_type: payload.fileType,
      time: new Date().toISOString(),
      seen: 0,
      status: 1,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput('');
    setAttachment(null);

    // Try socket emit first
    emitSendMessage(payload, async (ack) => {
      setSending(false);
      if (ack?.success && ack?.data) {
        setMessages((prev) => {
          // If already added by real-time event, just remove the optimistic placeholder
          if (prev.some((m) => m.id === ack.data.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? ack.data : m));
        });
      } else {
        // Fallback to REST API
        try {
          const res = await sendMessageApi(payload);
          if (res?.success && res?.data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === res.data.id)) {
                return prev.filter((m) => m.id !== tempId);
              }
              return prev.map((m) => (m.id === tempId ? res.data : m));
            });
          }
        } catch (err) {
          console.error('Failed to send message:', err);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          alert('Failed to save message to server: ' + (err.message || 'Network error'));
        }
      }
    });
  };

  // Filter contacts by search and tab
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Tab filter
      if (activeTab !== 'all' && c.role !== activeTab) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchCode = (c.code || '').toLowerCase().includes(q);
        const matchChild = (c.child_name || '').toLowerCase().includes(q);
        const matchClass = (c.class_name || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchCode || matchChild || matchClass;
      }
      return true;
    });
  }, [contacts, activeTab, searchTerm]);

  // Group messages by date with duplicate protection
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    const seenIds = new Set();

    for (const msg of messages) {
      if (msg.id && seenIds.has(msg.id)) continue;
      if (msg.id) seenIds.add(msg.id);

      const dateStr = formatDateSeparator(msg.time);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ type: 'date', label: dateStr });
      }
      groups.push({ type: 'message', data: msg });
    }

    return groups;
  }, [messages]);

  // Check if contact is online
  const checkContactOnline = (contact) => {
    if (!contact) return false;
    return onlineUsersMap.has(`${contact.role}_${contact.id}`);
  };

  // Total unread messages across all contacts
  const totalUnreadCount = useMemo(() => {
    return contacts.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
  }, [contacts]);

  return (
    <div
      className="card shadow-sm border mb-4 overflow-hidden"
      style={{
        minHeight: 'calc(100vh - 190px)',
        height: 'calc(100vh - 190px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        borderColor: '#e2e8f0',
      }}
    >
      <style>{`
        @keyframes chatBounceDots {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .chat-bubble-typing-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          margin: 0 1.5px;
          background-color: #64748b;
          border-radius: 50%;
          animation: chatBounceDots 1.3s infinite ease-in-out both;
        }
        .starter-chip {
          transition: all 0.15s ease;
        }
        .starter-chip:hover {
          background-color: #eff6ff !important;
          border-color: #93c5fd !important;
          color: #1d4ed8 !important;
          transform: translateY(-1px);
        }
        .chat-contact-btn {
          transition: all 0.15s ease;
        }
        .chat-contact-btn:hover {
          background-color: #f8fafc;
        }
        .chat-contact-btn.active-contact {
          background-color: #eff6ff !important;
          border-color: #bfdbfe !important;
        }
        .chat-msg-row:hover .chat-delete-btn {
          opacity: 0.65 !important;
        }
        .chat-delete-btn:hover {
          opacity: 1 !important;
          color: #ef4444 !important;
          background-color: #fee2e2 !important;
        }
      `}</style>

      <div className="row g-0 flex-grow-1" style={{ height: '100%', overflow: 'hidden' }}>
        {/* ========================================================= */}
        {/* LEFT COLUMN: CONTACTS LIST & SEARCH                       */}
        {/* ========================================================= */}
        <div
          className={`col-12 col-md-5 col-lg-4 border-end d-flex flex-column bg-white ${
            mobileShowChat ? 'd-none d-md-flex' : 'd-flex'
          }`}
          style={{ height: '100%', minWidth: 0, borderColor: '#e2e8f0' }}
        >
          {/* Header & Search */}
          <div className="p-3 border-bottom bg-light bg-opacity-40" style={{ borderColor: '#f1f5f9' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2 fs-16">
                <i className="ti ti-message-dots text-primary fs-20"></i>
                {title}
              </h5>
              <div className="d-flex align-items-center gap-1.5">
                <span className="badge bg-white text-secondary border px-2 py-1 fs-11 fw-normal">
                  {contacts.length} Contacts
                </span>
                {totalUnreadCount > 0 && (
                  <span
                    className="badge rounded-pill bg-primary text-white px-2 py-0.5 fs-10 fw-bold d-inline-flex align-items-center gap-1 shadow-xs"
                    title={`${totalUnreadCount} total unread message${totalUnreadCount > 1 ? 's' : ''}`}
                  >
                    <span className="bg-white rounded-circle d-inline-block" style={{ width: 5, height: 5 }}></span>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount} new
                  </span>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="position-relative mt-2">
              <Search
                size={15}
                className="position-absolute text-muted"
                style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="form-control form-control-sm ps-5 bg-white border w-100"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '20px', fontSize: '13px', borderColor: '#e2e8f0' }}
              />
              {searchTerm && (
                <button
                  className="btn btn-sm btn-link text-muted position-absolute p-0"
                  style={{ top: '50%', right: '12px', transform: 'translateY(-50%)' }}
                  onClick={() => setSearchTerm('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Role Filter Tabs (Only shown if current user is Teacher, since teachers can talk to all 3) */}
            {currentUserRole === 'teacher' && (
              <div className="d-flex gap-1 mt-2 pt-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'admin', label: 'Admins' },
                  { key: 'parent', label: 'Parents' },
                  { key: 'student', label: 'Students' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`btn btn-sm py-1 px-2 flex-grow-1 fs-11 fw-semibold ${
                      activeTab === tab.key
                        ? 'btn-primary text-white shadow-xs'
                        : 'btn-light text-secondary border'
                    }`}
                    style={{ borderRadius: '15px' }}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contacts Scrollable List */}
          <div className="flex-grow-1 overflow-auto py-2" style={{ scrollbarWidth: 'thin' }}>
            {loadingContacts ? (
              <div className="text-center py-5 text-muted">
                <Loader2 size={24} className="animate-spin mb-2 d-inline-block text-primary" />
                <p className="fs-12 mb-0">Loading contacts...</p>
              </div>
            ) : contactsError ? (
              <div className="text-center py-5 px-3">
                <AlertCircle size={32} className="text-danger mb-2 d-inline-block" />
                <p className="fs-13 fw-semibold text-danger mb-1">Database / Server Error</p>
                <small className="fs-11 text-muted d-block mb-3">{contactsError}</small>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                  onClick={loadContacts}
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-5 text-muted px-3">
                <Users size={32} className="text-muted opacity-50 mb-2" />
                <p className="fs-13 fw-medium mb-1">No contacts found</p>
                <small className="fs-11 text-muted">
                  {searchTerm
                    ? 'No contacts match your search query.'
                    : 'No registered contacts found in the school database.'}
                </small>
              </div>
            ) : (
              <div className="list-group list-group-flush border-0 px-2">
                {filteredContacts.map((contact) => {
                  const isSelected =
                    selectedContact &&
                    Number(selectedContact.id) === Number(contact.id) &&
                    String(selectedContact.role).toLowerCase() === String(contact.role).toLowerCase();
                  const isOnline = checkContactOnline(contact);
                  const roleBadge = getRoleBadge(contact.role);
                  const RoleIcon = roleBadge.icon;

                  return (
                    <button
                      key={`${contact.role}_${contact.id}`}
                      type="button"
                      className={`list-group-item list-group-item-action border-0 mb-1 w-100 text-start d-flex align-items-center gap-2.5 chat-contact-btn ${
                        isSelected ? 'active-contact' : 'bg-transparent'
                      }`}
                      style={{
                        borderRadius: '10px',
                        padding: '9px 12px',
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      }}
                      onClick={() => handleSelectContact(contact)}
                    >
                      {/* Avatar with Online Indicator */}
                      <div className="position-relative flex-shrink-0">
                        <Avatar
                          src={contact.picture}
                          name={contact.name}
                          size={38}
                          rounded={true}
                        />
                        <span
                          className="position-absolute rounded-circle border border-2 border-white"
                          style={{
                            width: '11px',
                            height: '11px',
                            backgroundColor: isOnline ? '#10b981' : '#9ca3af',
                            bottom: '1px',
                            right: '1px',
                            boxShadow: isOnline ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none',
                          }}
                          title={isOnline ? 'Online' : 'Offline'}
                        />
                      </div>

                      {/* Contact Info */}
                      <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ minWidth: 0 }}>
                          <h6
                            className={`mb-0 text-truncate fs-13 ${
                              contact.unread_count > 0 ? 'fw-bold text-dark' : 'fw-semibold text-dark'
                            }`}
                            style={{ minWidth: 0 }}
                          >
                            {contact.name}
                          </h6>
                          {contact.last_message_time && (
                            <span className={`fs-10 flex-shrink-0 ms-2 ${contact.unread_count > 0 ? 'text-primary fw-semibold' : 'text-muted'}`}>
                              {formatMessageTime(contact.last_message_time)}
                            </span>
                          )}
                        </div>

                        {/* Role & Secondary Meta */}
                        <div className="d-flex align-items-center gap-1 mb-1 overflow-hidden" style={{ minWidth: 0 }}>
                          <span
                            className="badge d-inline-flex align-items-center gap-1 py-0.5 px-1.5 fs-10 fw-normal flex-shrink-0"
                            style={{
                              backgroundColor: roleBadge.bg,
                              color: roleBadge.text,
                              border: `1px solid ${roleBadge.border}`,
                              borderRadius: '10px',
                            }}
                          >
                            <RoleIcon size={9} />
                            {roleBadge.label}
                          </span>
                          {contact.class_name && (
                            <span className="fs-10 text-muted text-truncate" style={{ minWidth: 0 }}>
                              • Cls: {contact.class_name} {contact.section_name ? `(${contact.section_name})` : ''}
                            </span>
                          )}
                          {contact.child_name && (
                            <span className="fs-10 text-muted text-truncate" style={{ minWidth: 0 }} title={`Child: ${contact.child_name}`}>
                              • Child: {contact.child_name}
                            </span>
                          )}
                          {contact.designation && (
                            <span className="fs-10 text-muted text-truncate" style={{ minWidth: 0 }}>
                              • {contact.designation}
                            </span>
                          )}
                        </div>

                        {/* Last Message Snippet */}
                        <div className="d-flex align-items-center justify-content-between overflow-hidden" style={{ minWidth: 0 }}>
                          <p
                            className={`mb-0 fs-12 text-truncate pe-2 ${
                              contact.unread_count > 0 ? 'fw-bold text-primary' : 'text-muted'
                            }`}
                            style={{ minWidth: 0, flex: 1 }}
                          >
                            {contact.last_message_is_outgoing && (
                              <span className="me-1 text-muted flex-shrink-0">
                                {contact.last_message_seen === 1 ? (
                                  <CheckCheck size={12} className="text-primary d-inline" />
                                ) : (
                                  <Check size={12} className="d-inline" />
                                )}
                              </span>
                            )}
                            {contact.last_message || <span className="fst-italic opacity-75">Click to chat</span>}
                          </p>

                          {contact.unread_count > 0 && (
                            <span
                              className="badge rounded-pill bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold shadow-xs flex-shrink-0 ms-2"
                              style={{
                                minWidth: '20px',
                                height: '20px',
                                fontSize: '10.5px',
                                padding: contact.unread_count > 9 ? '0 6px' : '0',
                                lineHeight: 1,
                                boxShadow: '0 2px 5px rgba(13, 110, 253, 0.35)',
                                letterSpacing: '-0.2px',
                              }}
                              title={`${contact.unread_count} unread message${contact.unread_count > 1 ? 's' : ''}`}
                            >
                              {contact.unread_count > 99 ? '99+' : contact.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: ACTIVE CHAT CONVERSATION                    */}
        {/* ========================================================= */}
        <div
          className={`col-12 col-md-7 col-lg-8 d-flex flex-column bg-white ${
            mobileShowChat ? 'd-flex' : 'd-none d-md-flex'
          }`}
          style={{ height: '100%' }}
        >
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div
                className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between"
                style={{ borderColor: '#f1f5f9' }}
              >
                <div className="d-flex align-items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    className="btn btn-sm btn-light text-secondary d-md-none rounded-circle border d-flex align-items-center justify-content-center"
                    onClick={() => setMobileShowChat(false)}
                    title="Back to contacts"
                    style={{ width: '34px', height: '34px', padding: 0 }}
                  >
                    <ArrowLeft size={16} />
                  </button>

                  {/* Contact Avatar & Status */}
                  <div className="position-relative">
                    <Avatar
                      src={selectedContact.picture}
                      name={selectedContact.name}
                      size={44}
                      rounded={true}
                    />
                    <span
                      className="position-absolute rounded-circle border border-2 border-white"
                      style={{
                        width: '13px',
                        height: '13px',
                        backgroundColor: checkContactOnline(selectedContact) ? '#10b981' : '#9ca3af',
                        bottom: '1px',
                        right: '1px',
                        boxShadow: checkContactOnline(selectedContact)
                          ? '0 0 0 2px rgba(16, 185, 129, 0.25)'
                          : 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h6 className="mb-0 fw-bold text-dark fs-14">{selectedContact.name}</h6>
                      {(() => {
                        const b = getRoleBadge(selectedContact.role);
                        const BIcon = b.icon;
                        return (
                          <span
                            className="badge d-inline-flex align-items-center gap-1 py-0.5 px-1.5 fs-10 fw-medium"
                            style={{
                              backgroundColor: b.bg,
                              color: b.text,
                              border: `1px solid ${b.border}`,
                              borderRadius: '12px',
                            }}
                          >
                            <BIcon size={10} />
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="fs-11 text-muted d-flex align-items-center gap-2 mt-0.5">
                      {isTyping ? (
                        <span className="text-primary fw-medium d-inline-flex align-items-center gap-1">
                          <span className="spinner-grow spinner-grow-sm text-primary" style={{ width: '6px', height: '6px' }} />
                          typing...
                        </span>
                      ) : checkContactOnline(selectedContact) ? (
                        <span className="text-success fw-medium d-flex align-items-center gap-1">
                          <Circle size={7} fill="#10b981" color="#10b981" />
                          Active now
                        </span>
                      ) : (
                        <span className="text-muted d-flex align-items-center gap-1">
                          <Circle size={7} fill="#9ca3af" color="#9ca3af" />
                          Offline
                        </span>
                      )}
                      {selectedContact.class_name && (
                        <span>• Class {selectedContact.class_name}</span>
                      )}
                      {selectedContact.child_name && (
                        <span>• Child: {selectedContact.child_name}</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Chat Message Scroll Area */}
              <div
                ref={chatScrollContainerRef}
                className="flex-grow-1 px-3 py-2 overflow-auto d-flex flex-column"
                style={{
                  backgroundColor: '#f8fafc',
                  scrollbarWidth: 'thin',
                }}
              >
                {/* Load Older Messages Button */}
                {hasMoreMessages && !loadingMessages && (
                  <div className="text-center my-1.5">
                    <button
                      type="button"
                      className="btn btn-sm btn-white border shadow-xs fs-11 text-muted d-inline-flex align-items-center gap-1.5 px-3 py-1 bg-white"
                      style={{ borderRadius: '15px' }}
                      onClick={loadOlderMessages}
                      disabled={loadingOlder}
                    >
                      {loadingOlder ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-primary" />
                          <span>Loading older messages...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={11} className="text-primary" />
                          <span>Load older messages</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="my-auto text-center py-5 text-muted">
                    <Loader2 size={24} className="animate-spin mb-2 d-inline-block text-primary" />
                    <p className="fs-12 mb-0">Loading conversation...</p>
                  </div>
                ) : conversationError ? (
                  <div className="my-auto text-center py-5 px-4">
                    <AlertCircle size={36} className="text-danger mb-2 d-inline-block" />
                    <h6 className="fw-bold text-danger mb-1">Failed to load conversation</h6>
                    <p className="fs-12 text-muted mb-3">{conversationError}</p>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      onClick={loadConversation}
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="my-auto text-center py-5 text-muted px-4">
                    <div
                      className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-xs"
                      style={{
                        width: '72px',
                        height: '72px',
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        color: '#2563eb',
                      }}
                    >
                      <MessageSquare size={32} />
                    </div>
                    <h6 className="fw-bold text-dark mb-1 fs-15">No messages yet</h6>
                    <p className="fs-12 text-muted mb-3" style={{ maxWidth: '340px', margin: '0 auto' }}>
                      Start the conversation with <strong className="text-dark">{selectedContact.name}</strong>. Send a quick message below!
                    </p>
                    <div className="d-flex flex-wrap gap-2 justify-content-center" style={{ maxWidth: '420px', margin: '0 auto' }}>
                      {[
                        '👋 Hi, hope you are doing well!',
                        'Good morning!',
                        'Can we discuss an update?',
                      ].map((starter, i) => (
                        <button
                          key={i}
                          type="button"
                          className="btn btn-sm btn-white border bg-white shadow-xs starter-chip fs-11 text-dark px-2.5 py-1"
                          style={{ borderRadius: '16px' }}
                          onClick={() => setMessageInput(starter)}
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((item, idx) => {
                    if (item.type === 'date') {
                      return (
                        <div key={`date_${idx}`} className="text-center my-2 position-relative">
                          <span
                            className="badge bg-white text-secondary border px-2.5 py-0.5 shadow-xs"
                            style={{
                              borderRadius: '16px',
                              fontSize: '10.5px',
                              fontWeight: '500',
                              borderColor: '#e2e8f0',
                              color: '#64748b',
                              letterSpacing: '0.2px',
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    }

                    const msg = item.data;
                    const isOutgoing =
                      (Number(msg.sender) === Number(currentUserId) &&
                        String(msg.sender_role).toLowerCase() === String(currentUserRole).toLowerCase()) ||
                      (msg.sender_role &&
                        String(msg.sender_role).toLowerCase() === String(currentUserRole).toLowerCase() &&
                        Number(msg.reciver) === Number(selectedContact.id));

                    const isDeleted = Number(msg.status) === 0;
                    const hasAttachment = !isDeleted && Boolean(msg.file);
                    const isImage =
                      hasAttachment &&
                      (msg.file_type?.startsWith('image/') ||
                        /\.(jpeg|jpg|png|webp|gif|svg)$/i.test(msg.file));
                    const attachmentUrl = hasAttachment ? resolveImageUrl(msg.file) : null;

                    const canDelete = Boolean(
                      !isDeleted &&
                      msg.id &&
                      !String(msg.id).startsWith('temp_') &&
                      (isOutgoing || String(currentUserRole).toLowerCase() === 'admin')
                    );

                    return (
                      <div
                        key={msg.id || idx}
                        className={`d-flex mb-1.5 chat-msg-row ${isOutgoing ? 'justify-content-end' : 'justify-content-start'}`}
                      >
                        {!isOutgoing && (
                          <div className="me-1.5 flex-shrink-0 align-self-end mb-0.5">
                            <Avatar
                              src={selectedContact.picture}
                              name={selectedContact.name}
                              size={24}
                              rounded={true}
                            />
                          </div>
                        )}

                        <div
                          className="d-flex flex-column"
                          style={{
                            maxWidth: '72%',
                            width: 'fit-content',
                            alignItems: isOutgoing ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <div className={`d-flex align-items-center gap-1 ${isOutgoing ? 'flex-row' : 'flex-row-reverse'}`}>
                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn-sm p-1 border-0 rounded-circle text-muted chat-delete-btn flex-shrink-0"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete message for everyone"
                                style={{
                                  opacity: 0,
                                  transition: 'all 0.15s ease',
                                  width: '24px',
                                  height: '24px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  background: 'none',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}

                            <div
                              className="position-relative"
                              style={{
                                padding: '6px 10px',
                                borderRadius: isOutgoing
                                  ? '14px 14px 2px 14px'
                                  : '14px 14px 14px 2px',
                                background: isDeleted
                                  ? isOutgoing
                                    ? '#f1f5f9'
                                    : '#f8fafc'
                                  : isOutgoing
                                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                  : '#ffffff',
                                color: isDeleted
                                  ? '#64748b'
                                  : isOutgoing
                                  ? '#ffffff'
                                  : '#1e293b',
                                boxShadow: isDeleted
                                  ? 'none'
                                  : isOutgoing
                                  ? '0 1px 2px rgba(37, 99, 235, 0.2)'
                                  : '0 1px 2px rgba(15, 23, 42, 0.05)',
                                border: isDeleted
                                  ? '1px dashed #cbd5e1'
                                  : isOutgoing
                                  ? 'none'
                                  : '1px solid #e2e8f0',
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                                width: 'fit-content',
                              }}
                            >
                              {/* Attachment Display */}
                              {hasAttachment && (
                                <div className="mb-1">
                                  {isImage ? (
                                    <a
                                      href={attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="d-block overflow-hidden rounded-2 border"
                                      style={{
                                        maxWidth: '240px',
                                        maxHeight: '170px',
                                        borderColor: isOutgoing ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                      }}
                                    >
                                      <img
                                        src={attachmentUrl}
                                        alt="Attachment"
                                        className="img-fluid w-100"
                                        style={{
                                          objectFit: 'cover',
                                          maxHeight: '170px',
                                          display: 'block',
                                          transition: 'transform 0.15s ease',
                                        }}
                                        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="d-flex align-items-center gap-1.5 px-2 py-1 rounded-2 text-decoration-none"
                                      style={{
                                        backgroundColor: isOutgoing ? 'rgba(255, 255, 255, 0.16)' : '#f8fafc',
                                        border: isOutgoing ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid #e2e8f0',
                                        color: isOutgoing ? '#ffffff' : '#1e293b',
                                        maxWidth: '230px',
                                      }}
                                    >
                                      <div
                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          backgroundColor: isOutgoing ? 'rgba(255, 255, 255, 0.25)' : '#eff6ff',
                                          color: isOutgoing ? '#ffffff' : '#2563eb',
                                        }}
                                      >
                                        <FileText size={13} />
                                      </div>
                                      <div className="flex-grow-1 overflow-hidden">
                                        <div className="fs-11 fw-semibold text-truncate">
                                          {msg.file.split('/').pop()}
                                        </div>
                                      </div>
                                      <Download size={12} className="flex-shrink-0 opacity-75 ms-1" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Message Text & Micro Inline Timestamp */}
                              <div className="d-flex flex-wrap align-items-end justify-content-between gap-2" style={{ minWidth: '55px' }}>
                                {isDeleted ? (
                                  <span
                                    className="d-inline-flex align-items-center gap-1.5"
                                    style={{
                                      fontSize: '13px',
                                      lineHeight: '1.4',
                                      fontStyle: 'italic',
                                      color: '#64748b',
                                      userSelect: 'none',
                                    }}
                                  >
                                    <Ban size={13} className="opacity-75" />
                                    <span>{msg.message || 'This message was deleted'}</span>
                                  </span>
                                ) : (
                                  msg.message && (
                                    <span
                                      style={{
                                        fontSize: '13px',
                                        lineHeight: '1.4',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        flex: '1 1 auto',
                                      }}
                                    >
                                      {msg.message}
                                    </span>
                                  )
                                )}

                                <span
                                  className="d-inline-flex align-items-center gap-0.5 ms-auto"
                                  style={{
                                    fontSize: '9.5px',
                                    lineHeight: '1',
                                    color: isDeleted
                                      ? '#94a3b8'
                                      : isOutgoing
                                      ? 'rgba(255, 255, 255, 0.75)'
                                      : '#94a3b8',
                                    whiteSpace: 'nowrap',
                                    userSelect: 'none',
                                    marginBottom: '1px',
                                    paddingLeft: '4px',
                                  }}
                                >
                                  <span>{formatMessageTime(msg.time)}</span>
                                  {!isDeleted && isOutgoing && (
                                    <span
                                      className="d-inline-flex align-items-center"
                                      title={msg.seen === 1 ? 'Read' : 'Delivered'}
                                    >
                                      {msg.seen === 1 ? (
                                        <CheckCheck size={12} style={{ color: '#bae6fd', strokeWidth: 2.2 }} />
                                      ) : (
                                        <Check size={12} style={{ color: 'rgba(255, 255, 255, 0.75)', strokeWidth: 2 }} />
                                      )}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* In-stream Typing Indicator */}
                {isTyping && (
                  <div className="d-flex align-items-end mb-1.5 justify-content-start">
                    <div className="me-1.5 flex-shrink-0 align-self-end mb-0.5">
                      <Avatar
                        src={selectedContact.picture}
                        name={selectedContact.name}
                        size={24}
                        rounded={true}
                      />
                    </div>
                    <div
                      className="bg-white border px-2.5 py-1 shadow-xs d-flex align-items-center gap-1"
                      style={{
                        borderRadius: '14px 14px 14px 2px',
                        borderColor: '#e2e8f0',
                      }}
                    >
                      <span className="fs-10 text-muted me-1 fw-medium">
                        {selectedContact.name.split(' ')[0]} is typing
                      </span>
                      <span className="chat-bubble-typing-dot" style={{ animationDelay: '0s' }} />
                      <span className="chat-bubble-typing-dot" style={{ animationDelay: '0.2s' }} />
                      <span className="chat-bubble-typing-dot" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Chip Before Sending */}
              {attachment && (
                <div
                  className="px-3 py-2 bg-light border-top border-bottom d-flex align-items-center justify-content-between"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                >
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <div
                      className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '32px', height: '32px', backgroundColor: '#eff6ff', color: '#2563eb' }}
                    >
                      {attachment.type?.startsWith('image/') ? (
                        <ImageIcon size={18} />
                      ) : (
                        <FileText size={18} />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="fs-12 text-truncate fw-semibold text-dark" style={{ maxWidth: '280px' }}>
                        {attachment.name}
                      </div>
                      <div className="fs-10 text-muted">Ready to send</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-icon btn-light rounded-circle border"
                    onClick={handleRemoveAttachment}
                    title="Remove attachment"
                    style={{ width: '28px', height: '28px', padding: 0 }}
                  >
                    <X size={14} className="text-secondary" />
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 px-3 px-md-4 bg-white border-top position-relative"
                style={{ borderColor: '#f1f5f9' }}
              >
                <div className="d-flex align-items-center gap-2.5">
                  {/* File Attachment Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="d-none"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <button
                    type="button"
                    className="btn btn-light rounded-circle text-secondary border-0 d-flex align-items-center justify-content-center flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachmentUploading || sending}
                    title="Attach image or file"
                    style={{
                      width: '42px',
                      height: '42px',
                      backgroundColor: '#f1f5f9',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  >
                    {attachmentUploading ? (
                      <Loader2 size={18} className="animate-spin text-primary" />
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>

                  {/* Message Input */}
                  <div className="position-relative flex-grow-1">
                    <input
                      type="text"
                      className="form-control border-0 py-2 ps-3.5 pe-4"
                      placeholder={`Type a message to ${selectedContact.name}...`}
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      disabled={sending}
                      style={{
                        borderRadius: '24px',
                        fontSize: '13.5px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        height: '44px',
                        boxShadow: 'none',
                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="btn rounded-circle d-flex align-items-center justify-content-center border-0 flex-shrink-0"
                    disabled={(!messageInput.trim() && !attachment) || sending}
                    title="Send message"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: (!messageInput.trim() && !attachment) || sending
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: (!messageInput.trim() && !attachment) || sending
                        ? 'none'
                        : '0 3px 10px rgba(37, 99, 235, 0.28)',
                      cursor: (!messageInput.trim() && !attachment) || sending ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sending ? (
                      <Loader2 size={18} className="animate-spin text-white" />
                    ) : (
                      <Send size={18} className="text-white" style={{ marginLeft: '2px' }} />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Blank state when no contact selected */
            <div className="my-auto text-center py-5 text-muted px-4 d-flex flex-column align-items-center justify-content-center">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-xs"
                style={{
                  width: '84px',
                  height: '84px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  color: '#2563eb',
                }}
              >
                <MessageSquare size={38} />
              </div>
              <h5 className="fw-bold text-dark mb-2 fs-18">Your Messages</h5>
              <p className="fs-13 text-muted mb-4" style={{ maxWidth: '360px' }}>
                Select a conversation from the left to view messages, send replies, share attachments, and see active presence.
              </p>
              <div className="d-flex align-items-center gap-2 flex-wrap justify-content-center">
                <span className="badge bg-white text-secondary border px-3 py-1.5 shadow-xs fs-11 d-inline-flex align-items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" /> Real-time sync
                </span>
                <span className="badge bg-white text-secondary border px-3 py-1.5 shadow-xs fs-11 d-inline-flex align-items-center gap-1.5">
                  <Paperclip size={13} className="text-primary" /> File sharing
                </span>
                <span className="badge bg-white text-secondary border px-3 py-1.5 shadow-xs fs-11 d-inline-flex align-items-center gap-1.5">
                  <Shield size={13} className="text-primary" /> Secure portal
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
