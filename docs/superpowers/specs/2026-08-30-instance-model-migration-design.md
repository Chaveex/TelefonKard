# Telefonkarte — Sous-projet 5a : Migration vers un modèle de collection par exemplaire

## Contexte

`GAME_DESIGN.md` prévoit un "sous-projet 5" qui regroupe en réalité
plusieurs sous-systèmes indépendants et volumineux (couches d'indices
2-4, contenu narratif complet, structuration en actes, épilogue
1989-1990). Ce spec ne couvre qu'un préalable technique à la couche
d'indices 2 : la migration du modèle de données de la collection.

Aujourd'hui (sous-projets 1-4b), `collectionStore` suit la collection du
joueur comme un simple compteur par carte : `owned: Record<string,
number>`. La couche d'indices 2 (`GAME_DESIGN.md`, section "Système de
messages cachés") nécessite de distinguer des propriétés **par
exemplaire physique** d'une carte (par exemple, savoir laquelle des 2-3
copies possédées d'une carte porte l'indice caché) — un compteur seul
ne peut pas exprimer ça.

Ce spec migre uniquement le modèle de données vers un suivi par
exemplaire (`instances: CardInstance[]`), **sans changer aucun
comportement visible côté joueur**. La couche d'indices 2 elle-même
(propriétés réelles par exemplaire, révélation par comparaison de
doublons) est un sous-projet distinct (5b), qui construira sur ce
nouveau modèle.

Hors scope explicite pour ce sous-projet :
- Toute propriété par exemplaire liée aux indices (couche 2) —
  `CardInstance` n'a que `cardId` et `instanceId` pour l'instant.
- Migration des sauvegardes `localStorage` existantes depuis l'ancien
  format `{coins, owned}` — une sauvegarde dans l'ancien format
  déclenche simplement le repli sur l'état initial (comportement déjà
  en place pour toute forme invalide), pas de migration réelle.
- Tout changement dans `CollectionGrid.tsx`, `ShopScreen.tsx`,
  `InspectionQueue.tsx`, `inspection.ts` (`generateQueue`) — ces
  fichiers continuent de lire `state.owned` exactement comme avant, ce
  modèle reste dérivé et exposé sans changement de forme.

## Nouveau modèle de données

Nouveau fichier, logique pure et testable, indépendante de Zustand :

```ts
// src/data/cardInstance.ts
export interface CardInstance {
  cardId: string;
  instanceId: string;
}

export function generateInstanceId(cardId: string): string;
// Génère un identifiant unique par exemplaire, préfixé par cardId pour
// lisibilité en debug (ex: "3-lz8k2f-a1b2c3"). Pas besoin d'unicité
// cryptographique — juste assez pour ne jamais collisionner en usage
// normal (Date.now() + Math.random()).

export function computeOwned(instances: CardInstance[]): Record<string, number>;
// Regroupe les instances par cardId et compte — c'est la fonction qui
// permet à `owned` de rester dérivé de `instances` sans jamais diverger.
```

## `collectionStore` — migration interne

`instances: CardInstance[]` devient la source de vérité persistée
(remplace `owned` dans le JSON stocké en `localStorage`). `owned:
Record<string, number>` reste un champ du state exposé par le store,
mais désormais **calculé via `computeOwned(instances)`** après chaque
mutation, plutôt que maintenu manuellement.

```ts
interface PersistedState {
  coins: number;
  instances: CardInstance[];
}

export interface CollectionState {
  coins: number;
  instances: CardInstance[];
  owned: Record<string, number>;   // dérivé de instances, forme inchangée pour les consommateurs existants
  openPack: () => CardDef | null;
  destroyCard: (cardId: string) => void;
  resetCollection: () => void;
}
```

