import { useNavigate } from 'react-router-dom'
import MagicBento from '../reactbits/MagicBento.jsx'
import { useTranslation } from '../../context/LocaleContext.jsx'
import { CONTACT } from '../../config/contact.js'

export default function ContactMagicBento() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const cards = [
    {
      label: t('landing.contactEmail'),
      title: CONTACT.email,
      description: t('landing.contactBentoEmailHint'),
      href: CONTACT.emailHref,
      external: false,
    },
    {
      label: 'Discord',
      title: t('landing.contactDiscord'),
      description: t('landing.contactBentoDiscordHint'),
      href: CONTACT.discordHref,
      external: true,
    },
    {
      label: 'WhatsApp',
      title: t('landing.contactWhatsapp'),
      description: t('landing.contactBentoWhatsappHint'),
      href: CONTACT.whatsappHref,
      external: true,
    },
    {
      label: t('nav.submitCommand'),
      title: t('landing.contactCommandTitle'),
      description: t('landing.contactCommandHint'),
      to: '/command',
    },
  ]

  const handleCardAction = (card) => {
    if (card.to) {
      navigate(card.to)
      return
    }
    if (card.href) {
      if (card.external) {
        window.open(card.href, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = card.href
      }
    }
  }

  return (
    <div className="contact-magic-bento">
      <MagicBento
        cards={cards}
        layout="contact"
        glowColor="34, 211, 238"
        enableStars
        enableSpotlight
        enableBorderGlow
        enableMagnetism
        clickEffect
        textAutoHide={false}
        onCardClick={handleCardAction}
      />
    </div>
  )
}
