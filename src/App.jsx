import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import HomePage from './pages/HomePage.jsx'
import TicketBookingPage from './pages/TicketBookingPage.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import PlansPage from './pages/PlansPage.jsx'
import MyPlansPage from './pages/MyPlansPage.jsx'
import TicketsPage from './pages/TicketsPage.jsx'
import CardsPage from './pages/CardsPage.jsx'
import WalletPage from './pages/WalletPage.jsx'
import JourneyTrackingPage from './pages/JourneyTrackingPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import SchedulesPage from './pages/SchedulesPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RoutesPage from './pages/RoutesPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import TicketDetailPage from './pages/TicketDetailPage.jsx'
import SearchPage from './pages/SearchPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/book" element={<RequireAuth><TicketBookingPage /></RequireAuth>} />
        <Route path="/pay" element={<RequireAuth><PaymentPage /></RequireAuth>} />
        <Route path="/plans" element={<RequireAuth><PlansPage /></RequireAuth>} />
        <Route path="/tickets" element={<RequireAuth><TicketsPage /></RequireAuth>} />
        <Route path="/tickets/:ticketId" element={<RequireAuth><TicketDetailPage /></RequireAuth>} />
        <Route path="/my-plans" element={<RequireAuth><MyPlansPage /></RequireAuth>} />
        <Route path="/cards" element={<RequireAuth><CardsPage /></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
        <Route path="/journey" element={<RequireAuth><JourneyTrackingPage /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
        <Route path="/schedules" element={<RequireAuth><SchedulesPage /></RequireAuth>} />
        <Route path="/routes" element={<RequireAuth><RoutesPage /></RequireAuth>} />
        <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App