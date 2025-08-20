// src/redux/slices/journeySlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk to fetch journeys
export const fetchJourneys = createAsyncThunk(
  "journeys/fetchJourneys",
  async () => {
    const response = await api.get("/journeys");
    return response.data;
  }
);

const journeySlice = createSlice({
  name: "journeys",
  initialState: { journeys: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchJourneys.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchJourneys.fulfilled, (state, action) => {
        state.loading = false;
        state.journeys = action.payload;
      })
      .addCase(fetchJourneys.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default journeySlice.reducer;
