import axios from "axios";

const apiBase = (import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5000/api/v1").replace(
  /\/$/,
  ""
);
const api = axios.create({
  baseURL: apiBase,
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
      "/stations",
      "/subscription-plans",
      "/notifications",
    ];
    const isPublic = publicPaths.some((p) => (config.url || "").startsWith(p));
    // Log minimal request for debugging 500s (non-sensitive)
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.debug("[API]", config.method?.toUpperCase(), config.url);
    }
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

// Resilient helpers: tolerate 404 by returning empty results so UI doesn't break
async function safeGet(url, options = {}) {
  try {
    return await api.get(url, options);
  } catch (err) {
    if (err?.response?.status === 404) {
      return { data: Array.isArray(options?.defaultData) ? [] : (options?.defaultData ?? []) };
    }
    throw err;
  }
}

async function safePost(url, body = {}, options = {}) {
  try {
    return await api.post(url, body, options);
  } catch (err) {
    if (err?.response?.status === 404) {
      return { data: options?.defaultData ?? {} };
    }
    throw err;
  }
}

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

// Helpers
function normalizePhoneFormats(input) {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  // derive e164 for India by default if 10 digits, or preserve if already has country code
  let e164 = raw.startsWith("+") ? raw : "";
  if (!e164) {
    if (digits.length === 10) e164 = `+91${digits}`;
    else if (digits.length === 12 && digits.startsWith("91"))
      e164 = `+${digits}`;
    else e164 = raw; // fallback
  }
  const phoneOnlyDigits = digits;
  const countryCode = e164.startsWith("+")
    ? `+${(e164.match(/^\+(\d{1,3})/) || [, ""])[1]}`
    : "+91";
  return { e164, digits: phoneOnlyDigits, countryCode };
}

// Auth API - Updated to match backend OTP flow
export const authAPI = {
  // Registration flow
  requestRegisterPhoneOtp: (phoneNumber) => {
    const fmt = normalizePhoneFormats(phoneNumber);
    return api.post("/users/request-register-phone-otp", {
      phoneNumber: fmt.e164,
      phone: fmt.digits,
      countryCode: fmt.countryCode,
      mobile: fmt.digits,
      mobileNumber: fmt.digits,
      phone_number: fmt.e164,
      mobile_number: fmt.e164,
      msisdn: fmt.digits,
    });
  },
  verifyPhoneOtp: (phoneNumber, otp, otpHash) =>
    api.post(
      "/users/verify-phone-otp",
      (() => {
        const fmt = normalizePhoneFormats(phoneNumber);
        return {
          phoneNumber: fmt.e164,
          phone: fmt.digits,
          countryCode: fmt.countryCode,
          otp,
          otpHash,
        };
      })()
    ),
  requestRegisterEmailOtp: (phoneNumber, email) =>
    api.post(
      "/users/request-register-email-otp",
      (() => {
        const fmt = normalizePhoneFormats(phoneNumber);
        return {
          phoneNumber: fmt.e164,
          phone: fmt.digits,
          countryCode: fmt.countryCode,
          email,
          mobile: fmt.digits,
          mobileNumber: fmt.digits,
          phone_number: fmt.e164,
          mobile_number: fmt.e164,
          msisdn: fmt.digits,
        };
      })()
    ),
  verifyEmailOtp: (email, otp, otpHash) =>
    api.post("/users/verify-email-otp", { email, otp, otpHash }),
  setPassword: (userId, password, confirmPassword) =>
    api.post("/users/set-password", { userId, password, confirmPassword }),

  register: (name, phoneNumber) =>
    api.post("/users/register", { name, phoneNumber }),

  // Login flow
  loginWithPassword: (phoneNumber, password) =>
    api.post(
      "/users/login/password",
      (() => {
        const fmt = normalizePhoneFormats(phoneNumber);
        return {
          phoneNumber: fmt.e164,
          phone: fmt.digits,
          countryCode: fmt.countryCode,
          password,
        };
      })()
    ),
  requestLoginOtp: (phoneNumber) => {
    const fmt = normalizePhoneFormats(phoneNumber);
    return api.post("/users/request-login-otp", {
      phoneNumber: fmt.e164,
      phone: fmt.digits,
      countryCode: fmt.countryCode,
      mobile: fmt.digits,
      mobileNumber: fmt.digits,
      phone_number: fmt.e164,
      mobile_number: fmt.e164,
      msisdn: fmt.digits,
    });
  },
  verifyLoginOtp: (phoneNumber, otp, otpHash) =>
    api.post(
      "/users/verify-login-otp",
      (() => {
        const fmt = normalizePhoneFormats(phoneNumber);
        return {
          phoneNumber: fmt.e164,
          phone: fmt.digits,
          countryCode: fmt.countryCode,
          otp,
          otpHash,
        };
      })()
    ),
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
  getUserJourneys: () => safeGet("/user-journeys", { defaultData: [] }),
  startJourney: (data) => api.post("/user-journeys/start", data),
  endJourney: (journeyId, data) =>
    api.put(`/user-journeys/${journeyId}/end`, data),
};

