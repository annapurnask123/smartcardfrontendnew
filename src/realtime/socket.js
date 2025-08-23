import { io } from 'socket.io-client'
import { addNotification } from '../slices/notificationSlice'
// For transactions and journey updates, prefer thunks/slices if available
// import { fetchTransactions } from '../slices/transactionSlice'
// import { someJourneyAction } from '../slices/journeySlice'

let socket = null

export function initRealtime(store) {
  if (socket) return socket
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const origin = (() => {
      if (apiBase.startsWith('/')) return window.location.origin
      try { return new URL(apiBase).origin } catch { return window.location.origin }
    })()
    const baseUrl = import.meta.env.VITE_SOCKET_URL || origin
    const path = import.meta.env.VITE_SOCKET_PATH || '/socket.io'

    socket = io(baseUrl, {
      path,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {})
    socket.on('connect_error', () => {})
    socket.on('journey:update', () => {})
    socket.on('notification:new', (payload) => {
      // Use addNotification instead of setNotifications to prevent overwriting existing notifications
      // and let the slice handle deduplication
      if (payload && (payload.title || payload.message)) {
        store.dispatch(addNotification({
          ...payload,
          timestamp: payload.timestamp || new Date().toISOString(),
          read: false
        }))
      }
    })
    socket.on('transactions:update', () => {})
    socket.on('disconnect', () => {})
  } catch {
    // swallow init errors
  }
  return socket
}

export function getSocket() { return socket }
