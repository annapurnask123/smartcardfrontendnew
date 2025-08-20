// src/redux/slices/walletSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

// Async thunk: fetch wallet details
export const fetchWallet = createAsyncThunk(
  "wallet/fetchWallet",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/wallet/${userId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch wallet");
    }
  }
);

// Async thunk: add money to wallet
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

// Async thunk: deduct fare
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
    transactions: [], // [{id, type: 'credit'|'debit', amount, date}]
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
      // Fetch Wallet
      .addCase(fetchWallet.pending, (state) => {
        state.loading = true;
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

      // Add Money
      .addCase(addMoney.pending, (state) => {
        state.loading = true;
      })
      .addCase(addMoney.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.transactions.unshift(action.payload.transaction); // latest first
      })
      .addCase(addMoney.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Deduct Fare
      .addCase(deductFare.pending, (state) => {
        state.loading = true;
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
