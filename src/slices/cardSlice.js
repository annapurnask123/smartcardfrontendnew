import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk for creating virtual card
export const createVirtualCard = createAsyncThunk(
  "card/createVirtualCard",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/cards/create", { userId });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Async thunk for fetching user card
export const fetchUserCard = createAsyncThunk(
  "card/fetchUserCard",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/cards/user/${userId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const cardSlice = createSlice({
  name: "card",
  initialState: {
    card: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetCardState: (state) => {
      state.card = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // create card
      .addCase(createVirtualCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVirtualCard.fulfilled, (state, action) => {
        state.loading = false;
        state.card = action.payload;
      })
      .addCase(createVirtualCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetch card
      .addCase(fetchUserCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserCard.fulfilled, (state, action) => {
        state.loading = false;
        state.card = action.payload;
      })
      .addCase(fetchUserCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetCardState } = cardSlice.actions;
export default cardSlice.reducer;
