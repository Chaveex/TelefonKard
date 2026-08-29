# Telefonkarte — Sous-projet 3 : Prototype isolé du minijeu d'inspection RDA

## Contexte

`GAME_DESIGN.md` découpe la boucle RDA en deux étapes de développement
séparées (section "Prochaines étapes suggérées") :

3. Prototype isolé du minijeu d'inspection (`InspectionQueue` +
   `CardInspector`), avec le thème visuel RDA distinct.
4. Fusion des deux boucles + jauge de suspicion (avec de vraies
   conséquences narratives).

Ce spec couvre uniquement l'étape 3 : valider le feeling et le thème
visuel RDA du minijeu d'inspection, **sans** le connecter à la vraie
collection/état du joueur (`collectionStore`, sous-projet 1) et **sans**
conséquences narratives à la jauge de suspicion (ça, c'est le
sous-projet 4).

Hors scope explicite pour ce sous-projet :
- Fusion avec la boucle RFA (achat/collection) — `collectionStore` n'est
  ni lu ni modifié par ce sous-projet.
- Conséquences de la jauge de suspicion (avertissement → interrogatoire
  → arrestation/game over) — la jauge est un feedback visuel local
  uniquement, remise à zéro à chaque nouvelle manche.
- Actions "détruire" / "échanger" une carte (le doc en parle, mais elles
  n'ont de sens qu'une fois la collection RFA réellement connectée) —
  seules "Garder visible" et "Cacher" existent ici.
- Couches d'indices 2/3/4 du système de messages cachés — seule la
  couche 1 (numéro de série visiblement modifié, sous-projet 2) est
  utilisée comme critère de "carte compromettante".
- Portraits `RDA_portrait.png` / `RFA_portrait.png` — pas encore
  utilisés (pas de dialogue/narration dans ce prototype).
- Persistance — aucun état de ce sous-projet n'est sauvegardé en
  `localStorage`. Recharger la page réinitialise tout.

## Contenu inspecté

Pas de nouveau contenu : réutilise le pool `CARDS` (20 cartes,
`src/data/cards.ts`, sous-projet 1) et `ANOMALOUS_CARD_IDS`
(`src/data/messages.ts`, sous-projet 2 — cartes `"3"`, `"7"`, `"12"`,
`"18"`) comme unique critère de "carte compromettante".

## Accès dans l'app

Un 3e onglet dans `App.tsx`, à côté de "Collection" et "Boutique" :
"Inspection (proto)". Aucun lien de données avec `useCollectionStore` —
c'est un écran isolé, cohérent avec l'objectif de prototype.

## Stack technique

Aucune nouvelle dépendance. Réutilise React + Vite + TypeScript déjà en
place (sous-projet 1). Pas de Zustand : l'état du minijeu est local au
composant `InspectionQueue` (`useState`), pas de store dédié, pas de
persistance — cohérent avec "prototype isolé, pas encore fusionné".

## Données / logique pure

```ts
// src/data/inspection.ts
export const QUEUE_SIZE = 8;
export const GUARANTEED_ANOMALOUS = 2;
export const SUSPICION_PENALTY = 20;
export const ROUND_SECONDS = 60;

export function generateQueue(): CardDef[];
// Tire GUARANTEED_ANOMALOUS cartes (2) uniformément parmi ANOMALOUS_CARD_IDS
// (sans remise), puis QUEUE_SIZE - GUARANTEED_ANOMALOUS cartes (6) uniformément
// parmi les cartes de CARDS dont l'id n'est PAS dans ANOMALOUS_CARD_IDS (sans
// remise), puis mélange l'ensemble des QUEUE_SIZE (8) cartes (Fisher-Yates).
// Aucun doublon de carte dans la file résultante.

export function isCompromising(cardId: string): boolean;
// = ANOMALOUS_CARD_IDS.includes(cardId) — ré-exposé ici pour que les
// composants rda/ n'importent pas directement messages.ts (séparation
// des couches data/inspection vs data/messages).
```

`generateQueue()` utilise `Math.random()` comme `collectionStore.openPack()`
(sous-projet 1) — même style de mock dans les tests
(`vi.spyOn(Math, "random")`).

## Boucle de jeu

1. À l'ouverture de l'onglet (ou clic "Nouvelle manche"), `generateQueue()`
   produit une file de 8 cartes ; `secondsLeft` initialisé à
   `ROUND_SECONDS` (60) ; `suspicion` à 0 ; `currentIndex` à 0 ;
   `missedAnomalies` à 0 ; `roundOver` à `false`.
2. Un timer (`setInterval`, 1s) décrémente `secondsLeft`. Quand il atteint
   0, ou quand `currentIndex >= queue.length` (file épuisée), la manche
   se termine (`roundOver = true`), le timer est arrêté (`clearInterval`).
3. Pour la carte courante (`queue[currentIndex]`), affichage de
   `CardInspector` (image + effet loupe) et du numéro de série
   (`getSerialNumber(card.id)` du sous-projet 2) sous l'image.
