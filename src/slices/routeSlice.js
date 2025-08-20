import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

// Async thunk for fetching all routes
export const fetchRoutes = createAsyncThunk(
  "route/fetchRoutes",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/routes");
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Async thunk for searching route
export const searchRoute = createAsyncThunk(
  "route/searchRoute",
  async ({ source, destination }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/routes/search", {
        source,
        destination,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const routeSlice = createSlice({
  name: "route",
  initialState: {
    routes: [],
    selectedRoute: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearSelectedRoute: (state) => {
      state.selectedRoute = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch all routes
      .addCase(fetchRoutes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.loading = false;
        state.routes = action.payload;
      })
      .addCase(fetchRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // search route
      .addCase(searchRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRoute = action.payload;
      })
      .addCase(searchRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedRoute } = routeSlice.actions;
export default routeSlice.reducer;
