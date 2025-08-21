// src/slices/journeySlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { userJourneyAPI } from "../api/api";

// Async thunk to fetch journeys
export const fetchJourneys = createAsyncThunk(
  "journeys/fetchJourneys",
  async (_, { getState }) => {
    const state = getState();
    const userId = state.auth.user?.id || state.auth.user?._id;
    if (!userId) throw new Error("User not authenticated");
    
    const response = await userJourneyAPI.getUserJourneys(userId);
    return response.data;
  }
);

const journeySlice = createSlice({
  name: "journeys",
  initialState: { 
    journeys: [], 
    currentJourney: null,
    loading: false, 
    error: null 
  },
  reducers: {
    setCurrentJourney: (state, action) => {
      state.currentJourney = action.payload;
    },
    clearCurrentJourney: (state) => {
      state.currentJourney = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJourneys.pending, (state) => {
        state.loading = true;
        state.error = null;
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

export const { setCurrentJourney, clearCurrentJourney } = journeySlice.actions;
export default journeySlice.reducer;