4. Deux boutons : "Garder visible" et "Cacher".
   - Si la carte est compromettante (`isCompromising(card.id)`) et le
     joueur clique "Garder visible" : `suspicion += SUSPICION_PENALTY`
     (plafonné à 100), `missedAnomalies += 1`.
   - Dans tous les autres cas (carte propre + n'importe quel choix, ou
     carte compromettante + "Cacher") : aucune pénalité.
   - Dans tous les cas : `currentIndex += 1` (avance à la carte
     suivante). Si `currentIndex` atteint `queue.length` après
     incrément, la manche se termine immédiatement (pas besoin d'attendre
     le tick de timer suivant).
5. Écran de fin de manche (`roundOver === true`) : affiche `suspicion`
   final, `missedAnomalies` (sur `GUARANTEED_ANOMALOUS`, donc "X/2 cartes
   compromettantes ratées"), et un bouton "Nouvelle manche" qui relance
   l'étape 1.

## Composants

```
src/components/rda/
  InspectionQueue.tsx   # orchestration : state (queue, currentIndex, suspicion,
                          # secondsLeft, roundOver, missedAnomalies), timer,
                          # rendu carte courante ou écran de fin de manche
  CardInspector.tsx     # <img> + effet loupe (onMouseMove → transform: scale()
                          # + transform-origin suivant le curseur) + numéro de
                          # série sous l'image (texte, pas d'interaction)
  SuspicionMeter.tsx    # jauge 0-100 : prop { value: number }, barre de
                          # progression stylée thème RDA
```

`CardInspector` reçoit `{ card: CardDef }` (pas de prop `count` —
contrairement à `CardView` du sous-projet 1, pas de notion de doublon
possédé ici). Il ne réutilise PAS `CardView` : effet visuel différent
(loupe au survol vs badge de doublon), composants distincts avec des
responsabilités distinctes.

## Thème visuel RDA

Nouveau fichier `src/styles/theme-rda.css`, scopé sous une classe
wrapper `.rda-theme` (posée sur la racine de `InspectionQueue`) pour ne
pas fuiter sur les écrans RFA existants (`theme-rfa.css` reste
inchangé). Palette désaturée/grise, typographie plus rigide
("administrative"), cohérent avec le tableau de contraste RFA/RDA du
GAME_DESIGN.md (section "Comment montrer le contraste RFA / RDA").

```css
.rda-theme {
  --rda-bg: #2b2b28;
  --rda-panel: #3a3a36;
  --rda-text: #d8d4c8;
  --rda-accent: #8a1f1f;
  --rda-border: #5a5a54;
  font-family: "Courier New", monospace;
}
```

(Valeurs de palette indicatives, ajustables en implémentation tant que
le contraste avec le thème RFA vif/coloré reste net.)

## Error handling

- `generateQueue()` suppose `ANOMALOUS_CARD_IDS.length >=
  GUARANTEED_ANOMALOUS` (4 >= 2, vrai aujourd'hui) et
  `CARDS.length - ANOMALOUS_CARD_IDS.length >= QUEUE_SIZE -
  GUARANTEED_ANOMALOUS` (16 >= 6, vrai aujourd'hui) — pas de garde
  runtime supplémentaire, ce sont des invariants du contenu actuel du
  jeu, pas une entrée utilisateur imprévisible.
- Timer : `clearInterval` appelé au démontage du composant
  (`useEffect` cleanup) pour éviter une fuite si le joueur quitte
  l'onglet Inspection avant la fin de la manche.

## Testing

- `src/data/inspection.test.ts` (Vitest, `Math.random` mocké comme
  `collectionStore.test.ts`) :
  - `generateQueue()` retourne exactement `QUEUE_SIZE` (8) cartes.
  - Exactement `GUARANTEED_ANOMALOUS` (2) d'entre elles ont un id dans
    `ANOMALOUS_CARD_IDS`.
  - Aucun id dupliqué dans la file retournée.
  - `isCompromising()` cohérent avec `ANOMALOUS_CARD_IDS` (vrai pour
    chaque id du tableau, faux pour un id hors tableau).
- Pas de test automatisé sur `InspectionQueue`/`CardInspector`/
  `SuspicionMeter` (composants UI + timer) — vérification manuelle via
  `npm run dev`, cohérent avec la stratégie de test déjà établie pour
  les sous-projets 1 et 2 de ce projet.

## Arborescence de fichiers (nouveaux/modifiés)

```
src/
  data/
    inspection.ts          # nouveau
    inspection.test.ts      # nouveau
  components/
    rda/
      InspectionQueue.tsx   # nouveau
      CardInspector.tsx      # nouveau
      SuspicionMeter.tsx     # nouveau
  styles/
    theme-rda.css            # nouveau
  App.tsx                    # modifié : 3e onglet "Inspection (proto)"
```

## Prochaines étapes (hors scope de ce spec)

1. Sous-projet 4 : fusion des deux boucles — `InspectionQueue` lit la
   vraie collection possédée (`useCollectionStore`), la jauge de
   suspicion a de vraies conséquences (avertissement → interrogatoire →
   perte d'un contact → arrestation/game over), actions "détruire" et
   "échanger" ajoutées avec effet réel sur `collectionStore`.
2. Sous-projet 5 : couches d'indices 2-4, contenu narratif complet,
   structuration en actes, épilogue 1989-1990.
