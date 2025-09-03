import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user:
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    hydrateFromStorage(state) {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      state.token = token;
      state.user = user ? JSON.parse(user) : null;
    },
  },
});

export const { loginSuccess, logout, hydrateFromStorage } = authSlice.actions;
export default authSlice.reducer;
