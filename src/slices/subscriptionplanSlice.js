import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { subscriptionPlanAPI } from "../api/api";

// Fetch all subscription plans
export const fetchSubscriptionPlans = createAsyncThunk(
  "subscriptionPlans/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await subscriptionPlanAPI.getAll();
      console.log('Subscription plans API response:', res.data);
      
      // Ensure we only return real backend data
      if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        console.warn('No subscription plans found in backend');
        return [];
      }
      
      return Array.isArray(res.data) ? res.data : res.data.items || [];
    } catch (err) {
      console.error('Failed to fetch subscription plans from backend:', err);
      // Do NOT return dummy data - return empty array to force user to check backend
      return thunkAPI.rejectWithValue(
        "Failed to fetch subscription plans from backend. Please ensure backend is running and has subscription plans data."
      );
    }
  }
);

// Fetch single subscription plan by ID
export const fetchSubscriptionPlanById = createAsyncThunk(
  "subscriptionPlans/fetchById",
  async (id, thunkAPI) => {
    try {
      const res = await subscriptionPlanAPI.getById(id);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to fetch subscription plan"
      );
    }
  }
);

// Create new subscription plan
export const createSubscriptionPlan = createAsyncThunk(
  "subscriptionPlans/create",
  async (planData, thunkAPI) => {
    try {
      const res = await subscriptionPlanAPI.create(planData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to create subscription plan"
      );
    }
  }
);

// Update subscription plan
export const updateSubscriptionPlan = createAsyncThunk(
  "subscriptionPlans/update",
  async ({ id, planData }, thunkAPI) => {
    try {
      const res = await subscriptionPlanAPI.update(id, planData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to update subscription plan"
      );
    }
  }
);

// Delete subscription plan
export const deleteSubscriptionPlan = createAsyncThunk(
  "subscriptionPlans/delete",
  async (id, thunkAPI) => {
    try {
      await subscriptionPlanAPI.delete(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to delete subscription plan"
      );
    }
  }
);

const subscriptionPlanSlice = createSlice({
  name: "subscriptionPlans",
  initialState: {
    plans: [],
    selectedPlan: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearSelectedPlan: (state) => {
      state.selectedPlan = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchSubscriptionPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchSubscriptionPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch by ID
      .addCase(fetchSubscriptionPlanById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlanById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPlan = action.payload;
      })
      .addCase(fetchSubscriptionPlanById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createSubscriptionPlan.fulfilled, (state, action) => {
        state.plans.push(action.payload);
      })

      // Update
      .addCase(updateSubscriptionPlan.fulfilled, (state, action) => {
        state.plans = state.plans.map((plan) =>
          plan.id === action.payload.id ? action.payload : plan
        );
      })

      // Delete
      .addCase(deleteSubscriptionPlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter((plan) => plan.id !== action.payload);
      });
  },
});

export const { clearSelectedPlan } = subscriptionPlanSlice.actions;
export default subscriptionPlanSlice.reducer;
