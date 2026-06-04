import { CONTACT } from '../../config/contact.js'

const SITE = 'https://embeddedgrid.onrender.com'

export const PRIVACY_META = {
  title: 'Politique de confidentialité',
  subtitle: `EmbeddedGrid · ${SITE}`,
  updated: '2 juin 2026',
}

export const PRIVACY_SECTIONS = [
  {
    title: 'Introduction',
    paragraphs: [
      'EmbeddedGrid (« la Société », « nous ») s\'engage à protéger et respecter la vie privée des utilisateurs de son site et de ses clients. Les informations personnelles désignent toute information relative à une personne physique identifiée ou identifiable.',
      'La présente politique explique comment nous recueillons, utilisons, conservons et protégeons vos données, conformément à la Loi Algérienne n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.',
    ],
  },
  {
    title: 'Données collectées',
    paragraphs: [
      'Lors d\'une commande ou d\'une demande de contact, nous pouvons collecter : nom, prénom, adresse e-mail, numéro de téléphone, adresse de livraison, code postal, wilaya, notes de commande, historique de commandes et informations de paiement traitées par nos prestataires sécurisés (nous ne stockons pas les numéros complets de carte bancaire).',
      'Lors de la navigation, des données techniques (adresse IP, type de navigateur, pages visitées) peuvent être enregistrées à des fins de sécurité et d\'amélioration du service.',
    ],
  },
  {
    title: 'Finalités du traitement',
    paragraphs: [
      'Vos données personnelles sont utilisées pour : traiter et livrer votre commande ; vous contacter concernant votre commande ; assurer le support client ; prévenir la fraude ; respecter nos obligations légales ; améliorer notre site et nos services lorsque vous y avez consenti.',
      'Vos données personnelles seront utilisées pour traiter votre commande, soutenir votre expérience sur ce site Web et à d\'autres fins décrites dans la présente politique de confidentialité.',
    ],
  },
  {
    title: 'Cookies et technologies similaires',
    paragraphs: [
      'Nous utilisons des cookies et stockages locaux nécessaires au fonctionnement du site (session, panier, préférences de langue). Vous pouvez configurer votre navigateur pour refuser certains cookies ; certaines fonctionnalités du site pourraient alors ne plus fonctionner correctement.',
    ],
  },
  {
    title: 'Conservation des données',
    paragraphs: [
      'Les données liées aux commandes sont conservées pendant la durée nécessaire à l\'exécution du contrat, aux obligations comptables et fiscales, et aux délais de prescription applicables en droit algérien.',
    ],
  },
  {
    title: 'Communication et transfert',
    paragraphs: [
      'Nous ne vendons pas vos données personnelles. Elles peuvent être communiquées à nos prestataires (hébergement, paiement, livraison) uniquement dans la mesure nécessaire à l\'exécution de votre commande, sous contrat de confidentialité.',
      'Tout transfert hors Algérie, le cas échéant, sera encadré par les garanties prévues par la réglementation applicable.',
    ],
  },
  {
    title: 'Sécurité',
    paragraphs: [
      'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (chiffrement des communications, accès restreint, sauvegardes) pour protéger vos informations contre l\'accès non autorisé, la perte ou l\'altération.',
    ],
  },
  {
    title: 'Vos droits',
    paragraphs: [
      'Conformément à la loi algérienne, vous disposez notamment d\'un droit d\'accès, de rectification et, lorsque applicable, d\'opposition ou de suppression de vos données personnelles, en nous contactant à l\'adresse ci-dessous. Nous répondrons dans les délais prévus par la réglementation.',
    ],
  },
  {
    title: 'Prestataires tiers',
    paragraphs: [
      'Le paiement en ligne peut être traité par Chargily ou d\'autres prestataires agréés. Leur politique de confidentialité s\'applique aux données transmises directement à eux lors du paiement.',
    ],
  },
  {
    title: 'Mise à jour de cette politique',
    paragraphs: [
      'Nous pouvons mettre à jour cette politique. La date de dernière mise à jour est indiquée en tête de page. Nous vous invitons à la consulter régulièrement.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      `Pour toute question relative à vos données personnelles : ${CONTACT.email}`,
      `Site : ${SITE}`,
    ],
  },
]
