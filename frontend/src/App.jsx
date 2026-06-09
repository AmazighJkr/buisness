import { Routes, Route } from 'react-router-dom'
import { LocaleProvider } from './context/LocaleContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import CommandTrackPage from './pages/CommandTrackPage.jsx'
import CommandPage from './pages/CommandPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import SubscriptionsPage from './pages/SubscriptionsPage.jsx'
import AdminPanelPage from './pages/AdminPanelPage.jsx'
import ShopPage from './pages/ShopPage.jsx'
import StoreLandingPage from './pages/StoreLandingPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import StoreOrderPage from './pages/StoreOrderPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx'

function AdminRedirect() {
  if (typeof window !== 'undefined') {
    const isDev = import.meta.env.DEV
    const adminUrl = isDev
      ? `http://${window.location.hostname}:8000/admin/`
      : '/admin/'
    window.location.replace(adminUrl)
  }
  return null
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="projects/:projectId" element={<ProjectsPage />} />
      <Route path="store" element={<StoreLandingPage />} />
      <Route path="shop/cart" element={<CartPage />} />
      <Route path="shop/checkout" element={<CheckoutPage />} />
      <Route path="shop/order" element={<StoreOrderPage />} />
      <Route path="legal/terms" element={<TermsPage />} />
      <Route path="legal/privacy" element={<PrivacyPolicyPage />} />
      <Route path="shop/:productSlug" element={<ShopPage />} />
      <Route path="shop" element={<ShopPage />} />
      <Route path="command" element={<CommandPage />} />
      <Route path="track" element={<CommandTrackPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="admin" element={<AdminRedirect />} />
      <Route path="admin/" element={<AdminRedirect />} />
      <Route path="admin-panel" element={<AdminPanelPage />} />
      <Route path="admin-panel/" element={<AdminPanelPage />} />
    </Routes>
      </ThemeProvider>
    </LocaleProvider>
  )
}
