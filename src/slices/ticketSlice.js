// src/redux/slices/ticketSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk to fetch tickets
export const fetchTickets = createAsyncThunk(
  "tickets/fetchTickets",
  async () => {
    const response = await api.get("/tickets");
    return response.data;
  }
);

const ticketSlice = createSlice({
  name: "tickets",
  initialState: { tickets: [], loading: false, error: null },
  reducers: {},
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

export default ticketSlice.reducer;
