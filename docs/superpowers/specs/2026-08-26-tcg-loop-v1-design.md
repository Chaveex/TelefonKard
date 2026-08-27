# Telefonkarte — Sous-projet 1 : Boucle TCG seule (V1 / Acte 1)

## Contexte

Ce spec couvre uniquement la première étape de développement recommandée par
`GAME_DESIGN.md` : la boucle de collection façon TCG côté RFA, isolée de tout
le reste (RDA, jauge de suspicion, messages cachés, narratif). L'objectif est
de valider le feeling et le thème visuel RFA avant d'ajouter la complexité
des sous-projets suivants.

Hors scope explicite pour cette V1 :
- Boucle d'inspection/RDA (`InspectionQueue`, `CardInspector`, `SuspicionMeter`).
- Système de messages cachés (les 4 couches d'indices du GAME_DESIGN.md).
- Écran d'échange/négociation avec des collectionneurs (PNJ).
- Revenu récurrent (le doc prévoit que le joueur gagne des pièces
  supplémentaires côté RDA — ce mécanisme sera conçu dans le sous-projet
  suivant, pas ici).
- Portraits `RDA_portrait.png` / `RFA_portrait.png` — réservés aux écrans
  narratifs/inspection d'un sous-projet ultérieur, non utilisés en V1.
- Répartition en raretés (commune/rare/promo) — les 20 cartes sont
  équivalentes en V1.

## Contenu de collection

Les 20 images `public/1.jpeg` … `public/20.jpeg` constituent l'intégralité
du pool de cartes tirables. Chaque carte a un id (son numéro), une image, et
un nom placeholder (`Carte n°<id>`) — pas de vrai lore par carte en V1.

## Stack technique

Reprise telle quelle de la recommandation du GAME_DESIGN.md :
- React + Vite, TypeScript.
- Zustand pour l'état global (`collectionStore`) — pas de Redux, scope trop
  petit pour le justifier.
- Framer Motion pour l'animation d'ouverture de pack (retournement/reveal).
- Persistance `localStorage` (clé `telefonkarte-collection`), rehydratée au
  boot. Pas d'IndexedDB en V1 (volume de données trop faible).
- Pas de router : navigation par état local entre 2 vues (Collection /
  Boutique), pas de 3D/Three.js (déjà écarté par le doc).

## Data model

```ts
// data/cards.ts
interface CardDef {
  id: string;        // "1".."20"
  image: string;      // "/1.jpeg" .. "/20.jpeg"
  name: string;        // "Carte n°<id>" — placeholder, pas de lore v1
}
export const CARDS: CardDef[]; // généré depuis les 20 fichiers de public/

// state/collectionStore.ts
interface CollectionState {
  coins: number;                    // 100 au départ, fixe (pas de revenu récurrent en v1)
  owned: Record<string, number>;    // cardId -> count (absent ou 0 si jamais tirée)
  openPack(): CardDef;               // débite 20 pièces, tire 1 carte random uniforme parmi les 20,
                                      // incrémente owned[id], no-op si coins < 20
}
```

Règles :
- Tirage aléatoire uniforme sur les 20 cartes (pas de pondération de rareté
  en v1, puisqu'il n'y a pas de rareté).
- Un doublon (carte déjà à `owned[id] >= 1`) incrémente simplement le
  compteur — pas de conversion en pièces, pas de mécanique supplémentaire.
  Les doublons ne sont pas exploités en V1 ; ils serviront la couche
  d'indices niveau 2 d'un sous-projet ultérieur.
- Prix fixe d'un pack booster : 20 pièces. Avec 100 pièces de départ, le
  joueur peut ouvrir jusqu'à 5 packs.

## Écrans

### CollectionGrid
Grille affichant **uniquement les cartes possédées** (`owned[id] >= 1`) —
aucun slot verrouillé/grisé pour les cartes non possédées, la grille grandit
au fur et à mesure des packs ouverts. Chaque carte possédée affiche son image
et un badge `×N` si N > 1. État vide (aucune carte) : message "Aucune carte
encore, ouvre un pack !". Clic sur une carte → fiche détail (zoom simple, pas
de loupe/`CardInspector`, ça c'est le sous-projet inspection).

### ShopScreen
Affiche le solde de pièces courant et un bouton "Ouvrir un pack (20)".
Le bouton est désactivé (grisé, non cliquable) si `coins < 20`.

### PackOpening
Écran de transition déclenché par `openPack()` : animation Framer Motion
(carte dos → face) révélant la carte tirée, puis bouton "Continuer" qui
ramène vers Collection ou Boutique.

### Navigation
Deux onglets (Collection / Boutique), un seul écran actif à la fois, état de
navigation local au composant racine (pas de router — inutile pour 2 vues).

## Error handling

- `openPack()` appelé avec `coins < 20` : no-op côté store (garde defensive),
  en plus du bouton désactivé côté UI — double garde state + UI.
- `localStorage` absent, corrompu ou non parseable au boot : fallback sur
  l'état initial (`coins: 100, owned: {}`), pas de crash, pas d'alerte
  bloquante.
- Image de carte introuvable (404) : `alt` text + fond neutre, ne bloque pas
  le rendu du reste de la grille.

## Testing

- Tests unitaires (Vitest) sur `collectionStore` :
  - état initial : `coins === 100`, `owned === {}`.
  - `openPack()` débite bien 20 pièces et incrémente la carte tirée.
  - `openPack()` sur doublon incrémente le compteur existant (pas de
    duplication d'entrée).
  - `openPack()` refusé si `coins < 20` (aucun débit, aucun tirage).
  - persistance : état sauvegardé en `localStorage` puis rehydraté à
    l'identique.
- Pas de tests e2e en V1 (scope trop restreint). Vérification manuelle via
  `npm run dev` : ouverture de pack, mise à jour de la grille, désactivation
  du bouton à solde insuffisant.

## Arborescence de fichiers (sous-ensemble de celle du GAME_DESIGN.md)

```
src/
  state/
    collectionStore.ts
  data/
    cards.ts
  components/
    rfa/
      CollectionGrid.tsx
      ShopScreen.tsx
      PackOpening.tsx
    shared/
      CardView.tsx
  styles/
    theme-rfa.css
```

## Prochaines étapes (hors scope de ce spec)

1. Sous-projet 2 : couche d'indices niveau 1-2 sur les cartes (doublons
   exploités ici).
2. Sous-projet 3 : boucle d'inspection RDA (`InspectionQueue`,
   `CardInspector`, `SuspicionMeter`), thème visuel RDA, portraits.
3. Sous-projet 4 : fusion des deux boucles, jauge de suspicion, revenu RDA.
4. Sous-projet 5 : contenu narratif complet, actes, épilogue 1989-1990.
