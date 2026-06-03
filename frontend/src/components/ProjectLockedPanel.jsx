import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { fetchPaymentConfig } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useUserSession } from '../hooks/useUserSession.js'
import { accountUrlWithNext, subscriptionsUrlForProject } from '../utils/projectAccess.js'
import { detectClientCountry } from '../utils/paymentRegion.js'
import { formatDzd, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

export default function ProjectLockedPanel({ project, projectId }) {
  const { t } = useTranslation()
  const packs = project.required_packs || []
  const { isLoggedIn } = useUserSession()
  const [useDzd, setUseDzd] = useState(false)

  useEffect(() => {
    detectClientCountry().then(() =>
      fetchPaymentConfig().then((cfg) => setUseDzd(useDzdPricing(cfg.provider))),
    )
  }, [])
  const pid = projectId || project.id
  const subsUrl = subscriptionsUrlForProject(project, pid)

  return (
    <div className="rounded border border-dark-border bg-dark-panel p-6 text-center">
      <Lock className="mx-auto h-10 w-10 text-dark-muted" />
      <h3 className="mt-3 text-lg font-medium">{t('subscriptions.packRequired')}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-dark-muted">{t('subscriptions.packRequiredLead')}</p>
      {packs.length > 0 && (
        <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
          {packs.map((p) => (
            <li key={p.id} className="flex justify-between border border-dark-border px-3 py-2">
              <span>{p.name}</span>
              <span className="text-dark-muted">
                {useDzd ? formatDzd(p.price_dzd) : formatUsd(p.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {isLoggedIn ? (
          <Link to={subsUrl} className="border border-lab-cyan px-4 py-2 text-sm text-lab-cyan panel-hover">
            {t('subscriptions.subscribeToUnlock')}
          </Link>
        ) : (
          <>
            <Link
              to={accountUrlWithNext(`/projects/${pid}`)}
              className="border border-lab-cyan px-4 py-2 text-sm text-lab-cyan panel-hover"
            >
              {t('subscriptions.signInOrRegister')}
            </Link>
            <Link to={subsUrl} className="border border-dark-border px-4 py-2 text-sm panel-hover">
              {t('subscriptions.viewPacks')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