// Virtual Card API - Updated to match backend routes
export const cardAPI = {
  getAllCards: () => api.get("/virtualcards"),
  createCard: (data) => api.post("/virtualcards", data),
  getCard: (cardId) => api.get(`/virtualcards/${cardId}`),
  getUserCards: (userId) => api.get(`/virtualcards/user/${userId}`),
  updateCard: (cardId, data) => api.put(`/virtualcards/${cardId}`, data),
  deleteCard: (cardId) => api.delete(`/virtualcards/${cardId}`),
  checkBalance: (cardId) => api.get(`/virtualcards/${cardId}/balance`),
  rechargeCard: (cardId, data) => api.post(`/virtualcards/${cardId}/recharge`, data),
  rechargeByCardNumber: (data) => api.post("/virtualcards/recharge-by-number", data),
  tapIn: (cardId, data) => {
    const payload = {
      stationIdentifier: data.stationIdentifier || data.stationId,
      deviceId: data.deviceId || getDeviceId(),
      qrData: data.qrData || JSON.stringify({
        cardNumber: data.cardNumber || 'VM-DEFAULT',
        token: data.token || `web-token-${Date.now()}`
      }),
      chosenPlanId: data.chosenPlanId || data.subscriptionId || null,
      paymentMethod: data.paymentMethod || 'subscription'
    };
    return api.post(`/virtualcards/${cardId}/tap-in`, payload);
  },
  tapOut: (cardId, data) => {
    const payload = {
      endStation: data.endStation || data.stationId,
      deviceId: data.deviceId || getDeviceId(),
      qrData: data.qrData || JSON.stringify({
        cardNumber: data.cardNumber || 'VM-DEFAULT',
        token: data.token || `web-token-${Date.now()}`
      }),
      paymentMethod: data.paymentMethod || data.method,
      chosenPlanId: data.chosenPlanId || data.subscriptionId || null
    };
    return api.post(`/virtualcards/${cardId}/tap-out`, payload);
  },
  // Device assignment endpoints commented out for future implementation
  // assignDevice: (data) => api.post("/virtualcards/assign-device", data),
  // unassignDevice: (data) => api.post("/virtualcards/unassign-device", data),
  getCardByNumber: (cardNumber) => api.get(`/virtualcards/by-number/${cardNumber}`),
  // QR Code Generation
  generateQR: (cardId) => api.get(`/virtualcards/${cardId}/qr`),
};

