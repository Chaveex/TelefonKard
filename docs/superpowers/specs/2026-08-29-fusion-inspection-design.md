# Telefonkarte — Sous-projet 4a : Fusion minimale (inspection ↔ collection réelle) + suspicion persistante

## Contexte

`GAME_DESIGN.md` (section "Prochaines étapes suggérées", étape 4) prévoit la
"fusion des deux boucles + jauge de suspicion". Cette étape, telle que
décrite dans le doc, regroupe en réalité plusieurs sous-systèmes
indépendants :

- (A) le minijeu d'inspection lit la vraie collection possédée du joueur
  au lieu du pool complet des 20 cartes ;
- (B) la jauge de suspicion devient persistante et a un sens continu
  (au lieu de se réinitialiser à chaque manche comme dans le prototype
  du sous-projet 3) ;
- (C) une échelle de conséquences narratives (avertissement →
  interrogatoire → perte d'un contact → arrestation/game over) ;
- (D) les actions "détruire" et "échanger" avec effet réel sur la
  collection.

Ce spec couvre uniquement (A), (B), et la moitié de (D) — l'action
"détruire" (l'action "échanger" nécessite un système de partenaires
d'échange qui n'existe pas encore dans le jeu, elle est donc hors
scope). (C) est également hors scope : la suspicion devient persistante
et visible en continu, mais n'entraîne encore aucune conséquence
narrative (pas de "contact" à perdre — ce concept n'existe pas encore
dans le jeu — pas de game over).

Hors scope explicite pour ce sous-projet :
- Action "échanger" (nécessite un système de partenaires d'échange).
- Toute conséquence narrative de la suspicion (avertissement,
  interrogatoire, perte de contact, arrestation, game over).
- Le concept de "contact" (personnage narratif) — n'existe pas encore.
- Table d'échange / négociation RFA-RDA combinée (section "Le pont
  entre les deux" du GAME_DESIGN.md) — c'est une scène narrative
  distincte, pas ce sous-projet.

## Fusion de la source de données

`InspectionQueue` (sous-projet 3) lit désormais `useCollectionStore`
(sous-projet 1) au lieu de tirer dans le pool complet `CARDS`. La file
d'inspection ne contient que des cartes réellement possédées par le
joueur.

`generateQueue()` change de signature :

```ts
// Avant (sous-projet 3)
export function generateQueue(): CardDef[];

// Après (ce sous-projet)
export function generateQueue(owned: Record<string, number>): CardDef[];
```

Comportement :
- `ownedCards` = cartes de `CARDS` dont `owned[id] > 0`.
- Taille de la file = `min(QUEUE_SIZE, ownedCards.length)` — s'adapte
  dynamiquement, plus de garantie de 8 cartes fixes.
- Nombre d'anomalies incluses = `min(GUARANTEED_ANOMALOUS, anomalies
  possédées, taille de la file)` — piochées en premier parmi les
  anomalies possédées.
- Le reste de la file est comblé avec les autres cartes possédées
  restantes (priorité aux cartes propres, mais si le joueur ne possède
  que des cartes anomalies, le reste est comblé avec les anomalies
  restantes plutôt que de laisser la file plus courte que nécessaire).
- 0 carte possédée → file vide (`[]`).
- Aucun doublon dans la file (chaque `CardDef` de `ownedCards` apparaît
  au plus une fois, indépendamment du nombre d'exemplaires possédés).

## Jauge de suspicion persistante

Nouveau store dédié, suivant l'arborescence suggérée par
`GAME_DESIGN.md` (`state/suspicionStore.ts`) :

```ts
// src/state/suspicionStore.ts
export interface SuspicionState {
  suspicion: number; // 0-100, persisté en localStorage
  addSuspicion: (amount: number) => void; // clamp [0,100], persiste après chaque appel
}
```

- Clé `localStorage` dédiée : `telefonkarte-suspicion`.
- Même pattern que `collectionStore` : factory `createSuspicionStore()`
  + singleton `useSuspicionStore`, lecture/écriture manuelle avec
  try/catch (pas de middleware Zustand persist), fallback à
  `{ suspicion: 0 }` sur erreur/absence/forme invalide.
- `InspectionQueue` n'a plus de state local `suspicion` : il lit et
  incrémente via `useSuspicionStore`. La suspicion ne se réinitialise
  plus au changement de manche ("Nouvelle manche" du sous-projet 3) ni
  au rechargement de la page — elle persiste tant qu'aucune action
  future (hors scope ici) ne la réduit.

## Action "Détruire"

Nouvelle action dans `collectionStore` :

```ts
// src/state/collectionStore.ts — ajout
destroyCard: (cardId: string) => void;
```

- `owned[cardId] > 1` → décrémente de 1.
- `owned[cardId] === 1` → supprime entièrement la clé (pas de `owned[id]
  = 0` qui traînerait).
- `owned[cardId]` absent ou 0 → no-op (rien à détruire).
- Persiste après mutation, même mécanisme que `openPack`.

Dans `InspectionQueue`, un 3e bouton "Détruire" (en plus de "Garder
visible" et "Cacher" du sous-projet 3) appelle `destroyCard(card.id)`
pour la carte courante, puis avance à la carte suivante comme les deux
autres actions. Aucune pénalité/bonus de suspicion spécifique à
"Détruire" — la seule pénalité existante (+`SUSPICION_PENALTY` si une
carte compromettante est gardée visible) est inchangée.

## Fusion de la file vide

Si le joueur ne possède aucune carte (`generateQueue(owned)` retourne
`[]`), `InspectionQueue` affiche "Rien à inspecter, ouvre d'abord des
packs !" et ne démarre ni timer ni manche — état distinct de l'écran de
fin de manche normal (qui référencerait une suspicion/un compte
d'anomalies ratées qui n'aurait pas de sens ici).

## Récap de fin de manche (mise à jour)

Le dénominateur "cartes compromettantes ratées : X/Y" n'utilise plus la
constante fixe `GUARANTEED_ANOMALOUS` (qui supposait toujours 2
anomalies dans une file de 8) mais le nombre réel d'anomalies présentes
dans la file générée pour cette manche (peut être 0, 1, ou 2 selon la
collection du joueur).

## Petite dette technique adressée en passant

La review finale du sous-projet 3 recommandait d'unifier le prédicat
"cette carte est-elle compromettante ?" avant le sous-projet 4, car
`CollectionGrid.tsx` (sous-projet 2) et `inspection.ts` (sous-projet 3)
avaient chacun leur propre façon de le calculer (`ANOMALOUS_CARD_IDS.includes(...)`
inline vs `isCompromising()`). `CollectionGrid.tsx` est mis à jour pour
utiliser `isCompromising()` importé de `src/data/inspection.ts`, au lieu
de son inline `ANOMALOUS_CARD_IDS.includes(selectedCard.id)`.

## Error handling

- `generateQueue(owned)` ne suppose plus d'invariant de contenu fixe
  (contrairement au sous-projet 3) — toute taille de collection, y
  compris vide, est un cas normal géré explicitement, pas une erreur.
- `destroyCard` sur une carte non possédée : no-op silencieux, pas
  d'exception (cohérent avec `openPack`'s garde `coins < PACK_PRICE`
  du sous-projet 1).
- `suspicionStore` : mêmes 3 cas de repli que `collectionStore`
  (localStorage absent, JSON invalide, forme invalide) → fallback
  `{ suspicion: 0 }`, jamais d'exception.

## Testing

- `src/state/suspicionStore.test.ts` (nouveau) : miroir de
  `collectionStore.test.ts` — état initial `suspicion: 0` ;
  `addSuspicion` incrémente et clampe à 100 ; persiste en
  `localStorage` ; rehydrate depuis `localStorage` ; fallback sur JSON
  invalide ; fallback sur forme invalide (`suspicion` non-numérique ou
  absent).
- `src/state/collectionStore.test.ts` (ajout de cas) : `destroyCard`
  décrémente un compteur > 1 ; `destroyCard` supprime la clé quand le
  compteur atteint 0 (pas de `owned[id] = 0` résiduel) ; `destroyCard`
  sur une carte non possédée est un no-op (pas de mutation, pas
  d'exception) ; `destroyCard` persiste après mutation.
- `src/data/inspection.test.ts` (réécrit pour la nouvelle signature) :
  file vide si `owned = {}` ; taille de file = `min(QUEUE_SIZE,
  ownedCards.length)` pour une collection réduite ; nombre d'anomalies
  incluses = `min(GUARANTEED_ANOMALOUS, anomalies possédées)` ; cas
  limite "collection 100% anomalies" (comble le reste avec des
  anomalies plutôt que de raccourcir la file) ; toujours pas de
  doublon ; couverture du shuffle avec `Math.random` réel (comme le
  fix de la review finale du sous-projet 3).
- Pas de test automatisé sur `InspectionQueue`/`CollectionGrid` (UI) —
  vérification manuelle, cohérent avec la stratégie de test déjà
  établie sur ce projet.

## Arborescence de fichiers (nouveaux/modifiés)

```
src/
  state/
    suspicionStore.ts        # nouveau
    suspicionStore.test.ts    # nouveau
    collectionStore.ts        # modifié : + destroyCard
    collectionStore.test.ts   # modifié : + cas destroyCard
  data/
    inspection.ts              # modifié : generateQueue(owned)
    inspection.test.ts         # réécrit pour la nouvelle signature
  components/
    rda/
      InspectionQueue.tsx      # modifié : lit collectionStore + suspicionStore, 3e bouton "Détruire"
    rfa/
      CollectionGrid.tsx       # modifié : utilise isCompromising() au lieu de l'inline ANOMALOUS_CARD_IDS.includes()
```

## Prochaines étapes (hors scope de ce spec)

1. Sous-projet 4b : échelle de conséquences narratives de la suspicion
   (avertissement → interrogatoire → perte de contact → arrestation),
   nécessite d'abord un système de "contacts" narratifs.
2. Sous-projet 4c : action "échanger", nécessite un système de
   partenaires d'échange/négociation.
3. Sous-projet 5 : couches d'indices 2-4, contenu narratif complet,
   structuration en actes, épilogue 1989-1990.
