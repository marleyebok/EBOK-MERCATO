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
  'Départemental 4',
  'Départemental 3',
  'Départemental 2',
  'Départemental 1',
  'Régional 3',
  'Régional 2',
  'Régional 1',
  'Pré-National',
  'National 3',
  'National 2',
  'National 1',
  'Espoirs / Centre de formation',
  'Pro B (Élite 2)',
  'Pro A (Betclic Élite)',
];

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

module.exports = { NIVEAUX, POSTES, REGIONS, AVANTAGES, CARACTERISTIQUES };
