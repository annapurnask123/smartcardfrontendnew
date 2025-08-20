// src/redux/slices/scheduleSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk to fetch schedules
export const fetchSchedules = createAsyncThunk(
  "schedules/fetchSchedules",
  async () => {
    const response = await api.get("/schedules");
    return response.data;
  }
);

const scheduleSlice = createSlice({
  name: "schedules",
  initialState: { schedules: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = action.payload;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default scheduleSlice.reducer;
