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
// import SchedulePage from './pages/SchedulePage.jsx'
import MultiRouteBookingPage from './pages/MultiRouteBookingPage.jsx'
import NotificationPage from './pages/NotificationPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RoutesPage from './pages/RoutesPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import AdminProtectedRoute from './components/AdminProtectedRoute.jsx'
import TicketDetailPage from './pages/TicketDetailPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";
import PaymentResultPage from "./pages/PaymentResultPage";
// import PaymentTestPage from "./pages/PaymentTestPage";
import MultiTicketPage from './pages/MultiTicketPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminRegister from './pages/AdminRegister.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUserManagement from './pages/AdminUserManagement.jsx'
import AdminModelManagement from './pages/AdminModelManagement';

function App() {
  
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/book" element={<RequireAuth><TicketBookingPage /></RequireAuth>} />
        <Route path="/payment" element={<RequireAuth><PaymentPage /></RequireAuth>} />
        <Route path="/plans" element={<RequireAuth><PlansPage /></RequireAuth>} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/my-plans" element={<RequireAuth><MyPlansPage /></RequireAuth>} />
        <Route path="/cards" element={<RequireAuth><CardsPage /></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
        <Route path="/journey" element={<RequireAuth><JourneyTrackingPage /></RequireAuth>} />
        
        <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
        <Route path="/schedules" element={<RequireAuth><SchedulesPage /></RequireAuth>} />
        <Route path="/multi-route" element={<RequireAuth><MultiRouteBookingPage /></RequireAuth>} />
        <Route path="/routes" element={<RequireAuth><RoutesPage /></RequireAuth>} />
        <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
        <Route path="/notification" element={<RequireAuth><NotificationPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-failed" element={<PaymentFailedPage />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />
        <Route path="/multi-ticket/:multiTicketId" element={<RequireAuth><MultiTicketPage /></RequireAuth>} />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <AdminLayout />
        </AdminProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminUserManagement />
            </AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="models" element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminModelManagement />
            </AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="analytics" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App