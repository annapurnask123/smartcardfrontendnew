import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import stationReducer from "../slices/stationSlice";
import dataReducer from "../slices/dataSlice";
import subscriptionplanReducer from "../slices/subscriptionplanSlice";
export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    stations: stationReducer,
    subscriptionplan: subscriptionplanReducer, // Add subscription plan reducer
  },
});
