import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { stationAPI } from "../api/api";

export const fetchStations = createAsyncThunk(
  "stations/fetchStations",
  async (_, thunkAPI) => {
    const { data } = await stationAPI.getAllStations();
    return Array.isArray(data) ? data : data.items || [];
  }
);

const stationSlice = createSlice({
  name: "stations",
  initialState: {
    allItems: [],
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    error: null,
    search: "",
  },
  reducers: {
    setSearch(state, action) {
      state.search = action.payload;
      state.page = 1;
      // Filter and paginate
      const filtered = state.allItems.filter((st) =>
        st.name?.toLowerCase().includes(action.payload.toLowerCase())
      );
      state.total = filtered.length;
      state.items = filtered.slice(0, state.pageSize);
    },
    setPage(state, action) {
      state.page = action.payload;
      const filtered = state.search
        ? state.allItems.filter((st) =>
            st.name?.toLowerCase().includes(state.search.toLowerCase())
          )
        : state.allItems;
      const start = (state.page - 1) * state.pageSize;
      state.items = filtered.slice(start, start + state.pageSize);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStations.fulfilled, (state, action) => {
        state.loading = false;
        state.allItems = action.payload;
        state.total = action.payload.length;
        state.page = 1;
        state.items = action.payload.slice(0, state.pageSize);
      })
      .addCase(fetchStations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setSearch, setPage } = stationSlice.actions;
export default stationSlice.reducer;
