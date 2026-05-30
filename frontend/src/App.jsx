import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import AdminPanelPage from './pages/AdminPanelPage.jsx'
import CommandTrackPage from './pages/CommandTrackPage.jsx'
import CommandPage from './pages/CommandPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="projects/:projectId" element={<ProjectsPage />} />
      <Route path="command" element={<CommandPage />} />
      <Route path="track" element={<CommandTrackPage />} />
      <Route path="admin-panel" element={<AdminPanelPage />} />
    </Routes>
  )
}
