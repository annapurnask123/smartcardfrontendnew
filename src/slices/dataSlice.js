import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  stations: [],
  stationsPagination: { page: 1, pageSize: 12, total: 0 },
  tickets: [],
  subscriptionPlans: [
    { id: 'basic', name: 'Basic Plan', price: 299, duration: 'month', features: ['1 Member', 'Unlimited Travel', 'Basic Support'], popular: false },
    { id: 'family', name: 'Family Plan', price: 699, duration: 'month', features: ['3 Members', 'Unlimited Travel', 'Priority Support', 'Secondary Cards'], popular: true },
    { id: 'premium', name: 'Premium Plan', price: 1299, duration: 'month', features: ['5 Members', 'Unlimited Travel', '24/7 Support', 'Secondary Cards', 'Express Lane Access'], popular: false },
  ],
  userPlans: [
  ],
  cards: [
    { id: 'card1', name: 'Secondary Card 1', type: 'secondary', balance: 150, status: 'active' },
    { id: 'card2', name: 'Secondary Card 2', type: 'secondary', balance: 0, status: 'inactive' },
  ],
  primaryCardBalance: 250,
  walletBalance: 1250,
  transactions: [
    { id: 'TXN001', description: 'Metro Journey - Central to City Center', amount: '45', type: 'debit', method: 'Card', date: '2024-08-20' },
    { id: 'TXN002', description: 'Wallet Recharge', amount: '500', type: 'credit', method: 'UPI', date: '2024-08-19' },
    { id: 'TXN003', description: 'Metro Journey - Park to Tech Hub', amount: '35', type: 'debit', method: 'Card', date: '2024-08-19' },
  ],
  notifications: [
    { id: 'notif1', title: 'Journey Reminder', message: 'Train arriving in 5 minutes', time: '10 minutes ago', read: false },
  ],
  journey: null,
}

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    addTicket(state, action) {
      state.tickets.push(action.payload)
    },
    setCards(state, action) {
      state.cards = action.payload
    },
    setWalletBalance(state, action) {
      state.walletBalance = action.payload
    },
    setTransactions(state, action) {
      state.transactions = action.payload
    },
    setStations(state, action) {
      state.stations = action.payload.items || action.payload || []
      if (action.payload.page) {
        state.stationsPagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize || state.stationsPagination.pageSize,
          total: action.payload.total || state.stationsPagination.total,
        }
      }
    },
    setTickets(state, action) {
      state.tickets = action.payload
    },
    setNotifications(state, action) {
      state.notifications = action.payload
    },
    setUserPlans(state, action) {
      state.userPlans = action.payload
    },
    setJourney(state, action) {
      state.journey = action.payload
    },
    addTransaction(state, action) {
      state.transactions.unshift(action.payload)
    },
    markAllNotificationsRead(state) {
      state.notifications = state.notifications.map(n => ({ ...n, read: true }))
    },
  },
})

export const { addTicket, setCards, setWalletBalance, setTransactions, setStations, setTickets, setNotifications, setUserPlans, setJourney, addTransaction, markAllNotificationsRead } = dataSlice.actions
export default dataSlice.reducer

