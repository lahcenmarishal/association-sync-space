export const MOYENS_PAIEMENT = [
  "especes",
  "cheque",
  "virement",
  "carte",
  "prelevement",
  "autre",
] as const;

export const MOYENS_LABELS: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèque",
  virement: "Virement",
  carte: "Carte bancaire",
  prelevement: "Prélèvement",
  autre: "Autre",
};

export const ROLES = ["admin", "tresorier", "secretaire", "membre"] as const;

export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  tresorier: "Trésorier",
  secretaire: "Secrétaire",
  membre: "Membre",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Accès complet à toutes les fonctionnalités du système",
  tresorier:
    "Recettes, dépenses, caisse quotidienne, tableau de bord financier et export des rapports",
  secretaire:
    "Activités et documents associés, calendrier, et consultation en lecture seule des finances",
  membre: "Lecture seule : consultation des données sans aucune modification",
};

export const FINANCE_ROLES: AppRole[] = ["admin", "tresorier"];
export const ACTIVITY_ROLES: AppRole[] = ["admin", "secretaire"];

export const TYPES_CONTRAT = ["permanent", "occasionnel"] as const;

export const TYPE_CONTRAT_LABELS: Record<string, string> = {
  permanent: "Permanent",
  occasionnel: "Occasionnel",
};

export const STATUTS_TRAVAILLEUR = ["actif", "suspendu", "inactif"] as const;

export const STATUT_TRAVAILLEUR_LABELS: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  inactif: "Inactif",
};


export const TYPES_ACTIVITE = [
  "evenement",
  "reunion",
  "formation",
  "sortie",
  "caritative",
  "sportive",
  "culturelle",
  "assemblee",
  "autre",
] as const;

export const TYPE_ACTIVITE_LABELS: Record<string, string> = {
  evenement: "Événement",
  reunion: "Réunion",
  formation: "Formation",
  sortie: "Sortie",
  caritative: "Action caritative",
  sportive: "Sportive",
  culturelle: "Culturelle",
  assemblee: "Assemblée générale",
  autre: "Autre",
};

export const STATUT_ACTIVITE_LABELS: Record<string, string> = {
  prevue: "Prévue",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};
