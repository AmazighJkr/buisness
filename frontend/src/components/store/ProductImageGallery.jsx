import { useState } from 'react'

/** Amazon-style: vertical thumbnails left, large image right. */
export default function ProductImageGallery({ images, alt }) {
  const slides = images?.length ? images : []
  const [index, setIndex] = useState(0)
  const current = slides[index]

  if (!slides.length) {
    return <div className="product-gallery product-gallery--empty product-gallery--amazon" aria-hidden />
  }

  return (
    <div className="product-gallery product-gallery--amazon">
      {slides.length > 1 && (
        <div className="product-gallery__thumbs-col" role="tablist" aria-label="Product images">
          {slides.map((url, i) => (
            <button
              key={url}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={`product-gallery__thumb-v ${i === index ? 'product-gallery__thumb-v--active' : ''}`}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
      <div className="product-gallery__stage product-gallery__stage--amazon">
        <img key={current} src={current} alt={alt} className="product-gallery__main" />
      </div>
    </div>
  )
}