Comportement de chaque action (identique côté joueur, différent en
interne) :
- `openPack()` : ajoute une nouvelle `CardInstance` à `instances`
  (au lieu d'incrémenter un compteur). `owned` recalculé et exposé
  après coup — un consommateur qui lit `state.owned[cardId]` voit
  exactement le même résultat qu'avant.
- `destroyCard(cardId)` : retire **une** instance dont `cardId`
  correspond (la première trouvée — aucune instance ne se distingue
  encore d'une autre à ce stade, la couche d'indices 2 changera ça).
  No-op si aucune instance ne correspond.
- `resetCollection()` : vide `instances` (`[]`), `owned` recalculé à
  `{}`.

Validation à la lecture (`isPersistedState`) : exige désormais `coins:
number` et `instances: unknown[]` (tableau, pas besoin de valider
chaque élément en profondeur pour ce sous-projet — un tableau
malformé produirait au pire un `owned` incohérent, pas une exception,
et ce cas n'est pas un scénario réaliste hors manipulation manuelle du
`localStorage`). Toute autre forme (y compris l'ancien `{coins,
owned}`) échoue la validation → repli sur l'état initial (`coins:
STARTING_COINS, instances: []`), cohérent avec le comportement déjà en
place pour toute forme invalide.

## Error handling

- Mêmes garanties qu'avant : `localStorage` absent, JSON invalide, ou
  forme invalide (y compris l'ancien format) → repli silencieux sur
  l'état initial, jamais d'exception.
- `destroyCard` sur un `cardId` sans instance correspondante : no-op
  silencieux (comportement inchangé par rapport à la version compteur).

## Testing

- `src/data/cardInstance.test.ts` (nouveau) : `computeOwned([])` →
  `{}` ; `computeOwned` avec plusieurs instances du même `cardId` →
  compteur correct ; `computeOwned` avec des `cardId` mélangés →
  compteurs indépendants corrects ; `generateInstanceId` produit des
  identifiants différents à chaque appel (pas de test de qualité
  cryptographique, juste absence de collision sur quelques dizaines
  d'appels).
- `src/state/collectionStore.test.ts` (réécriture partielle) : les
  tests qui *seedaient* directement `owned` via `store.setState({
  owned: {...} })` doivent désormais seeder `instances` — sinon
  `destroyCard` (qui lit `instances`, pas `owned`) ne trouve rien à
  retirer et les tests échouent silencieusement sur un état
  incohérent. Cas concernés : les 4 tests `destroyCard` existants,
  plus le test de réhydratation `localStorage` (doit seeder
  `{coins, instances: [...]}` au lieu de `{coins, owned: {...}}`), plus
  le test de persistance après `openPack`/`destroyCard`/`resetCollection`
  (doivent vérifier la forme persistée `{coins, instances}` au lieu de
  `{coins, owned}`). Ajout d'un nouveau test explicite : une
  sauvegarde dans l'ancien format `{coins, owned}` déclenche le repli
  sur l'état initial (capture la décision "reset simple" de ce spec).
  Les tests qui ne font que lire `store.getState().owned` sans jamais
  seeder directement (état initial, `openPack` normal, refus si solde
  insuffisant, forme invalide générique) restent inchangés — ils
  passent déjà avec la nouvelle implémentation sans modification.
- Pas de test automatisé sur `CollectionGrid`/`InspectionQueue`/
  `ShopScreen` — aucun de ces fichiers ne change dans ce sous-projet.

## Arborescence de fichiers (nouveaux/modifiés)

```
src/
  data/
    cardInstance.ts        # nouveau
    cardInstance.test.ts    # nouveau
  state/
    collectionStore.ts      # modifié : instances source de vérité, owned dérivé
    collectionStore.test.ts # modifié : seed via instances, forme persistée mise à jour
```

## Prochaines étapes (hors scope de ce spec)

1. Sous-projet 5b : couche d'indices 2 (micro-encoche par exemplaire,
   révélée par comparaison de doublons) — construit sur `CardInstance`
   en lui ajoutant les propriétés d'indice nécessaires.
2. Sous-projet 4b2 : interrogatoire + perte de contact (nécessite un
   système de contacts narratifs, distinct).
3. Sous-projet 4c : action "échanger" (nécessite un système de
   partenaires d'échange).
4. Sous-projets ultérieurs : couches d'indices 3-4, contenu narratif,
   structuration en actes, épilogue 1989-1990.
