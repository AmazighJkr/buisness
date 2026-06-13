import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '../../context/LocaleContext.jsx'
import StoreProductCard from './StoreProductCard.jsx'
import ContactSection from '../landing/ContactSection.jsx'
import { fetchStoreCategories, fetchStoreProducts } from '../../api/client.js'

const HERO_SLIDES = [
  {
    src: '/store/hero-1.jpg',
    title: 'Embedded kits & tools',
    subtitle: 'Controllers, sensors, and lab gear for your next build.',
    cta: 'Browse products',
    category: 'embedded',
  },
  {
    src: '/store/hero-2.jpg',
    title: 'Arduino starter kits',
    subtitle: 'Everything you need to prototype fast — ships in Algeria.',
    cta: 'Shop kits',
    category: 'kits',
  },
]

const BRAND_LOGOS = [
  { name: 'Arduino', slug: 'arduino' },
  { name: 'ESP32', slug: 'esp32' },
  { name: 'Raspberry Pi', slug: 'raspberry-pi' },
  { name: 'STM32', slug: 'stm32' },
  { name: 'Adeept', slug: 'adeept' },
]

export default function StoreHome({ onBrowseCategory }) {
  const { t } = useTranslation()
  const [slide, setSlide] = useState(0)
  const [featured, setFeatured] = useState([])
  const [categories, setCategories] = useState([])

  const loadFeatured = () => {
    fetchStoreProducts({ featured: true })
      .then((rows) => setFeatured(rows.slice(0, 8)))
      .catch(() => setFeatured([]))
  }

  useEffect(() => {
    loadFeatured()
    fetchStoreCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
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
      <section className="store-hero-carousel store-hero-carousel--bleed" aria-label="Store highlights">
        <div className="store-hero-carousel__frame">
          {HERO_SLIDES.map((item, index) => (
            <div
              key={item.src}
              className={`store-hero-carousel__slide ${index === slide ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${item.src})` }}
            >
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

      <div className="store-home__inner">
      {categories.length > 0 && (
        <section className="store-home-section">
          <div className="store-home-section__head">
            <h2 className="store-home-section__title">{t('store.categoriesTitle')}</h2>
            <Link to="/shop" className="text-sm text-lab-cyan hover:underline">
              {t('store.viewAll')}
            </Link>
          </div>
          <div className="store-home-categories">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="store-home-categories__card panel"
                onClick={() => onBrowseCategory(cat.slug)}
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt="" className="store-home-categories__img" />
                ) : (
                  <div className="store-home-categories__placeholder" aria-hidden />
                )}
                <div className="store-home-categories__body">
                  <h3 className="store-home-categories__name">{cat.name}</h3>
                  {cat.description && (
                    <p className="store-home-categories__desc">{cat.description}</p>
                  )}
                  <p className="store-home-categories__count">
                    {t('store.categoryProductCount', { count: cat.product_count || 0 })}
                  </p>
                  {cat.children?.length > 0 && (
                    <div className="store-home-categories__subs">
                      {cat.children.slice(0, 4).map((sub) => (
                        <span key={sub.id} className="store-home-categories__sub">
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

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
          <div className="store-grid store-grid--catalog">
            {featured.map((p) => (
              <StoreProductCard
                key={p.id}
                product={p}
                linkTo={`/shop/${p.slug}`}
                showAdd={false}
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

      <ContactSection className="store-home-contact panel border border-dark-border p-6 sm:p-8" />
      </div>
    </div>
  )
}
