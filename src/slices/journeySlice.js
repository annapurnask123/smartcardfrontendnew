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

    try {
      const response = await userJourneyAPI.getUserJourneys(userId);
      return Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
    } catch (error) {
      // Try alternative endpoints if primary fails
      try {
        const response = await userJourneyAPI.getJourneyHistory(userId);
        return Array.isArray(response.data)
          ? response.data
          : response.data?.items || [];
      } catch (secondError) {
        try {
          const response = await userJourneyAPI.getAllJourneys();
          return Array.isArray(response.data)
            ? response.data
            : response.data?.items || [];
        } catch (thirdError) {
          // If all endpoints fail, return empty array
          console.warn("All journey endpoints failed:", {
            error,
            secondError,
            thirdError,
          });
          return [];
        }
      }
    }
  }
);

// Async thunk to update journey progress
export const updateJourneyProgress = createAsyncThunk(
  "journeys/updateJourneyProgress",
  async (updatedJourney, { getState }) => {
    try {
      // Update the journey on the server if it exists
      if (updatedJourney._id) {
        await userJourneyAPI.updateJourney(updatedJourney._id, updatedJourney);
      }

      // Also update in localStorage for offline persistence
      const currentJourneys = JSON.parse(
        localStorage.getItem("journeys") || "[]"
      );
      const updatedJourneys = currentJourneys.map((journey) =>
        journey._id === updatedJourney._id ? updatedJourney : journey
      );
      localStorage.setItem("journeys", JSON.stringify(updatedJourneys));

      return updatedJourney;
    } catch (error) {
      console.error("Error updating journey progress:", error);
      // Still return the updated journey for local state update
      return updatedJourney;
    }
  }
);

// Async thunk to complete a journey
export const completeJourney = createAsyncThunk(
  "journeys/completeJourney",
  async (journeyId, { getState }) => {
    try {
      const response = await userJourneyAPI.completeJourney(journeyId);

      // Also remove from localStorage
      const currentJourneys = JSON.parse(
        localStorage.getItem("journeys") || "[]"
      );
      const updatedJourneys = currentJourneys.filter(
        (journey) => journey._id !== journeyId
      );
      localStorage.setItem("journeys", JSON.stringify(updatedJourneys));

      return response.data;
    } catch (error) {
      console.error("Error completing journey:", error);
      throw error;
    }
  }
);

// Async thunk to fetch station sequence for a journey
export const fetchStationSequence = createAsyncThunk(
  "journeys/fetchStationSequence",
  async ({ startStationId, endStationId }) => {
    try {
      const response = await userJourneyAPI.getStationSequence(
        startStationId,
        endStationId
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching station sequence:", error);
      throw error;
    }
  }
);

const journeySlice = createSlice({
  name: "journeys",
  initialState: {
    journeys: [],
    currentJourney: null,
    stationSequence: [],
    currentStationIndex: 0,
    loading: false,
    error: null,
    tracking: false,
  },
  reducers: {
    setCurrentJourney: (state, action) => {
      state.currentJourney = action.payload;
      // Reset tracking state when setting a new journey
      state.currentStationIndex = 0;
      state.stationSequence = [];
    },
    clearCurrentJourney: (state) => {
      state.currentJourney = null;
      state.currentStationIndex = 0;
      state.stationSequence = [];
      state.tracking = false;
    },
    setStationSequence: (state, action) => {
      state.stationSequence = action.payload;
    },
    setCurrentStationIndex: (state, action) => {
      state.currentStationIndex = action.payload;
    },
    incrementStationIndex: (state) => {
      if (state.currentStationIndex < state.stationSequence.length - 1) {
        state.currentStationIndex += 1;
      }
    },
    setTracking: (state, action) => {
      state.tracking = action.payload;
    },
    // Action to manually update journey progress (for testing or direct updates)
    updateJourneyProgressManually: (state, action) => {
      if (state.currentJourney) {
        state.currentJourney = {
          ...state.currentJourney,
          ...action.payload,
        };

        // Also update in journeys array
        state.journeys = state.journeys.map((journey) =>
          journey._id === state.currentJourney._id
            ? state.currentJourney
            : journey
        );
      }
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
      })
      .addCase(updateJourneyProgress.fulfilled, (state, action) => {
        // Update current journey if it's the one being updated
        if (
          state.currentJourney &&
          state.currentJourney._id === action.payload._id
        ) {
          state.currentJourney = action.payload;
        }

        // Update in journeys array
        state.journeys = state.journeys.map((journey) =>
          journey._id === action.payload._id ? action.payload : journey
        );
      })
      .addCase(completeJourney.fulfilled, (state, action) => {
        // Remove completed journey from state
        state.journeys = state.journeys.filter(
          (journey) => journey._id !== action.payload._id
        );

        // Clear current journey if it was the completed one
        if (
          state.currentJourney &&
          state.currentJourney._id === action.payload._id
        ) {
          state.currentJourney = null;
          state.tracking = false;
        }
      })
      .addCase(fetchStationSequence.fulfilled, (state, action) => {
        state.stationSequence = action.payload.sequence || [];
        state.currentStationIndex = action.payload.currentIndex || 0;
      });
  },
});

export const {
  setCurrentJourney,
  clearCurrentJourney,
  setStationSequence,
  setCurrentStationIndex,
  incrementStationIndex,
  setTracking,
  updateJourneyProgressManually,
} = journeySlice.actions;

export default journeySlice.reducer;
