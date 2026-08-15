// Données des 6 familles de capacités. Séparées du composant pour garder
// des fichiers courts et un copy éditable sans toucher à l'animation.

export interface Capability {
  title: string;
  detail: string;
}

export interface Family {
  key: string;
  label: string;
  headline: string;
  capabilities: Capability[];
}

export const families: Family[] = [
  {
    key: 'vendre',
    label: 'Vendre',
    headline: 'Un vendeur dans votre barre de recherche. Pas un chatbot.',
    capabilities: [
      {
        title: 'Vendeur conversationnel',
        detail: 'Le visiteur tape ce qu\'il cherche, le vendeur fouille votre catalogue et propose les bons produits en expliquant pourquoi. Votre ton, votre vocabulaire, vos accords.',
      },
      {
        title: 'Ventes additionnelles',
        detail: 'À chaque fiche, 3 à 5 suggestions complémentaires choisies dans votre stock, chacune avec sa raison. Pas une grille anonyme.',
      },
    ],
  },
  {
    key: 'recuperer',
    label: 'Récupérer',
    headline: 'Les paniers et les clients qui partent ne partent plus.',
    capabilities: [
      {
        title: 'Relance panier abandonné',
        detail: 'Deux emails personnalisés en 48 h, avec code promo sur le deuxième si besoin. Le panier ne se perd plus dans la nature.',
      },
      {
        title: 'Winback clients inactifs',
        detail: 'Repérage des clients partis depuis 60 jours. Newsletter ou code dédié, envoyé automatiquement.',
      },
    ],
  },
  {
    key: 'servir',
    label: 'Servir',
    headline: 'Le service client tourne pendant que vous dormez.',
    capabilities: [
      {
        title: 'Triage des mails',
        detail: 'Chaque mail entrant est catégorisé (SAV, question, avis). Un brouillon de réponse est prêt, jamais envoyé sans vous.',
      },
      {
        title: 'SAV automatisé',
        detail: 'Une réclamation crée un ticket, l\'équipe est alertée sur les cas urgents, les résolutions sont suivies et relancées.',
      },
      {
        title: 'Suivi de commande',
        detail: 'Le client est tenu au courant à chaque étape par SMS et email. Demande d\'avis dès la livraison.',
      },
    ],
  },
  {
    key: 'fideliser',
    label: 'Fidéliser',
    headline: 'Les avis bien gérés, sans laisser passer les mauvais.',
    capabilities: [
      {
        title: 'Collecte d\'avis post-livraison',
        detail: 'Demande automatique 48 h après la livraison. Les 4-5 étoiles vont sur la fiche produit. Les 1-2 étoiles alertent l\'équipe avant d\'être publiées ailleurs.',
      },
    ],
  },
  {
    key: 'diffuser',
    label: 'Diffuser',
    headline: 'Vos pubs et newsletters, générées avec votre catalogue.',
    capabilities: [
      {
        title: 'Campagnes pub & ads',
        detail: 'Un prompt simple ("5 visuels pour mes nouveautés") et Shimmer sort des ads dans votre identité, sur vos top-sellers. Prêts à valider et publier.',
      },
      {
        title: 'Newsletters segmentées',
        detail: 'Emails saisonniers, lancements, relances. Segmentation automatique sur le comportement réel des clients.',
      },
    ],
  },
  {
    key: 'mesurer',
    label: 'Mesurer',
    headline: 'Le chiffre, à l\'euro près, au même endroit.',
    capabilities: [
      {
        title: 'Tableau de bord unifié',
        detail: 'Toutes les ventes, tous les indicateurs, tous les modules sur un seul écran. Variations vs mois précédent en clair.',
      },
      {
        title: 'KPIs par service',
        detail: 'Une vue Vente, une vue Relation client, une vue Marketing. Chaque équipe voit ce qui la concerne, sans le bruit.',
      },
    ],
  },
];
