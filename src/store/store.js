import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import stationReducer from "../slices/stationSlice";
import subscriptionplanReducer from "../slices/subscriptionplanSlice";
import walletReducer from "../slices/walletSlice";
import uiReducer from "../slices/uiSlice";
import ticketReducer from "../slices/ticketSlice";
import notificationReducer from "../slices/notificationSlice";
import transactionReducer from "../slices/transactionSlice";
import journeyReducer from "../slices/journeySlice";
import tripReducer from "../slices/tripSlice";
import cardReducer from "../slices/cardSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    stations: stationReducer,
    subscriptionPlans: subscriptionplanReducer, // Fixed: Changed from subscriptionplan to subscriptionPlans
    wallet: walletReducer,
    ui: uiReducer,
    tickets: ticketReducer,
    notifications: notificationReducer,
    transactions: transactionReducer,
    journeys: journeyReducer,
    trips: tripReducer,
    card: cardReducer,
  },
});
