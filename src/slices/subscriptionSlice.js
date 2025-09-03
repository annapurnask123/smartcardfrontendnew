import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { subscriptionAPI } from "../api/api";

export const fetchSubscriptions = createAsyncThunk(
  "subscriptions/fetchSubscriptions",
  async () => {
    const response = await subscriptionAPI.getAllSubscriptions();
    return response.data;
  }
);

// ✅ cancel subscription thunk
export const cancelSubscription = createAsyncThunk(
  "subscriptions/cancelSubscription",
  async (subscriptionId, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.cancelSubscription(subscriptionId);
      return { id: subscriptionId, data: response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ✅ renew subscription thunk
export const renewSubscription = createAsyncThunk(
  "subscriptions/renewSubscription",
  async (subscriptionId, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.renewSubscription(subscriptionId);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ✅ update subscription thunk (for updating dates, status, etc.)
export const updateSubscription = createAsyncThunk(
  "subscriptions/updateSubscription",
  async ({ subscriptionId, updates }, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.updateSubscription(subscriptionId, updates);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ✅ activate subscription after payment
export const activateSubscription = createAsyncThunk(
  "subscriptions/activateSubscription",
  async ({ subscriptionId, paymentData }, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.activateSubscription(subscriptionId, paymentData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const subscriptionSlice = createSlice({
  name: "subscriptions",
  initialState: { subscriptions: [], loading: false, error: null },
  reducers: {
    addSubscription: (state, action) => {
      const index = state.subscriptions.findIndex(
        (s) => s.id === action.payload.id
      );
      if (index >= 0) {
        state.subscriptions[index] = action.payload;
      } else {
        state.subscriptions.push(action.payload);
      }
    },
    // ✅ Manual update for immediate UI changes
    updateSubscriptionLocal: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.subscriptions.findIndex(
        (s) => s.id === id || s._id === id
      );
      if (index >= 0) {
        state.subscriptions[index] = { ...state.subscriptions[index], ...updates };
      }
    },
    // ✅ Clear error state
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetch
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
      })
      // cancel
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        const { id } = action.payload;
        state.subscriptions = state.subscriptions.map((s) =>
          s.id === id || s._id === id ? { ...s, status: "cancelled" } : s
        );
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.error = action.payload;
      })
      // renew
      .addCase(renewSubscription.fulfilled, (state, action) => {
        const updatedSubscription = action.payload;
        state.subscriptions = state.subscriptions.map((s) =>
          s.id === updatedSubscription.id || s._id === updatedSubscription._id 
            ? updatedSubscription 
            : s
        );
      })
      .addCase(renewSubscription.rejected, (state, action) => {
        state.error = action.payload;
      })
      // update
      .addCase(updateSubscription.fulfilled, (state, action) => {
        const updatedSubscription = action.payload;
        state.subscriptions = state.subscriptions.map((s) =>
          s.id === updatedSubscription.id || s._id === updatedSubscription._id 
            ? updatedSubscription 
            : s
        );
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.error = action.payload;
      })
      // activate
      .addCase(activateSubscription.fulfilled, (state, action) => {
        const activatedSubscription = action.payload;
        state.subscriptions = state.subscriptions.map((s) =>
          s.id === activatedSubscription.id || s._id === activatedSubscription._id 
            ? { ...activatedSubscription, status: "active" } 
            : s
        );
      })
      .addCase(activateSubscription.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { 
  addSubscription, 
  updateSubscriptionLocal, 
  clearError 
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;