import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './styles.css'
import App from './App.jsx'
import { store } from './store/store'
import { hydrateFromStorage } from './slices/authSlice'
import { initRealtime } from './realtime/socket'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)

// Hydrate auth immediately
store.dispatch(hydrateFromStorage())
initRealtime(store)
