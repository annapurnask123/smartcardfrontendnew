// src/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { notificationAPI } from "../api/api";

// Async thunk to fetch notifications
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async () => {
    const response = await notificationAPI.getNotifications();
    return Array.isArray(response.data) ? response.data : response.data?.items || [];
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: { messages: [], loading: false, error: null },
  reducers: {
    addNotification: (state, action) => {
      state.messages.unshift(action.payload); // Add to top
    },
    clearNotifications: (state) => {
      state.messages = [];
    },
    setNotifications: (state, action) => {
      state.messages = Array.isArray(action.payload)
        ? action.payload
        : [action.payload].filter(Boolean);
    },
    markAllNotificationsRead: (state) => {
      state.messages = state.messages.map((n) => ({ ...n, read: true }));
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
        state.messages = action.payload;
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
} = notificationSlice.actions;
export default notificationSlice.reducer;
