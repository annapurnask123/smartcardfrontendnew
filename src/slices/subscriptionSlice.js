import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { subscriptionAPI } from "../api/api";

export const fetchSubscriptions = createAsyncThunk(
  "subscriptions/fetchSubscriptions",
  async () => {
    const response = await subscriptionAPI.getAllSubscriptions();
    return response.data;
  }
);

const subscriptionSlice = createSlice({
  name: "subscriptions",
  initialState: { subscriptions: [], loading: false, error: null },
  reducers: {
    addSubscription: (state, action) => {
      // Add or update subscription in state.subscriptions
      const index = state.subscriptions.findIndex(
        (s) => s.id === action.payload.id
      );
      if (index >= 0) {
        state.subscriptions[index] = action.payload;
      } else {
        state.subscriptions.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptions = action.payload;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { addSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
