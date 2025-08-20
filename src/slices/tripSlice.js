// src/redux/slices/tripSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk to fetch trips
export const fetchTrips = createAsyncThunk("trips/fetchTrips", async () => {
  const response = await api.get("/trips");
  return response.data;
});

const tripSlice = createSlice({
  name: "trips",
  initialState: { trips: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default tripSlice.reducer;
