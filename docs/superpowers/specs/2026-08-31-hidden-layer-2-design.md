# Telefonkarte — Sous-projet 5b : Indices couche 2 (marquage par exemplaire)

## Contexte

`GAME_DESIGN.md` (section "Système de messages cachés") décrit une
couche d'indices 2 : un trait caché porté par **un seul exemplaire
physique** parmi plusieurs copies d'une même carte, révélé uniquement
en comparant à un exemplaire "propre" de référence. Le sous-projet 5a
a préparé le terrain en migrant `collectionStore` vers un modèle par
exemplaire (`instances: CardInstance[]`) mais sans y attacher aucune
propriété de couche 2 (`CardInstance` n'avait que `cardId` et
`instanceId`).

Ce spec ajoute la donnée et la logique pure de la couche 2 :
· quel exemplaire (s'il y en a un) porte le trait caché,
· quelle lettre ce trait révèle.

Explicitement **hors scope** pour ce sous-projet (cf. décisions prises
en amont) :
- Tout rendu visuel (pas de calque de couleur sur une lettre imprimée,
  pas d'encoche dessinée) — `markedLetter` reste une donnée abstraite,
  la mécanique de rendu concrète (couleur vs encoche) est un choix
  d'implémentation UI différé à un sous-projet ultérieur.
- Toute UI de comparaison entre deux exemplaires (le "screen" où le
  joueur pose deux cartes côte à côte) — ce spec n'ajoute aucun
  composant, seulement la donnée et une fonction pure de révélation.
- Toute intégration avec la boucle d'Inspection (un exemplaire marqué
  ne devient pas automatiquement "compromettant" dans
  `generateQueue`/`isCompromising` — ce comportement reste piloté par
  `ANOMALOUS_CARD_IDS` exactement comme avant).
- Contenu narratif réel du message assemblé (les lettres choisies ici
  sont des valeurs fixes arbitraires, sans signification — assembler
  un message lisible est la couche 3, un sous-projet distinct).
- Toute modification de `destroyCard` pour préférer détruire une copie
  non marquée plutôt qu'une copie marquée — sans UI pour que le joueur
  distingue les deux, ce choix n'a pas de sens ; `destroyCard` continue
  de retirer la première instance correspondante, comme depuis 5a.

## Modèle de données

`src/data/cardInstance.ts` (fichier existant, étendu) :

```ts
export interface CardInstance {
  cardId: string;
  instanceId: string;
  markedLetter?: string; // présent seulement sur l'exemplaire "chaud"
}
```

`generateInstanceId` et `computeOwned` restent inchangées.

### Table des lettres cachées

Nouveau, dans `src/data/messages.ts` (fichier existant, qui porte déjà
`ANOMALOUS_CARD_IDS` et `getSerialNumber` — logique de couche 1) :

```ts
export const HIDDEN_LETTERS: Record<string, string> = {
  "3": "K",
  "7": "G",
  "12": "B",
  "18": "R",
};
```

Une entrée par `cardId` de `ANOMALOUS_CARD_IDS`. Valeurs arbitraires
sans signification narrative pour l'instant (cf. hors-scope ci-dessus).

### Nouvelles fonctions pures (`cardInstance.ts`)

```ts
export const MARK_CHANCE = 0.3;

export function createInstance(cardId: string): CardInstance;
// Génère instanceId comme avant. Si cardId est dans ANOMALOUS_CARD_IDS
// (import depuis messages.ts) ET Math.random() < MARK_CHANCE, ajoute
// markedLetter = HIDDEN_LETTERS[cardId]. Sinon, pas de markedLetter
// sur l'objet retourné (propriété absente, pas undefined explicite,
// pour rester cohérent avec `markedLetter?: string` optionnel).

export function revealMarkedLetter(
  instances: CardInstance[],
  cardId: string,
): string | null;
// Filtre instances par cardId, retourne le markedLetter de la première
// instance qui en porte un, ou null si aucune (carte non marquable,
// ou marquée mais l'exemplaire n'a pas été tiré, ou 0 exemplaire).
// Ne fait aucune hypothèse sur le nombre d'exemplaires passés — la
// contrainte "il faut au moins 2 copies pour comparer" est une règle
// d'UI/narrative future, pas une garde dans cette fonction.
```

## `collectionStore` — wiring

`openPack` appelle désormais `createInstance(card.id)` au lieu de
construire l'objet `{ cardId, instanceId: generateInstanceId(...) }`
inline. C'est le seul changement dans `collectionStore.ts`.

`destroyCard`, `computeOwned`, `resetCollection` : aucun changement de
comportement. `owned` reste dérivé de `instances` exactement comme
avant — `markedLetter` n'entre pas dans le calcul.

## Error handling

Pas de nouveau cas d'erreur : `createInstance` et `revealMarkedLetter`
sont des fonctions pures, totales sur leurs entrées (jamais
d'exception). Un `cardId` inconnu de `HIDDEN_LETTERS`/
`ANOMALOUS_CARD_IDS` produit simplement une instance jamais marquée —
comportement identique à celui des autres cartes "propres"
aujourd'hui.

## Testing

- `src/data/cardInstance.test.ts` (existant, étendu) :
  - `createInstance` sur une carte non-anomalous ne pose jamais
    `markedLetter` (répéter l'appel plusieurs fois, mocker
    `Math.random` à 0 pour éliminer le hasard comme variable).
  - `createInstance` sur une carte anomalous avec `Math.random`
    mocké sous `MARK_CHANCE` pose `markedLetter` = la lettre attendue
    de `HIDDEN_LETTERS`.
  - `createInstance` sur une carte anomalous avec `Math.random` mocké
    au-dessus de `MARK_CHANCE` ne pose pas `markedLetter`.
  - `revealMarkedLetter` retourne `null` sur une liste vide.
  - `revealMarkedLetter` retourne `null` quand aucune instance du
    `cardId` donné n'est marquée.
  - `revealMarkedLetter` retourne la lettre quand une instance est
    marquée, en ignorant les instances d'autres `cardId`.
- `src/state/collectionStore.test.ts` (existant, ajustement minimal) :
  - Un test `openPack` avec `Math.random` mocké pour (a) sélectionner
    une carte anomalous ET (b) tomber sous `MARK_CHANCE` vérifie que
    l'instance ajoutée porte le `markedLetter` attendu. Nécessite un
    `Math.random` mocké à retourner des valeurs différentes à chaque
    appel (`mockReturnValueOnce` enchaînés) puisque `openPack` appelle
    `Math.random` une fois pour tirer la carte, `createInstance` une
    fois pour le tirage de marquage.
  - Tests existants qui mockent `Math.random` à `0` pour tirer
    `CARDS[0]` : `0 < MARK_CHANCE (0.3)` est vrai, donc si `CARDS[0].id`
    est un `cardId` anomalous, ces tests verraient désormais
    systématiquement une instance marquée — à vérifier lors de
    l'implémentation ; si c'est le cas, soit `CARDS[0]` n'est pas
    anomalous (rien à faire), soit ces tests doivent mocker
    `Math.random` avec des valeurs successives distinctes (carte, puis
    marquage) pour rester déterministes et lisibles.

## Arborescence de fichiers (nouveaux/modifiés)

```
src/
  data/
    messages.ts              # modifié : + HIDDEN_LETTERS
    cardInstance.ts          # modifié : + markedLetter, createInstance, revealMarkedLetter, MARK_CHANCE
    cardInstance.test.ts     # modifié : + tests createInstance/revealMarkedLetter
  state/
    collectionStore.ts       # modifié : openPack utilise createInstance
    collectionStore.test.ts  # modifié : test de marquage sur openPack, ajustement des tests Math.random existants si besoin
```

## Prochaines étapes (hors scope de ce spec)

1. UI de comparaison entre deux exemplaires (poser un exemplaire à
   côté d'une référence "propre", révéler visuellement la différence).
2. Intégration de `revealMarkedLetter` dans la boucle d'Inspection ou
   la Collection (où et comment le joueur déclenche la comparaison).
3. Couche 3 : assembler un message réel à partir des lettres de
   plusieurs cartes d'une série, dans le bon ordre.
