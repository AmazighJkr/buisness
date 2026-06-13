import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import SidebarRail from '../components/SidebarRail.jsx'
import StoreHome from '../components/store/StoreHome.jsx'
import StoreCategorySidebar from '../components/store/StoreCategorySidebar.jsx'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import { fetchStoreCategories } from '../api/client.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { useStoreSidebar } from '../hooks/useStoreSidebar.js'

export default function StoreLandingPage() {
  const navigate = useNavigate()
  const { loading: regionLoading, isAlgeria } = useStoreRegion()
  const [sidebarOpen, setSidebarOpen] = useStoreSidebar()
  const [categories, setCategories] = useState([])
  const [expandedCats, setExpandedCats] = useState({})

  useEffect(() => {
    if (!isAlgeria) return
    fetchStoreCategories().then(setCategories).catch(() => setCategories([]))
  }, [isAlgeria])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const lock = () => {
      if (mq.matches && sidebarOpen) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = ''
    }
    lock()
    mq.addEventListener('change', lock)
    return () => {
      mq.removeEventListener('change', lock)
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  if (!regionLoading && !isAlgeria) {
    return <StoreNotAvailableInRegion />
  }

  const browseCategory = (slug) => {
    if (slug) navigate(`/shop?category=${encodeURIComponent(slug)}`)
    else navigate('/shop')
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <StoreAlgeriaGate loading={regionLoading}>
      <div className="page-shell flex min-h-screen min-h-[100dvh] flex-col">
        <StoreHeader highlight="/store" />

        <div className="flex min-h-0 flex-1">
          {!sidebarOpen && (
            <SidebarRail onOpen={() => setSidebarOpen(true)} controlsId="store-home-category-sidebar" />
          )}

          <StoreCategorySidebar
            id="store-home-category-sidebar"
            categories={categories}
            expanded={expandedCats}
            onToggleExpand={(id) =>
              setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            selectedSlug=""
            onSelectCategory={browseCategory}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="store-main-column min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <StoreHome onBrowseCategory={browseCategory} />
          </main>
        </div>
      </div>
    </StoreAlgeriaGate>
  )
}
