import { useEffect, useState } from 'react'
import { fetchStoreProductComments, postStoreProductComment } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'
import CustomerReviews from '../CustomerReviews.jsx'

export default function StoreProductReviews({ productId }) {
  const { t } = useTranslation()
  const [initial, setInitial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchStoreProductComments(productId)
      .then(setInitial)
      .catch(() => setInitial([]))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return (
      <div className="amazon-reviews panel mt-8 p-6">
        <p className="text-sm text-dark-muted">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="amazon-reviews mt-8">
      <CustomerReviews
        title={t('reviews.title')}
        emptyText={t('reviews.empty')}
        namePlaceholder={t('reviews.namePlaceholder')}
        textPlaceholder={t('reviews.textPlaceholder')}
        submitLabel={t('reviews.submit')}
        reviews={initial}
        onSubmit={(body) => postStoreProductComment(productId, body)}
      />
    </div>
  )
}
