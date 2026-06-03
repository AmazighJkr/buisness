/** English / French UI strings — keys use dot paths: t('nav.projects') */

export const LOCALES = ['en', 'fr']

export const translations = {
  en: {
    lang: { en: 'English', fr: 'French', switch: 'Language' },
    nav: {
      projects: 'Projects',
      subscriptions: 'Subscriptions',
      submitCommand: 'Submit command',
      track: 'Track',
      store: 'Store',
      openStore: 'Open store',
      allProducts: 'All products',
      orderStatus: 'Order status',
      account: 'Account',
      lab: 'Lab',
      mainSite: 'Main site',
      home: 'Home',
      enterprise: 'Enterprise',
      services: 'Services',
      contact: 'Contact',
      sections: 'Sections',
      theme: 'Theme',
      categories: 'Categories',
      hideCategories: 'Hide',
      showCategories: 'Show categories',
      browseCategories: 'Browse categories',
      allProjects: 'All projects',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    common: {
      signIn: 'Sign in',
      active: 'Active',
      loading: 'Loading…',
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      search: 'Search',
      clearSearch: 'Clear search',
    },
    projects: {
      title: 'Projects',
      allProjects: 'All projects',
      filtered: 'Filtered by subcategory — free projects open without an account',
      intro:
        'Featured projects appear first. Free projects need no sign-in; pack projects unlock with a subscription.',
      signedInPacks: 'Signed in — your active pack(s) unlock matching projects.',
      signedInPack: 'Signed in — your active pack unlocks matching projects.',
      searchPlaceholder: 'Search projects…',
      noResults: 'No projects match your search.',
      noProjects: 'No projects here yet.',
      loadError: 'Could not load projects.',
      categoriesError: 'Could not load categories.',
      backToList: '← Back to list',
    },
    landing: {
      tagline: 'IT, Electronics, Maintenance & Consulting',
      subtitle:
        'Computer science, electronics, maintenance and consulting — for teams who build real hardware.',
      enterpriseTitle: 'Enterprise',
      enterpriseLead: 'Who we are — a lab focused on dependable embedded products and honest engineering.',
      servicesTitle: 'Services',
      servicesLead: 'What we deliver — from prototype to field-ready systems.',
      contactTitle: 'Contact',
      contactLead: 'Tell us about your project — we reply with a tracking link.',
      pillarSector: 'Sector Leader',
      pillarSectorText:
        'Engineering depth across electronics, firmware, and connected products.',
      pillarTrusted: 'Trusted Service',
      pillarTrustedText: 'Clear communication, reliable delivery, and long-term technical partnership.',
      pillarInnovation: 'Innovation First',
      pillarInnovationText:
        'Modern stacks—from bare-metal MCUs to cloud dashboards and mobile apps.',
      svcEmbedded: 'Embedded Systems Engineering',
      svcEmbeddedText:
        'Custom firmware, PCB bring-up, sensor integration, and production-ready device logic.',
      svcIot: 'IoT & Connected Platforms',
      svcIotText:
        'MQTT/cloud pipelines, remote monitoring, OTA updates, and secure device-to-cloud architecture.',
      svcAndroid: 'Android & Companion Apps',
      svcAndroidText: 'Mobile interfaces for configuration, live telemetry, and field diagnostics.',
      svcConsulting: 'Technical Consulting',
      svcConsultingText:
        'Architecture reviews, feasibility studies, maintenance planning, and team guidance.',
      formName: 'Name',
      formEmail: 'Email',
      formMessage: 'Message',
      formSend: 'Send message',
      formSuccess: 'Message sent. Save your tracking link below to follow progress.',
      trackingLabel: 'Your tracking code:',
      trackProgress: 'Track progress',
    },
    store: {
      algeriaOnlyTitle: 'Store — Algeria only',
      algeriaOnlyBody:
        'The EmbeddedGrid store ships within Algeria. Prices are in DZD. Checkout supports pay on delivery and card payment via Chargily (Edahabia / CIB).',
      algeriaOnlyHint:
        'If you are in Algeria and still see this message, wait a moment and refresh — we detect your region from your connection.',
      backHome: 'Back to home',
      searchProducts: 'Search products…',
    },
    cart: {
      title: 'Your bag',
      empty: 'Your cart is empty.',
      browse: 'Browse shop',
      checkout: 'Checkout',
      pricesDzd: 'prices in DZD',
    },
    command: {
      title: 'Submit a command',
      trackTitle: 'Track your command',
    },
    account: {
      title: 'Account',
    },
    subscriptions: {
      title: 'Subscriptions',
    },
    admin: {
      searchProjects: 'Search projects…',
      noProjectsMatch: 'No projects match your search.',
    },
  },
  fr: {
    lang: { en: 'Anglais', fr: 'Français', switch: 'Langue' },
    nav: {
      projects: 'Projets',
      subscriptions: 'Abonnements',
      submitCommand: 'Soumettre une commande',
      track: 'Suivi',
      store: 'Boutique',
      openStore: 'Ouvrir la boutique',
      allProducts: 'Tous les produits',
      orderStatus: 'Statut de commande',
      account: 'Compte',
      lab: 'Labo',
      mainSite: 'Site principal',
      home: 'Accueil',
      enterprise: 'Entreprise',
      services: 'Services',
      contact: 'Contact',
      sections: 'Sections',
      theme: 'Thème',
      categories: 'Catégories',
      hideCategories: 'Masquer',
      showCategories: 'Afficher les catégories',
      browseCategories: 'Parcourir les catégories',
      allProjects: 'Tous les projets',
      allProducts: 'Tous les produits',
      openMenu: 'Ouvrir le menu',
      closeMenu: 'Fermer le menu',
    },
    common: {
      signIn: 'Connexion',
      active: 'Actif',
      loading: 'Chargement…',
      back: 'Retour',
      save: 'Enregistrer',
      cancel: 'Annuler',
      search: 'Rechercher',
      clearSearch: 'Effacer la recherche',
    },
    projects: {
      title: 'Projets',
      allProjects: 'Tous les projets',
      filtered:
        'Filtré par sous-catégorie — les projets gratuits sont accessibles sans compte',
      intro:
        'Les projets en vedette apparaissent en premier. Les projets gratuits ne nécessitent pas de connexion ; les packs débloquent les autres via abonnement.',
      signedInPacks:
        'Connecté — vos abonnements actifs débloquent les projets correspondants.',
      signedInPack:
        'Connecté — votre abonnement actif débloque les projets correspondants.',
      searchPlaceholder: 'Rechercher des projets…',
      noResults: 'Aucun projet ne correspond à votre recherche.',
      noProjects: 'Aucun projet ici pour le moment.',
      loadError: 'Impossible de charger les projets.',
      categoriesError: 'Impossible de charger les catégories.',
      backToList: '← Retour à la liste',
    },
    landing: {
      tagline: 'Informatique, Électronique, Maintenance & Conseil',
      subtitle:
        'Informatique, électronique, maintenance et conseil — pour les équipes qui construisent du matériel réel.',
      enterpriseTitle: 'Entreprise',
      enterpriseLead:
        'Qui nous sommes — un labo axé sur des produits embarqués fiables et une ingénierie transparente.',
      servicesTitle: 'Services',
      servicesLead: 'Ce que nous livrons — du prototype au système prêt pour le terrain.',
      contactTitle: 'Contact',
      contactLead: 'Parlez-nous de votre projet — nous répondons avec un lien de suivi.',
      pillarSector: 'Leader du secteur',
      pillarSectorText:
        'Expertise en électronique, firmware et produits connectés.',
      pillarTrusted: 'Service de confiance',
      pillarTrustedText:
        'Communication claire, livraison fiable et partenariat technique durable.',
      pillarInnovation: 'Innovation d\'abord',
      pillarInnovationText:
        'Stacks modernes — des MCU bare-metal aux tableaux de bord cloud et applications mobiles.',
      svcEmbedded: 'Ingénierie systèmes embarqués',
      svcEmbeddedText:
        'Firmware sur mesure, mise au point PCB, capteurs et logique prête pour la production.',
      svcIot: 'IoT & plateformes connectées',
      svcIotText:
        'Pipelines MQTT/cloud, supervision à distance, OTA et architecture device-to-cloud sécurisée.',
      svcAndroid: 'Applications Android & compagnon',
      svcAndroidText:
        'Interfaces mobiles pour configuration, télémétrie en direct et diagnostics terrain.',
      svcConsulting: 'Conseil technique',
      svcConsultingText:
        'Revues d\'architecture, faisabilité, maintenance et accompagnement d\'équipe.',
      formName: 'Nom',
      formEmail: 'E-mail',
      formMessage: 'Message',
      formSend: 'Envoyer',
      formSuccess: 'Message envoyé. Conservez votre lien de suivi ci-dessous.',
      trackingLabel: 'Votre code de suivi :',
      trackProgress: 'Suivre l\'avancement',
    },
    store: {
      algeriaOnlyTitle: 'Boutique — Algérie uniquement',
      algeriaOnlyBody:
        'La boutique EmbeddedGrid livre en Algérie. Prix en DZD. Paiement à la livraison ou par carte via Chargily (Edahabia / CIB).',
      algeriaOnlyHint:
        'Si vous êtes en Algérie et voyez encore ce message, attendez un instant et actualisez — nous détectons votre région.',
      backHome: 'Retour à l\'accueil',
      searchProducts: 'Rechercher des produits…',
    },
    cart: {
      title: 'Votre panier',
      empty: 'Votre panier est vide.',
      browse: 'Voir la boutique',
      checkout: 'Payer',
      pricesDzd: 'prix en DZD',
    },
    command: {
      title: 'Soumettre une commande',
      trackTitle: 'Suivre votre commande',
    },
    account: {
      title: 'Compte',
    },
    subscriptions: {
      title: 'Abonnements',
    },
    admin: {
      searchProjects: 'Rechercher des projets…',
      noProjectsMatch: 'Aucun projet ne correspond.',
    },
  },
}

export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return 'en'
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const raw of langs) {
    const code = (raw || '').toLowerCase().split('-')[0]
    if (code === 'fr') return 'fr'
  }
  return 'en'
}

export function resolveMessage(locale, key) {
  const parts = key.split('.')
  let node = translations[locale] || translations.en
  for (const p of parts) {
    node = node?.[p]
    if (node === undefined) break
  }
  if (node === undefined) {
    node = translations.en
    for (const p of parts) {
      node = node?.[p]
    }
  }
  return typeof node === 'string' ? node : key
}
