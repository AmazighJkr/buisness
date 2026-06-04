"""Default legal page content (FR + EN) — seeded on first migration."""

SITE = 'https://embeddedgrid.onrender.com'
EMAIL = 'lab@embeddedgrid.dev'


def _privacy_fr():
    return {
        'title': 'Politique de confidentialité',
        'subtitle': f'EmbeddedGrid · {SITE}',
        'intro': [],
        'sections': [
            {
                'title': 'Introduction',
                'paragraphs': [
                    'EmbeddedGrid (« la Société », « nous ») s\'engage à protéger et respecter la vie privée des utilisateurs de son site et de ses clients. Les informations personnelles désignent toute information relative à une personne physique identifiée ou identifiable.',
                    'La présente politique explique comment nous recueillons, utilisons, conservons et protégeons vos données, conformément à la Loi Algérienne n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.',
                ],
            },
            {
                'title': 'Données collectées',
                'paragraphs': [
                    'Lors d\'une commande ou d\'une demande de contact, nous pouvons collecter : nom, prénom, adresse e-mail, numéro de téléphone, adresse de livraison, code postal, wilaya, notes de commande, historique de commandes et informations de paiement traitées par nos prestataires sécurisés (nous ne stockons pas les numéros complets de carte bancaire).',
                    'Lors de la navigation, des données techniques (adresse IP, type de navigateur, pages visitées) peuvent être enregistrées à des fins de sécurité et d\'amélioration du service.',
                ],
            },
            {
                'title': 'Finalités du traitement',
                'paragraphs': [
                    'Vos données personnelles sont utilisées pour : traiter et livrer votre commande ; vous contacter concernant votre commande ; assurer le support client ; prévenir la fraude ; respecter nos obligations légales ; améliorer notre site et nos services lorsque vous y avez consenti.',
                    'Vos données personnelles seront utilisées pour traiter votre commande, soutenir votre expérience sur ce site Web et à d\'autres fins décrites dans la présente politique de confidentialité.',
                ],
            },
            {
                'title': 'Cookies et technologies similaires',
                'paragraphs': [
                    'Nous utilisons des cookies et stockages locaux nécessaires au fonctionnement du site (session, panier, préférences de langue). Vous pouvez configurer votre navigateur pour refuser certains cookies ; certaines fonctionnalités du site pourraient alors ne plus fonctionner correctement.',
                ],
            },
            {
                'title': 'Conservation des données',
                'paragraphs': [
                    'Les données liées aux commandes sont conservées pendant la durée nécessaire à l\'exécution du contrat, aux obligations comptables et fiscales, et aux délais de prescription applicables en droit algérien.',
                ],
            },
            {
                'title': 'Communication et transfert',
                'paragraphs': [
                    'Nous ne vendons pas vos données personnelles. Elles peuvent être communiquées à nos prestataires (hébergement, paiement, livraison) uniquement dans la mesure nécessaire à l\'exécution de votre commande, sous contrat de confidentialité.',
                    'Tout transfert hors Algérie, le cas échéant, sera encadré par les garanties prévues par la réglementation applicable.',
                ],
            },
            {
                'title': 'Sécurité',
                'paragraphs': [
                    'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (chiffrement des communications, accès restreint, sauvegardes) pour protéger vos informations contre l\'accès non autorisé, la perte ou l\'altération.',
                ],
            },
            {
                'title': 'Vos droits',
                'paragraphs': [
                    'Conformément à la loi algérienne, vous disposez notamment d\'un droit d\'accès, de rectification et, lorsque applicable, d\'opposition ou de suppression de vos données personnelles, en nous contactant à l\'adresse ci-dessous. Nous répondrons dans les délais prévus par la réglementation.',
                ],
            },
            {
                'title': 'Prestataires tiers',
                'paragraphs': [
                    'Le paiement en ligne peut être traité par Chargily ou d\'autres prestataires agréés. Leur politique de confidentialité s\'applique aux données transmises directement à eux lors du paiement.',
                ],
            },
            {
                'title': 'Mise à jour de cette politique',
                'paragraphs': [
                    'Nous pouvons mettre à jour cette politique. La date de dernière mise à jour est indiquée en tête de page. Nous vous invitons à la consulter régulièrement.',
                ],
            },
            {
                'title': 'Contact',
                'paragraphs': [f'Pour toute question : {EMAIL}', f'Site : {SITE}'],
            },
        ],
    }


