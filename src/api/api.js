import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1", // relative → uses Vite proxy
  headers: { "Content-Type": "application/json" },
});

// Request interceptor to add auth token (skip for public auth endpoints)
api.interceptors.request.use(
  (config) => {
    const publicPaths = [
      "/users/request-register-phone-otp",
      "/users/verify-phone-otp",
      "/users/request-register-email-otp",
      "/users/verify-email-otp",
      "/users/set-password",
      "/users/register",
      "/users/login/password",
      "/users/request-login-otp",
      "/users/verify-login-otp",
    ];
    const isPublic = publicPaths.some((p) => (config.url || "").startsWith(p));
    if (!isPublic) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      if (config.headers && "Authorization" in config.headers) {
        delete config.headers.Authorization;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API - Updated to match backend OTP flow
export const authAPI = {
  // Registration flow
  requestRegisterPhoneOtp: (phoneNumber) =>
    api.post("/users/request-register-phone-otp", { phoneNumber }),
  verifyPhoneOtp: (phoneNumber, otp, otpHash) =>
    api.post("/users/verify-phone-otp", { phoneNumber, otp, otpHash }),
  requestRegisterEmailOtp: (phoneNumber, email) =>
    api.post("/users/request-register-email-otp", { phoneNumber, email }),
  verifyEmailOtp: (email, otp, otpHash) =>
    api.post("/users/verify-email-otp", { email, otp, otpHash }),
  setPassword: (userId, password, confirmPassword) =>
    api.post("/users/set-password", { userId, password, confirmPassword }),

  register: (name, phoneNumber) =>
    api.post("/users/register", { name, phoneNumber }),

  // Login flow
  loginWithPassword: (phoneNumber, password) =>
    api.post("/users/login/password", { phoneNumber, password }),
  requestLoginOtp: (phoneNumber) =>
    api.post("/users/request-login-otp", { phoneNumber }),
  verifyLoginOtp: (phoneNumber, otp, otpHash) =>
    api.post("/users/verify-login-otp", { phoneNumber, otp, otpHash }),
  // Profile and token verification
  verifyToken: () => api.get("/users/profile"),
  logout: () => api.post("/users/logout"),
};

// User API
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
  changePassword: (data) => api.put("/users/change-password", data),
  deleteAccount: () => api.delete("/users/profile"),
  getUserJourneys: () => api.get("/user-journeys"),
  startJourney: (data) => api.post("/user-journeys/start", data),
  endJourney: (journeyId, data) =>
    api.put(`/user-journeys/${journeyId}/end`, data),
};

// Virtual Card API - Updated to match backend routes
export const cardAPI = {
  // Card Management
  getAllCards: () => api.get("/virtualcards"),
  getUserCards: (userId) => api.get(`/virtualcards/user/${userId}`),
  createCard: (data) => api.post("/virtualcards", data),
  getCard: (cardId) => api.get(`/virtualcards/${cardId}`),
  deleteCard: (cardId) => api.delete(`/virtualcards/${cardId}`),
  getBalance: (cardId) => api.get(`/virtualcards/${cardId}/balance`),

  // Device Management
  assignDevice: (data) => api.post("/virtualcards/assign-device", data),
  unassignDevice: (data) => api.post("/virtualcards/unassign-device", data),

  // Journey Management
  tapIn: (cardId, data) => api.post(`/virtualcards/${cardId}/tap-in`, data),
  tapOut: (cardId, data) => api.post(`/virtualcards/${cardId}/tap-out`, data),

  // QR Code Generation
  generateQR: (cardId) => api.get(`/virtualcards/${cardId}/qr`),
};

// Station API - Updated to match backend routes
export const stationAPI = {
  getAllStations: (params) => api.get("/stations", { params }),
  createStation: (data) => api.post("/stations", data),
  getStation: (stationId) => api.get(`/stations/${stationId}`),
  updateStation: (stationId, data) => api.put(`/stations/${stationId}`, data),
  deleteStation: (stationId) => api.delete(`/stations/${stationId}`),
  getRouteWithTimings: (from, to) =>
    api.get(`/stations/route-with-timings/query?from=${from}&to=${to}`),
  getNextTrains: (stationCode) =>
    api.get(`/stations/${stationCode}/next-trains`),
};

// Route API - Updated to match backend routes
export const routeAPI = {
  getAllRoutes: () => api.get("/routes"),
  createRoute: (data) => api.post("/routes", data),
  getRoute: (routeId) => api.get(`/routes/${routeId}`),
  updateRoute: (routeId, data) => api.put(`/routes/${routeId}`, data),
  deleteRoute: (routeId) => api.delete(`/routes/${routeId}`),
  getRouteShape: (shapeId) => api.get(`/routes/${shapeId}/shape`),
  getRouteStations: (routeId) => api.get(`/routes/${routeId}/stations`),
};

// Ticket API - Updated to match backend routes
export const ticketAPI = {
  bookTicket: (data) => api.post("/tickets/book", data),
  getUserTickets: (userId) => api.get(`/tickets/user/${userId}`),
  getTicket: (ticketId) => api.get(`/tickets/${ticketId}`),
  tapIn: (data) => api.post("/tickets/tapin", data),
  tapOut: (data) => api.post("/tickets/tapout", data),
  cancelTicket: (data) => api.post("/tickets/cancel", data),
  dropEarly: (data) => api.post("/tickets/drop-early", data),
  extendJourney: (data) => api.post("/tickets/extend", data),
  validateQR: (data) => api.post("/tickets/validate-qr", data),
  updateTicketStatus: (ticketId, data) =>
    api.patch(`/tickets/${ticketId}/status`, data),

  // QR Code Generation
  generateQR: (ticketId) => api.get(`/tickets/${ticketId}/qr`),
};

// Payment API - Updated to match backend routes
export const paymentAPI = {
  // Payment Methods
  getPaymentMethods: () => api.get("/payment-methods"),
  addPaymentMethod: (data) => api.post("/payment-methods", data),
  getPaymentMethod: (methodId) => api.get(`/payment-methods/${methodId}`),
  updatePaymentMethod: (methodId, data) =>
    api.put(`/payment-methods/${methodId}`, data),
  deletePaymentMethod: (methodId) => api.delete(`/payment-methods/${methodId}`),

  // Payment Processing
  createPaymentOrder: (data) => api.post("/payments/create-order", data),
  verifyPayment: (data) => api.post("/payments/verify", data),
  handleWebhook: (data) => api.post("/payments/webhook", data),
};

export const subscriptionPlanAPI = {
  getAll: () => api.get("/subscriptionplans"),
  getById: (planId) => api.get(`/subscriptionplans/${planId}`),
  create: (data) => api.post("/subscriptionplans", data),
  update: (planId, data) => api.put(`/subscriptionplans/${planId}`, data),
  delete: (planId) => api.delete(`/subscriptionplans/${planId}`),
};

// Subscription API - Only for user subscriptions
export const subscriptionAPI = {
  getAllSubscriptions: () => api.get("/subscriptions"),
  createSubscription: (data) => api.post("/subscriptions", data),
  getSubscription: (subscriptionId) =>
    api.get(`/subscriptions/${subscriptionId}`),
  updateSubscription: (subscriptionId, data) =>
    api.put(`/subscriptions/${subscriptionId}`, data),
  deleteSubscription: (subscriptionId) =>
    api.delete(`/subscriptions/${subscriptionId}`),
  cancelSubscription: (subscriptionId) =>
    api.post(`/subscriptions/${subscriptionId}/cancel`),
  renewSubscription: (subscriptionId) =>
    api.post(`/subscriptions/${subscriptionId}/renew`),
  activateSubscription: (subscriptionId, data) =>
    api.post(`/subscriptions/${subscriptionId}/activate`, data),
  activateRenewedSubscription: (data) =>
    api.post("/subscriptions/renew/activate", data),
};

// Train Schedule API - Legacy (keeping for compatibility)
export const legacyScheduleAPI = {
  getSchedules: (routeId, date) =>
    api.get(`/train-schedules?routeId=${routeId}&date=${date}`),
  getSchedule: (scheduleId) => api.get(`/train-schedules/${scheduleId}`),
  getLiveUpdates: (routeId) => api.get(`/train-schedules/live/${routeId}`),
};

// Notification API
export const notificationAPI = {
  getNotifications: () => api.get("/notifications"),
  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),
  getUnreadCount: () => api.get("/notifications/unread-count"),
};

// Transaction API - New backend feature
export const transactionAPI = {
  getAllTransactions: () => api.get("/transactions"),
  getUserTransactions: (userId) => api.get(`/transactions/user/${userId}`),
  createTransaction: (data) => api.post("/transactions", data),
  getTransaction: (transactionId) => api.get(`/transactions/${transactionId}`),
  updateTransaction: (transactionId, data) =>
    api.put(`/transactions/${transactionId}`, data),
  deleteTransaction: (transactionId) =>
    api.delete(`/transactions/${transactionId}`),
};

// Trip API - New backend feature
export const tripAPI = {
  getAllTrips: () => api.get("/trips"),
  createTrip: (data) => api.post("/trips", data),
  getTrip: (tripId) => api.get(`/trips/${tripId}`),
  updateTrip: (tripId, data) => api.put(`/trips/${tripId}`, data),
  deleteTrip: (tripId) => api.delete(`/trips/${tripId}`),
  getTripDetails: (tripId) => api.get(`/trips/${tripId}/details`),
};

// User Journey API - New backend feature
export const userJourneyAPI = {
  getUserJourneys: (userId) => api.get(`/user-journeys/${userId}`),
  startJourney: (data) => api.post("/user-journeys/start", data),
  endJourney: (data) => api.post("/user-journeys/end", data),
};

// Train Schedule API - Updated
export const scheduleAPI = {
  getSchedules: () => api.get("/train-schedules"),
  createSchedule: (data) => api.post("/train-schedules", data),
  getSchedule: (scheduleId) => api.get(`/train-schedules/${scheduleId}`),
  updateSchedule: (scheduleId, data) =>
    api.put(`/train-schedules/${scheduleId}`, data),
  deleteSchedule: (scheduleId) => api.delete(`/train-schedules/${scheduleId}`),
};

export default api;
