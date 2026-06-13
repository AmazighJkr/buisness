import { postComment } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import CustomerReviews from './CustomerReviews.jsx'

export default function ProjectComments({ projectId, initial = [] }) {
  const { t } = useTranslation()

  return (
    <CustomerReviews
      title={t('reviews.title')}
      emptyText={t('reviews.empty')}
      namePlaceholder={t('reviews.namePlaceholder')}
      textPlaceholder={t('reviews.textPlaceholder')}
      submitLabel={t('reviews.submit')}
      reviews={initial}
      onSubmit={(body) => postComment(projectId, body)}
    />
  )
}
