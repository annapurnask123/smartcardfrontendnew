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
    sourceStation: null, // Added for booking
    destinationStation: null, // Added for booking
  },
  reducers: {
    // Reducer to add a new ticket locally
    addTicket: (state, action) => {
      state.tickets.push(action.payload);
    },
    // Reducer to update a ticket by id
    updateTicket: (state, action) => {
      const updated = action.payload;
      const idx = state.tickets.findIndex(
        (t) =>
          t.id === updated.id || t._id === updated.id || t.id === updated._id
      );
      if (idx !== -1) {
        state.tickets[idx] = { ...state.tickets[idx], ...updated };
      }
    },
    // NEW: Set source station for booking
    setSourceStation: (state, action) => {
      state.sourceStation = action.payload;
    },
    // NEW: Set destination station for booking
    setDestinationStation: (state, action) => {
      state.destinationStation = action.payload;
    },
    // NEW: Clear booking stations
    clearBookingStations: (state) => {
      state.sourceStation = null;
      state.destinationStation = null;
    },
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

// Export the action creators
export const {
  addTicket,
  updateTicket,
  setSourceStation,
  setDestinationStation,
  clearBookingStations,
} = ticketSlice.actions;

// Export the reducer as default export
export default ticketSlice.reducer;
