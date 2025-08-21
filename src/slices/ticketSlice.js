// src/slices/ticketSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ticketAPI } from "../api/api";

// Async thunk to fetch tickets for user
export const fetchTickets = createAsyncThunk(
  "tickets/fetchTickets",
  async () => {
    const response = await ticketAPI.getUserTickets();
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
