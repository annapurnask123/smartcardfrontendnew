import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

export const fetchWallet = createAsyncThunk(
  'wallet/fetchWallet',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/wallet/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const createWalletRechargeOrder = createAsyncThunk(
  "wallet/createRechargeOrder",
  async ({ userId, amount }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/wallet/recharge", { 
        userId, 
        amount,
        paymentMethod: "wallet" // Use correct payment method
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to create recharge order");
    }
  }
);

export const addMoney = createAsyncThunk(
  "wallet/addMoney",
  async ({ userId, amount, paymentId, description }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/wallet/add", { 
        userId, 
        amount, 
        paymentId, 
        description: description || "Wallet recharge via Razorpay"
      });
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

export const getWalletTransactions = createAsyncThunk(
  "wallet/getTransactions",
  async ({ userId, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/wallet/${userId}/transactions`, {
        params: { page, limit }
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch transactions");
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    walletId: null,
    balance: 0,
    transactions: [],
    loading: false,
    error: null,
    rechargeOrder: null,
    rechargeLoading: false,
  },
  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
    clearRechargeOrder: (state) => {
      state.rechargeOrder = null;
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
        if (action.payload.wallet) {
          state.walletId = action.payload.wallet.id;
          state.balance = action.payload.wallet.balance;
        } else {
          state.balance = action.payload.balance || 0;
        }
        state.transactions = action.payload.transactions || [];
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || "Failed to fetch wallet";
      })
      // createWalletRechargeOrder handlers
      .addCase(createWalletRechargeOrder.pending, (state) => {
        state.rechargeLoading = true;
        state.error = null;
      })
      .addCase(createWalletRechargeOrder.fulfilled, (state, action) => {
        state.rechargeLoading = false;
        state.rechargeOrder = action.payload;
      })
      .addCase(createWalletRechargeOrder.rejected, (state, action) => {
        state.rechargeLoading = false;
        state.error = action.payload?.error || "Failed to create recharge order";
      })
      // addMoney handlers
      .addCase(addMoney.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMoney.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.wallet) {
          state.balance = action.payload.wallet.balance;
        }
      })
      .addCase(addMoney.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || "Failed to add money";
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
        state.error = action.payload?.error || "Failed to deduct fare";
      })
      // getWalletTransactions handlers
      .addCase(getWalletTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions || [];
      });
  },
});

export const { clearWalletError, clearRechargeOrder } = walletSlice.actions;
export default walletSlice.reducer;