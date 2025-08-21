import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

export const fetchWallet = createAsyncThunk(
  "wallet/fetchWallet",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/wallet/${userId}`);
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        return rejectWithValue("Wallet not found for this user.");
      }
      return rejectWithValue(error.response?.data || "Failed to fetch wallet");
    }
  }
);

export const addMoney = createAsyncThunk(
  "wallet/addMoney",
  async ({ userId, amount }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/wallet/${userId}/add`, { amount });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to add money");
    }
  }
);

export const deductFare = createAsyncThunk(
  "wallet/deductFare",
  async ({ userId, amount }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/wallet/${userId}/deduct`, { amount });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to deduct fare");
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    balance: 0,
    transactions: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchWallet handlers
      .addCase(fetchWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.transactions = action.payload.transactions || [];
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addMoney handlers
      .addCase(addMoney.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMoney.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(addMoney.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deductFare handlers
      .addCase(deductFare.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deductFare.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(deductFare.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
