import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchUnreadCountApi, fetchContactsApi } from '../../api/message.api';

/**
 * Fetch unread count & unread conversation list from API
 */
export const fetchUnreadSummaryThunk = createAsyncThunk(
  'messageNotification/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const countRes = await fetchUnreadCountApi();
      const unreadCount = Number(countRes?.data?.unreadCount || 0);

      let unreadConversations = [];
      if (unreadCount > 0) {
        const contactsRes = await fetchContactsApi();
        if (contactsRes?.success && Array.isArray(contactsRes?.data)) {
          unreadConversations = contactsRes.data
            .filter((c) => Number(c.unread_count) > 0)
            .sort((a, b) => (Number(b.unread_count) || 0) - (Number(a.unread_count) || 0));
        }
      }

      return { unreadCount, unreadConversations };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch unread message count');
    }
  }
);

const initialState = {
  unreadCount: 0,
  unreadConversations: [],
  recentIncoming: [],
  loading: false,
  error: null,
};

const messageNotificationSlice = createSlice({
  name: 'messageNotification',
  initialState,
  reducers: {
    setUnreadCount(state, action) {
      state.unreadCount = Math.max(0, Number(action.payload) || 0);
    },
    incrementUnreadCount(state, action) {
      const amount = Number(action.payload) || 1;
      state.unreadCount += amount;
    },
    decrementUnreadCount(state, action) {
      const amount = Number(action.payload) || 1;
      state.unreadCount = Math.max(0, state.unreadCount - amount);
    },
    setUnreadSummary(state, action) {
      state.unreadCount = Math.max(0, Number(action.payload?.unreadCount) || 0);
      state.unreadConversations = Array.isArray(action.payload?.unreadConversations)
        ? action.payload.unreadConversations
        : [];
    },
    addIncomingMessage(state, action) {
      const msg = action.payload;
      if (!msg) return;

      state.unreadCount += 1;

      // Add to recent incoming messages
      const existsInRecent = state.recentIncoming.some((m) => m.id && m.id === msg.id);
      if (!existsInRecent) {
        state.recentIncoming = [msg, ...state.recentIncoming].slice(0, 10);
      }

      // Update unreadConversations list
      const senderId = Number(msg.sender);
      const senderRole = String(msg.sender_role || '').toLowerCase();

      const existingIndex = state.unreadConversations.findIndex(
        (c) => Number(c.id) === senderId && String(c.role).toLowerCase() === senderRole
      );

      if (existingIndex >= 0) {
        const existing = state.unreadConversations[existingIndex];
        const updated = {
          ...existing,
          last_message: msg.message || (msg.file ? '📎 Attachment' : ''),
          last_message_time: msg.created_at || msg.time || new Date().toISOString(),
          unread_count: (Number(existing.unread_count) || 0) + 1,
        };
        state.unreadConversations.splice(existingIndex, 1);
        state.unreadConversations.unshift(updated);
      } else {
        // Create new unread conversation item
        state.unreadConversations.unshift({
          id: senderId,
          role: senderRole,
          name: msg.sender_name || `${senderRole.charAt(0).toUpperCase() + senderRole.slice(1)} #${senderId}`,
          picture: msg.sender_avatar || null,
          last_message: msg.message || (msg.file ? '📎 Attachment' : ''),
          last_message_time: msg.created_at || msg.time || new Date().toISOString(),
          unread_count: 1,
        });
      }
    },
    markConversationRead(state, action) {
      const { senderId, senderRole } = action.payload || {};
      const sId = Number(senderId);
      const sRole = String(senderRole || '').toLowerCase();

      const existingIndex = state.unreadConversations.findIndex(
        (c) => Number(c.id) === sId && String(c.role).toLowerCase() === sRole
      );

      if (existingIndex >= 0) {
        const removedCount = Number(state.unreadConversations[existingIndex].unread_count) || 0;
        state.unreadCount = Math.max(0, state.unreadCount - removedCount);
        state.unreadConversations.splice(existingIndex, 1);
      }

      state.recentIncoming = state.recentIncoming.filter(
        (m) => !(Number(m.sender) === sId && String(m.sender_role).toLowerCase() === sRole)
      );
    },
    clearAllUnread(state) {
      state.unreadCount = 0;
      state.unreadConversations = [];
      state.recentIncoming = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnreadSummaryThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnreadSummaryThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.unreadCount = action.payload.unreadCount;
        state.unreadConversations = action.payload.unreadConversations;
      })
      .addCase(fetchUnreadSummaryThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
  setUnreadSummary,
  addIncomingMessage,
  markConversationRead,
  clearAllUnread,
} = messageNotificationSlice.actions;

export default messageNotificationSlice.reducer;
