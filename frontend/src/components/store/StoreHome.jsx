import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Mail, MessageSquare } from 'lucide-react'
import { useTranslation } from '../../context/LocaleContext.jsx'
import StoreProductCard from './StoreProductCard.jsx'
import { fetchStoreProducts } from '../../api/client.js'

const HERO_SLIDES = [
  {
    src: '/store/hero-1.jpg',
    title: 'Embedded kits & tools',
    subtitle: 'Controllers, sensors, and lab gear for your next build.',
    cta: 'Shop embedded',
    category: '',
  },
  {
    src: '/store/hero-2.jpg',
    title: 'Arduino starter kits',
    subtitle: 'Everything you need to prototype fast — ships in Algeria.',
    cta: 'Browse kits',
    category: '',
  },
]

const BRAND_LOGOS = [
  { name: 'Arduino', slug: 'arduino' },
  { name: 'ESP32', slug: 'esp32' },
  { name: 'Raspberry Pi', slug: 'raspberry-pi' },
  { name: 'STM32', slug: 'stm32' },
  { name: 'Adeept', slug: 'adeept' },
]

export default function StoreHome({ onAdd, addedId, onBrowseCategory }) {
  const { t } = useTranslation()
  const [slide, setSlide] = useState(0)
  const [featured, setFeatured] = useState([])

  const loadFeatured = () => {
    fetchStoreProducts({ featured: true })
      .then((rows) => setFeatured(rows.slice(0, 8)))
      .catch(() => setFeatured([]))
  }

  useEffect(() => {
    loadFeatured()
    const id = window.setInterval(loadFeatured, 45000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length)
    }, 6000)
    return () => window.clearInterval(id)
  }, [])

  const current = HERO_SLIDES[slide]

  return (
    <div className="store-home">
      <section className="store-hero-carousel" aria-label="Store highlights">
        <div className="store-hero-carousel__frame">
          {HERO_SLIDES.map((item, index) => (
            <div
              key={item.src}
              className={`store-hero-carousel__slide ${index === slide ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${item.src})` }}
            >
              <div className="store-hero-carousel__overlay" />
              <div className="store-hero-carousel__copy">
                <h2 className="store-hero-carousel__title">{item.title}</h2>
                <p className="store-hero-carousel__subtitle">{item.subtitle}</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onBrowseCategory(item.category)}
                >
                  {item.cta}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="store-hero-carousel__nav store-hero-carousel__nav--prev"
            onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="store-hero-carousel__nav store-hero-carousel__nav--next"
            onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)}
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="store-hero-carousel__dots">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                className={index === slide ? 'is-active' : ''}
                onClick={() => setSlide(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <p className="store-hero-carousel__caption">{current.title}</p>
      </section>

      <section className="store-home-section">
        <div className="store-home-section__head">
          <h2 className="store-home-section__title">{t('store.trending')}</h2>
          <Link to="/shop?featured=1" className="text-sm text-lab-cyan hover:underline">
            {t('store.viewAll')}
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-sm text-dark-muted">{t('store.noProducts')}</p>
        ) : (
          <div className="store-grid store-grid--home">
            {featured.map((p) => (
              <StoreProductCard
                key={p.id}
                product={p}
                added={addedId === p.id}
                onAdd={onAdd}
                linkTo={`/shop/${p.slug}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="store-home-section store-brands">
        <h2 className="store-home-section__title">{t('store.brands')}</h2>
        <div className="store-brands__row">
          {BRAND_LOGOS.map((brand) => (
            <button
              key={brand.slug}
              type="button"
              className="store-brands__chip"
              onClick={() => onBrowseCategory(brand.slug)}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </section>

      <section className="store-home-section store-home-contact panel">
        <h2 className="store-home-section__title">{t('store.contactTitle')}</h2>
        <p className="mt-2 text-sm text-dark-muted">{t('store.contactLead')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/command" className="btn-primary inline-flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            {t('store.contactCommand')}
          </Link>
          <a href="mailto:contact@embeddedgrid.com" className="inline-flex items-center gap-2 rounded border border-dark-border px-4 py-2 text-sm panel-hover">
            <Mail className="h-4 w-4" />
            contact@embeddedgrid.com
          </a>
        </div>
      </section>
    </div>
  )
}
