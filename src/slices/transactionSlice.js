// src/slices/transactionSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { transactionAPI } from "../api/api";

// Async thunk to fetch transactions
export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (_, { getState }) => {
    const state = getState();
    const userId = state.auth.user?.id || state.auth.user?._id;
    if (!userId) throw new Error("User not authenticated");
    
    const response = await transactionAPI.getUserTransactions(userId);
    return Array.isArray(response.data) ? response.data : response.data?.items || [];
  }
);

const transactionSlice = createSlice({
  name: "transactions",
  initialState: { transactions: [], loading: false, error: null },
  reducers: {
    addTransaction: (state, action) => {
      state.transactions.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { addTransaction } = transactionSlice.actions;
export default transactionSlice.reducer;
