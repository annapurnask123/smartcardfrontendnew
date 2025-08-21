// src/slices/ticketSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ticketAPI } from "../api/api";

// Async thunk to fetch tickets for user
export const fetchTickets = createAsyncThunk(
  "tickets/fetchTickets",
  async (_, { getState }) => {
    const state = getState();
    const userId = state.auth.user?.id || state.auth.user?._id;
    if (!userId) throw new Error("User not authenticated");
    
    const response = await ticketAPI.getUserTickets(userId);
    return response.data;
  }
);

const ticketSlice = createSlice({
  name: "tickets",
  initialState: {
    tickets: [],
    loading: false,
    error: null,
  },
  reducers: {
    // Reducer to add a new ticket locally
    addTicket: (state, action) => {
      state.tickets.push(action.payload);
    },
    // You can add more reducers like updateTicket, removeTicket if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickets.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

// Export the addTicket action creator
export const { addTicket } = ticketSlice.actions;

// Export the reducer as default export
export default ticketSlice.reducer;
