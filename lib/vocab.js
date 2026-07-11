/**
 * Vocabulaire partagé (listes de valeurs) — source unique de vérité.
 * Exposé au frontend via GET /api/vocab.
 *
 * NOTE : "avantages" et "caracteristiques" sont des listes de départ,
 * à affiner ensemble plus tard (voir README).
 */

// Du plus bas au plus haut niveau — l'ordre sert aux filtres "niveau minimum".
const NIVEAUX = [
  'Loisir',
  'Départemental',
  'Régional',
  'Pré-Nationale',
  'Nationale 3',
  'Nationale 2',
  'Nationale 1',
  'Pro B',
  'Pro A',
];

// Parcours particuliers, hors classement (choix exact, sans logique de min./max.).
const AUTRES_PARCOURS = ['Étranger', 'NCAA', 'Highschool'];

// Liste complète pour les champs de profil (niveaux classés + autres parcours).
const NIVEAUX_TOUS = [...NIVEAUX, ...AUTRES_PARCOURS];

const POSTES = [
  'Meneur (1)',
  'Arrière (2)',
  'Ailier (3)',
  'Ailier fort (4)',
  'Pivot (5)',
];

const REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
  'Guadeloupe',
  'Martinique',
  'Guyane',
  'La Réunion',
  'Mayotte',
];

// À affiner ensemble plus tard.
const AVANTAGES = [
  'Rémunération',
  'Logement',
  'Emploi / job aménagé',
  'Études aménagées',
  'Voiture / défraiement',
  'Matériel fourni',
  'Stage / formation',
  'Encadrement médical / kiné',
  'Accès salle de musculation',
];

// À affiner ensemble plus tard.
const CARACTERISTIQUES = [
  'Scoreur',
  'Shooteur longue distance',
  'Défenseur',
  'Passeur / créateur',
  'Rebondeur',
  'Athlétique / explosif',
  'Meneur de jeu / vision',
  'Intensité / énergie',
  'Leader / vocal',
  'Polyvalent',
  'Jeu au poste bas',
  'Adresse mi-distance',
];

module.exports = { NIVEAUX, AUTRES_PARCOURS, NIVEAUX_TOUS, POSTES, REGIONS, AVANTAGES, CARACTERISTIQUES };
