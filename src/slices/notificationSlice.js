// src/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { notificationAPI } from "../api/api";

// Async thunk to fetch notifications
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getNotifications();
      return Array.isArray(response.data) ? response.data : response.data?.items || [];
    } catch (error) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('Authentication failed for notifications, returning empty array');
        return [];
      }
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch notifications');
    }
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: { messages: [], loading: false, error: null },
  reducers: {
    addNotification: (state, action) => {
      const newNotification = action.payload;
      // Check for duplicates based on type, title, and message
      const isDuplicate = state.messages.some(existing => 
        existing.type === newNotification.type &&
        existing.title === newNotification.title &&
        existing.message === newNotification.message &&
        Math.abs(new Date(existing.createdAt || existing.timestamp) - new Date(newNotification.createdAt || newNotification.timestamp)) < 5000 // Within 5 seconds
      );
      
      if (!isDuplicate) {
        state.messages.unshift(newNotification); // Add to top
      }
    },
    clearNotifications: (state) => {
      state.messages = [];
    },
    setNotifications: (state, action) => {
      const notifications = Array.isArray(action.payload)
        ? action.payload
        : [action.payload].filter(Boolean);
      
      // Deduplicate notifications
      const uniqueNotifications = [];
      const seen = new Set();
      
      notifications.forEach(notif => {
        const key = `${notif.type}_${notif.title}_${notif.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueNotifications.push(notif);
        }
      });
      
      state.messages = uniqueNotifications;
    },
    markAllNotificationsRead: (state) => {
      state.messages = state.messages.map((n) => ({ ...n, read: true }));
    },
    markNotificationRead: (state, action) => {
      const notificationId = action.payload;
      state.messages = state.messages.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // Apply deduplication when setting fetched notifications
        const notifications = Array.isArray(action.payload) ? action.payload : [];
        const uniqueNotifications = [];
        const seen = new Set();
        
        notifications.forEach(notif => {
          const key = `${notif.type}_${notif.title}_${notif.message}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueNotifications.push(notif);
          }
        });
        
        state.messages = uniqueNotifications;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const {
  addNotification,
  clearNotifications,
  setNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = notificationSlice.actions;
export default notificationSlice.reducer;