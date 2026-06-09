import { useNavigate } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import StoreHome from '../components/store/StoreHome.jsx'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import { useStoreRegion } from '../hooks/useStoreRegion.js'

export default function StoreLandingPage() {
  const navigate = useNavigate()
  const { loading: regionLoading, isAlgeria } = useStoreRegion()

  if (!regionLoading && !isAlgeria) {
    return <StoreNotAvailableInRegion />
  }

  return (
    <StoreAlgeriaGate loading={regionLoading}>
      <div className="page-shell flex min-h-screen min-h-[100dvh] flex-col">
        <StoreHeader highlight="/store" />
        <main className="store-main-column min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <StoreHome
            onBrowseCategory={(slug) => {
              if (slug) navigate(`/shop?category=${encodeURIComponent(slug)}`)
              else navigate('/shop')
            }}
          />
        </main>
      </div>
    </StoreAlgeriaGate>
  )
}