def _privacy_en():
    return {
        'title': 'Privacy Policy',
        'subtitle': f'EmbeddedGrid · {SITE}',
        'intro': [],
        'sections': [
            {
                'title': 'Introduction',
                'paragraphs': [
                    'EmbeddedGrid ("we") is committed to protecting your privacy.',
                    'This policy explains how we collect, use, store, and protect your personal data.',
                ],
            },
            {
                'title': 'Data we collect',
                'paragraphs': [
                    'When you place an order we may collect your name, email, phone, delivery address, wilaya, postal code, and order notes. Payment card data is handled by our payment provider; we do not store full card numbers.',
                ],
            },
            {
                'title': 'How we use your data',
                'paragraphs': [
                    'Your personal data will be used to process your order, support your experience on this website, and for other purposes described in this privacy policy.',
                ],
            },
            {
                'title': 'Contact',
                'paragraphs': [f'Questions: {EMAIL}', f'Website: {SITE}'],
            },
        ],
    }


def _terms_fr():
    intro = [
        f'La Société EmbeddedGrid commercialise des produits et services via {SITE}. '
        'La liste et le descriptif des biens peuvent être consultés sur ce site.',
    ]
    sections = [
        {
            'title': 'Article 1 : Objet',
            'paragraphs': [
                'Les présentes Conditions Générales de Vente déterminent les droits et obligations des parties '
                'dans le cadre de la vente en ligne de Produits ou Services proposés par la Société.',
            ],
        },
        {
            'title': 'Article 2 : Dispositions générales',
            'paragraphs': [
                'Les CGV régissent les ventes effectuées via le site et sont partie intégrante du Contrat. '
                'Elles sont opposables au Client qui les a acceptées avant de passer commande.',
                f'Consultables à : {SITE}/legal/terms',
                "La Société met en place une case à cocher et un clic de validation pour une acceptation claire et sans réserve.",
            ],
        },
        {
            'title': 'Article 14 : Protection des données personnelles',
            'paragraphs': [
                f'Voir la politique de confidentialité : {SITE}/legal/privacy',
            ],
        },
        {
            'title': 'Article 15 : Réclamations',
            'paragraphs': [f'Contact : EmbeddedGrid — {EMAIL}'],
        },
    ]
    return {
        'title': 'Conditions Générales de Vente',
        'subtitle': f'EmbeddedGrid — boutique en ligne · {SITE}',
        'intro': intro,
        'sections': sections,
    }


def _terms_en():
    intro = [
        f'EmbeddedGrid sells products and services through {SITE}. '
        'Product descriptions and prices are shown on the site.',
    ]
    sections = [
        {
            'title': 'Article 1: Purpose',
            'paragraphs': [
                'These General Terms and Conditions of Sale define the rights and obligations of the parties '
                'for online sales of products or services offered by the Company.',
            ],
        },
        {
            'title': 'Article 2: General provisions',
            'paragraphs': [
                'These GTC govern sales made through the website and form an integral part of the contract. '
                'They are binding on the Customer who accepted them before placing an order.',
                f'Available at: {SITE}/legal/terms',
                'The Customer must tick a checkbox and confirm acceptance before checkout.',
            ],
        },
        {
            'title': 'Article 14: Personal data',
            'paragraphs': [f'See our privacy policy: {SITE}/legal/privacy'],
        },
        {
            'title': 'Article 15: Complaints',
            'paragraphs': [f'Contact: EmbeddedGrid — {EMAIL}'],
        },
    ]
    return {
        'title': 'General Terms and Conditions of Sale',
        'subtitle': f'EmbeddedGrid online store · {SITE}',
        'intro': intro,
        'sections': sections,
    }


LEGAL_SEED = {
    'terms': {'fr': _terms_fr(), 'en': _terms_en()},
    'privacy': {'fr': _privacy_fr(), 'en': _privacy_en()},
}
