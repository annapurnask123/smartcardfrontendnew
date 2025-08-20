// src/redux/slices/paymentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk to initiate payment
export const makePayment = createAsyncThunk(
  "payments/makePayment",
  async (paymentData) => {
    const response = await api.post("/payments", paymentData);
    return response.data;
  }
);

const paymentSlice = createSlice({
  name: "payments",
  initialState: { payments: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(makePayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(makePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.payments.push(action.payload);
      })
      .addCase(makePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default paymentSlice.reducer;
