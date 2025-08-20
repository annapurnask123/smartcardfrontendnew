import { io } from 'socket.io-client'
import { setJourney, setNotifications, setTransactions } from '../slices/dataSlice'

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
    socket.on('journey:update', (payload) => store.dispatch(setJourney(payload)))
    socket.on('notification:new', (payload) => store.dispatch(setNotifications(payload)))
    socket.on('transactions:update', (payload) => store.dispatch(setTransactions(payload)))
    socket.on('disconnect', () => {})
  } catch {
    // swallow init errors
  }
  return socket
}

export function getSocket() { return socket }

