import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-theme-bg text-theme-fg">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
