import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import CommandTrackPage from './pages/CommandTrackPage.jsx'
import CommandPage from './pages/CommandPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import SubscriptionsPage from './pages/SubscriptionsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="projects/:projectId" element={<ProjectsPage />} />
      <Route path="command" element={<CommandPage />} />
      <Route path="track" element={<CommandTrackPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
    </Routes>
  )
}