// Helper function to generate device ID
function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `web-${navigator.userAgent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

// Station API - Updated to match backend routes
export const stationAPI = {
  getAllStations: (params) => api.get("/stations", { params }),
  createStation: (data) => api.post("/stations", data),
  getStation: (stationId) => api.get(`/stations/${stationId}`),
  updateStation: (stationId, data) => api.put(`/stations/${stationId}`, data),
  deleteStation: (stationId) => api.delete(`/stations/${stationId}`),
  getRouteWithTimings: (from, to) =>
    api.get("/stations/route-with-timings/query", {
      params: { from, to },
    }),
  getNextTrains: (stationCode) =>
    api.get(`/stations/${stationCode}/next-trains`),
  getStationDepartures: (stationId) =>
    api.get(`/stations/${stationId}/departures`),
  getStationArrivals: (stationId) =>
    api.get(`/stations/${stationId}/arrivals`),
  getStationSchedule: (stationId) =>
    api.get(`/stations/${stationId}/schedule`),
};

// Route API - Updated to match backend routes
export const routeAPI = {
  getAllRoutes: () => api.get("/routes"),
  getRoute: (routeId) => api.get(`/routes/${routeId}`),
  getRouteStations: (routeId) => api.get(`/routes/${routeId}/stations`),
  getRouteShape: (routeId) => api.get(`/routes/${routeId}/shape`),
  findRoutes: (data) => api.post("/routes/find", data),
  createRoute: (data) => api.post("/routes", data),
  updateRoute: (routeId, data) => api.put(`/routes/${routeId}`, data),
  deleteRoute: (routeId) => api.delete(`/routes/${routeId}`),
};

// Ticket API - Updated to match backend routes
export const ticketAPI = {
  bookTicket: (data) => {
    const payload = {
      ...data,
      // Ensure all IDs are strings to prevent ObjectId casting issues
      userId: String(data.userId),
      startStationId: String(data.startStationId),
      endStationId: String(data.endStationId)
    };
    return api.post("/tickets/book", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  bookMultiRouteTicket: (data) => {
    const payload = {
      ...data,
      userId: String(data.userId),
      stations: data.stations.map(station => ({
        ...station,
        stationId: String(station.stationId)
      }))
    };
    return api.post("/tickets/book-multi-route", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  getUserTickets: (userId) => api.get(`/tickets/user/${String(userId)}`, {
    headers: {
      'X-Id-Type': 'string'
    }
  }),
  
  getTicket: (ticketId) => api.get(`/tickets/${String(ticketId)}`, {
    headers: {
      'X-Id-Type': 'string'
    }
  }),
  
  tapIn: (data) => {
    if (!data.ticketId || !data.stationId) {
      throw new Error("ticketId and stationId are required");
    }
    const payload = {
      ticketId: String(data.ticketId),
      stationId: String(data.stationId),
      timestamp: data.timestamp || new Date().toISOString()
    };
    return api.post("/tickets/tapin", payload, {
      headers: { "X-Id-Type": "string" },
    });
  },

  tapOut: (data) => {
    if (!data.ticketId || !data.stationId) {
      throw new Error("ticketId and stationId are required");
    }
    const payload = {
      ticketId: String(data.ticketId),
      stationId: String(data.stationId),
    };
    return api.post("/tickets/tapout", payload, {
      headers: { "X-Id-Type": "string" },
    });
  },

  
  cancelTicket: (data) => {
    const payload = {
      ...data,
      ticketId: String(data.ticketId),
      userId: String(data.userId)
    };
    return api.post("/tickets/cancel", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  dropEarly: (data) => {
    const payload = {
      ...data,
      ticketId: String(data.ticketId),
      userId: String(data.userId)
    };
    return api.post("/tickets/drop-early", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  extendTicket: (data) => {
    const payload = {
      ...data,
      ticketId: String(data.ticketId),
      userId: String(data.userId),
      newEndStationId: String(data.newEndStationId),
      additionalFare: data.additionalFare
    };
    return api.post("/tickets/extend", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  extendJourney: (data) => {
    const payload = {
      ...data,
      ticketId: String(data.ticketId),
      userId: String(data.userId),
      newEndStationId: String(data.newEndStationId),
      additionalFare: data.additionalFare,
      amount: data.amount || data.additionalFare,
      paymentMethod: data.paymentMethod || "card",
      description: data.description
    };
    return api.post("/tickets/extend", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  validateQR: (data) => {
    const payload = {
      ...data,
      ticketId: String(data.ticketId)
    };
    return api.post("/tickets/validate-qr", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  updateTicketStatus: (ticketId, data) => {
    const payload = {
      ...data,
      userId: data.userId ? String(data.userId) : undefined
    };
    return api.patch(`/tickets/${String(ticketId)}/status`, payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  calculateFare: (data) => {
    const payload = {
      ...data,
      startStationId: String(data.startStationId),
      endStationId: String(data.endStationId)
    };
    return api.post('/tickets/calculate-fare', payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },

  // QR Code Generation
  generateQR: (ticketId) => api.get(`/tickets/${String(ticketId)}/qr`, {
    headers: {
      'X-Id-Type': 'string'
    }
  }),
};

// Payment API
export const paymentAPI = {
  createPaymentOrder: (data) => {
    let payload;
    
    // Handle wallet_payment type by using the original type
    const actualType = data.type === 'wallet_payment' ? (data.originalType || 'ticket') : data.type;
    
    switch (actualType) {
      case 'subscription':
        payload = {
          type: 'subscription',
          id: String(data.subscriptionId || data.id),
          userId: String(data.userId),
          amount: data.amount,
          paymentMethod: data.paymentMethod || "razorpay"
        };
        break;
        
      case 'ticket':
        // Ensure we have a valid ticket ID
        const ticketId = data.ticketId || data.id;
        if (!ticketId || ticketId === 'undefined') {
          throw new Error('Valid ticket ID is required for ticket payments');
        }
        
        payload = {
          type: 'ticket',
          id: String(ticketId),
          userId: String(data.userId),
          amount: data.amount,
          paymentMethod: data.paymentMethod || "razorpay"
        };
        break;
        
      case 'ticket_extend':
        const extendTicketId = data.ticketId || data.id;
        if (!extendTicketId || extendTicketId === 'undefined') {
          throw new Error('Valid ticket ID is required for ticket extension');
        }
        
        payload = {
          type: 'ticket',
          id: String(extendTicketId),
          userId: String(data.userId),
          amount: data.amount || data.additionalFare,
          paymentMethod: data.paymentMethod || "razorpay"
        };
        break;
        
      case 'recharge':
      case 'card_recharge':
      case 'card_recharge_by_number':
        payload = {
          type: 'recharge',
          id: String(data.id),
          userId: String(data.userId),
          amount: data.amount,
          paymentMethod: data.paymentMethod || "razorpay"
        };
        break;
        
      default:
        payload = {
          type: actualType,
          id: String(data.id),
          userId: String(data.userId),
          amount: data.amount,
          paymentMethod: data.paymentMethod || "razorpay"
        };
    }
    
    // Final validation
    if (!payload.id || payload.id === 'undefined') {
      throw new Error(`Invalid ID for payment type ${actualType}: ${payload.id}`);
    }
    
    console.log('Payment API payload:', payload);
    
    return api.post("/payments/create-order", payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error('Payment order creation failed:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    });
  },
  
  // Fallback for legacy endpoints
  createPaymentOrderLegacy: (data) => {
    const payload = {
      type: data.type,
      id: String(data.id),
      userId: String(data.userId),
      amount: data.amount,
      paymentMethod: data.paymentMethod || "upi"
    };
    
    return api.post("/payments/orders", payload, {
      headers: {
        'X-Id-Type': 'string'
      }
    });
  },
  
  verifyPayment: (data) => api.post("/payments/verify", data, {
    headers: {
      'Content-Type': 'application/json'
    }
  }),
  
  handleWebhook: (data) => api.post("/payments/webhook", data)
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
  // When userId is provided, use user-scoped endpoints
  getNotifications: (userId) => userId
    ? api.get(`/notifications/user/${userId}`)
    : api.get("/notifications"),
  getByUser: (userId) => api.get(`/notifications/user/${userId}`),
  markAsRead: (notificationId) =>
    api.patch(`/notifications/read/${notificationId}`),
  markAllAsRead: (userId) =>
    api.patch(`/notifications/user/${userId}/read-all`),
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),
  getUnreadCount: (userId) => api.get(`/notifications/user/${userId}/unread-count`),
};

// Transaction API - New backend feature
export const transactionAPI = {
  getAllTransactions: () => safeGet("/transactions", { defaultData: [] }),
  getUserTransactions: (userId) => api.get(`/transactions/user/${userId}`),
  createTransaction: (data) => api.post("/transactions", data),
  getTransaction: (transactionId) => api.get(`/transactions/${transactionId}`),
  updateTransaction: (transactionId, data) =>
    api.put(`/transactions/${transactionId}`, data),
  deleteTransaction: (transactionId) =>
    api.delete(`/transactions/${transactionId}`),
};

// Wallet API
export const walletAPI = {
  getBalance: (userId) => api.get(`/wallet/${userId}/balance`),
  addMoney: (userId, amount, description) => api.post(`/wallet/${userId}/add`, { amount, description }),
  deductMoney: (userId, amount, description) => api.post(`/wallet/${userId}/deduct`, { amount, description }),
  getTransactions: (userId, params = {}) => api.get(`/wallet/${userId}/transactions`, { params }),
  
  // Legacy wallet endpoints
  getUserWallet: (userId) => api.get(`/wallet/${userId}`),
  addToWallet: (userId, amount) => api.post(`/wallet/${userId}/add`, { amount }),
  deductFromWallet: (userId, amount) => api.post(`/wallet/${userId}/deduct`, { amount }),
  checkBalance: (userId) => api.get(`/wallet/${userId}/check`)
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
  // Backend expects /user-journeys/journeys/start with either {from_stop_id,to_stop_id} OR {tripId,sourceStationId,destinationStationId}
  startJourney: (data) => api.post("/user-journeys/journeys/start", data),
  
  // Backend expects PATCH /user-journeys/journeys/:journeyId/end with { status }
  endJourney: (journeyId, status = "completed") => api.patch(`/user-journeys/journeys/${journeyId}/end`, { status }),
  
  getJourneyById: (journeyId) => api.get(`/user-journeys/journeys/${journeyId}`),
  
  getAllJourneys: () => safeGet("/user-journeys/journeys", { defaultData: [] }),
  
  getUserJourneys: () => safeGet("/user-journeys", { defaultData: [] }),
  
  getUserJourneys: async (userId) => {
    // Try multiple shapes: /user-journeys/:id, /journey-history/:id, /users/:id/journeys
    const candidates = [
      `/user-journeys/${userId}`,
      `/journey-history/${userId}`,
      `/users/${userId}/journeys`,
    ];
    for (const path of candidates) {
      try {
        const res = await safeGet(path, { defaultData: [] });
        if (Array.isArray(res.data) ? res.data.length >= 0 : res.data) return res;
      } catch (_) {}
    }
    return { data: [] };
  },
  
  // Alternative endpoints for compatibility
  getJourneyHistory: (userId) => safeGet(`/journey-history/${userId}`, { defaultData: [] })
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

// Admin API endpoints
export const adminAPI = {
  register: (data) => {
    return axios.post(`${apiBase}/admin/register`, data);
  },

  login: (data) => {
    return axios.post(`${apiBase}/admin/login`, data);
  },

  getDashboardStats: () => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getSystemHealth: () => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/dashboard/health`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getUsers: (params) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/users`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getUserDetails: (userId) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  updateUser: (userId, data) => {
    const token = localStorage.getItem('adminToken');
    return axios.put(`${apiBase}/admin/users/${userId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  deleteUser: (userId) => {
    const token = localStorage.getItem('adminToken');
    return axios.delete(`${apiBase}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  createUser: (data) => {
    const token = localStorage.getItem('adminToken');
    return axios.post(`${apiBase}/admin/users`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getAllTickets: (params) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/tickets`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getAllSubscriptions: (params) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/subscriptions`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  runSystemTests: () => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/test/system`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getPaymentAnalytics: (params) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/analytics/payments`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getModelData: (modelName, params) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/models/${modelName}`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getModelItem: (modelName, itemId) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/models/${modelName}/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  deleteModelItem: (modelName, itemId) => {
    const token = localStorage.getItem('adminToken');
    return axios.delete(`${apiBase}/admin/models/${modelName}/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  // New admin API functions
  getAdminProfile: () => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  updateAdminProfile: (data) => {
    const token = localStorage.getItem('adminToken');
    return axios.put(`${apiBase}/admin/profile`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getAdminNotifications: () => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  markAdminNotificationAsRead: (notificationId) => {
    const token = localStorage.getItem('adminToken');
    return axios.patch(`${apiBase}/admin/notifications/${notificationId}/read`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  // Ticket CRUD operations
  updateTicket: (ticketId, data) => {
    const token = localStorage.getItem('adminToken');
    return axios.put(`${apiBase}/admin/models/tickets/${ticketId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  createTicket: (data) => {
    const token = localStorage.getItem('adminToken');
    return axios.post(`${apiBase}/tickets/book`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  cancelTicket: (ticketId) => {
    const token = localStorage.getItem('adminToken');
    return axios.patch(`${apiBase}/tickets/${ticketId}/cancel`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getTicketDetails: (ticketId) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/models/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  deleteTicket: (ticketId) => {
    const token = localStorage.getItem('adminToken');
    return axios.delete(`${apiBase}/admin/models/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  // Subscription CRUD operations
  updateSubscription: (subscriptionId, data) => {
    const token = localStorage.getItem('adminToken');
    return axios.put(`${apiBase}/admin/models/subscriptions/${subscriptionId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  createSubscription: (data) => {
    const token = localStorage.getItem('adminToken');
    return axios.post(`${apiBase}/admin/models/subscriptions`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  deleteSubscription: (subscriptionId) => {
    const token = localStorage.getItem('adminToken');
    return axios.delete(`${apiBase}/admin/models/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  
  getSubscriptionDetails: (subscriptionId) => {
    const token = localStorage.getItem('adminToken');
    return axios.get(`${apiBase}/admin/models/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
};

export default api;
