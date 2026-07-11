/**
 * Configuration Firebase (côté client).
 *
 * ⚠️ Remplace les valeurs ci-dessous par celles de TON projet Firebase :
 *   Console Firebase → Paramètres du projet → « Tes applications » → Config SDK.
 *
 * Ces valeurs sont PUBLIQUES par conception (elles finissent dans le navigateur).
 * La sécurité repose sur les règles Firestore/Storage (voir firestore.rules / storage.rules),
 * pas sur le secret de cette config. Tu peux donc committer ce fichier.
 */
export const firebaseConfig = {
  apiKey: 'REMPLACE_MOI',
  authDomain: 'REMPLACE_MOI.firebaseapp.com',
  projectId: 'REMPLACE_MOI',
  storageBucket: 'REMPLACE_MOI.appspot.com',
  messagingSenderId: 'REMPLACE_MOI',
  appId: 'REMPLACE_MOI',
};

// Vrai une fois la vraie config renseignée.
export function isConfigured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REMPLACE_MOI');
}
