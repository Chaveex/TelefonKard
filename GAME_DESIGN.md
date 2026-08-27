# Telefonkarte — Jeu de collection & espionnage discret (RFA/RDA)

## Pitch

Le joueur incarne un collectionneur ouest-allemand (RFA) de Telefonkarten dans les
années 1980. Sous couvert de ce hobby "inoffensif", il sert en réalité de relais
d'information entre familles séparées par le Mur de Berlin. Le jeu mélange deux
boucles de gameplay : une boucle de collection façon TCG (côté RFA, ouvert,
prospère) et une boucle de tension/inspection façon *Papers, Please* (côté RDA,
clandestin, sous surveillance).

Le cœur thématique du jeu est le **contraste** entre les deux Allemagnes :
un monde matériellement riche et technologiquement avancé (RFA) contre un monde
de pénurie, de surveillance et de débrouille (RDA). Ce contraste doit se lire
visuellement, mécaniquement et narrativement, pas seulement dans le texte.

---

## Contexte historique (pour cohérence narrative)

- Première carte téléphonique au monde : Italie, 1976.
- RFA : premiers tests de cartes téléphoniques prépayées en juin 1983
  (Deutsche Bundespost), généralisation nationale en 1990.
- RDA : **aucune carte téléphonique n'existait avant 1990**. Le réseau
  reposait sur des cabines à pièces (Münzfernsprecher), vétustes, avec un
  réseau téléphonique très sous-développé (attente de plusieurs années pour
  une ligne fixe personnelle).
- Les cartes téléphoniques n'arrivent en ex-RDA qu'au moment de la réunification
  (1990), en même temps que la conversion des cabines au Deutsche Mark.
- Le courrier entre les deux Allemagnes était autorisé mais censuré et ouvert
  par la Stasi. Les colis de l'Ouest vers l'Est étaient fréquents (café,
  chocolat, vêtements) mais contrôlés à la douane.
- Ostpolitik (années 1970, Willy Brandt) : assouplissement progressif des
  visites Ouest → Est ; les Est-Allemands ne pouvaient voyager à l'Ouest que
  dans des cas très restreints.

### Conséquence pour le jeu

Comme la RDA n'a pas de cartes téléphoniques avant 1990, les contacts
est-allemands du joueur **ne peuvent pas eux-mêmes être des collectionneurs**.
Leur intérêt pour ces cartes est donc déjà suspect en soi aux yeux de la
Stasi — c'est un levier narratif et mécanique fort : posséder ou échanger une
carte à l'Est n'est jamais anodin.

---

## Comment montrer le contraste RFA / RDA

Le contraste doit être présent à **trois niveaux** : visuel, mécanique,
narratif.

### 1. Contraste visuel (UI/Art direction)

| | RFA | RDA |
|---|---|---|
| Palette | Couleurs vives, saturées, propres | Palette désaturée, grise, tons ternes |
| UI | Interface moderne, fluide, animations soignées | Interface plus rigide, "administrative", formulaires austères |
| Typographie | Police claire, occidentale, publicitaire | Police plus dure, bureaucratique (type machine à écrire est-allemande) |
| Cartes | Design riche, brillant, séries thématiques (CeBIT, expositions) | Pas de cartes officielles — les objets échangés sont improvisés, bricolés |
| Ambiance sonore | Radio/pop occidentale en fond dans les scènes RFA | Silence, grésillement radio, ambiance feutrée dans les scènes RDA |

Suggestion concrète : deux "skins" d'interface distincts selon le contexte de
la scène (écran de collection RFA vs écran d'échange clandestin RDA), avec une
transition marquée (fondu, changement de palette CSS via variables) quand on
bascule de l'un à l'autre.

### 2. Contraste mécanique (gameplay)

- **Côté RFA (boucle TCG)** : abondance. Le joueur achète, échange, négocie
  librement, dans un marché ouvert avec beaucoup de choix, de rareté "positive"
  (cartes promo désirables), pas de risque.
- **Côté RDA (boucle inspection/clandestine)** : pénurie et risque. Peu
  d'objets disponibles, chaque échange est risqué, les ressources (temps,
  matériel de camouflage, contacts de confiance) sont rares. Une jauge de
  suspicion pénalise chaque interaction.
- Un même geste (donner une carte) n'a pas le même poids : anodin à l'Ouest,
  potentiellement dangereux à l'Est. Le jeu doit faire ressentir cette
  asymétrie via des retours différents (feedback visuel/sonore léger et
  positif à l'Ouest, tendu et lourd à l'Est).

### 3. Contraste narratif

- Dialogues et lettres des contacts RDA évoquant la pénurie, l'attente, la
  surveillance, en creux (jamais de discours plaqué, plutôt des détails
  concrets : "j'ai attendu 3 ans pour une ligne de téléphone").
- Contacts RFA plus insouciants, parfois inconscients du danger réel encouru
  par leurs correspondants à l'Est.
- Le joueur, en tant que collectionneur RFA, découvre progressivement
  l'ampleur du risque pris par ses contacts est-allemands — arc de prise de
  conscience.

---

## Système de messages cachés (indices en couches progressives)

**Couche 1 — Évidente (tutoriel)**
Une lettre ou un symbole clairement visible dans le design de la carte
(numéro de série modifié, petit symbole discret).

**Couche 2 — Visuelle discrète**
- Une lettre du texte imprimé légèrement d'une couleur différente
  (perceptible seulement en comparant à un exemplaire "propre" de référence).
- Une micro-encoche sur le bord de la carte (position = lettre selon un
  tableau de correspondance).
- Nécessite de posséder plusieurs exemplaires de la même carte → sert aussi
  la mécanique de collection (doublons).

**Couche 3 — Structurelle (mid-game)**
Message réparti sur plusieurs cartes d'une même série (ex: 5 cartes,
chacune une lettre cachée), à assembler dans le bon ordre (numéro de
catalogue). Des cartes "leurres" peuvent être glissées dans un lot pour
brouiller les pistes.

**Couche 4 — Métajeu (late game)**
Chiffrement variable selon la date d'émission de la carte, ou selon un
"livre-code" (référence à un catalogue de collectionneur, type catalogue
Michel) obtenu plus tôt dans le jeu. Risque de déchiffrer un faux message
(mauvaise clé) avec conséquences narratives.

---

## Structure de gameplay : deux boucles imbriquées

### Boucle 1 — TCG ("le jour", façade RFA)
- Achat, échange, catalogue, négociation avec d'autres collectionneurs.
- Système de rareté (commune / rare / promo — séries thématiques réelles :
  CeBIT, expositions Bundespost, etc.).
- Certaines transactions sont anodines, d'autres sont des couvertures pour un
  échange d'information.

### Boucle 2 — Inspection/tension ("la nuit", sous contrôle)
- À intervalles réguliers (contrôle postal, salon d'échange, passage de
  douane), le joueur doit auto-inspecter sa collection : repérer et
  cacher/détruire/échanger les cartes compromettantes avant un contrôle.
- Jauge de suspicion qui monte avec les prises de risque, débloquant des
  conséquences progressives (avertissement → interrogatoire → perte d'un
  contact → arrestation/game over).

### Le pont entre les deux : la table d'échange
Scène récurrente (salon de collectionneurs, café, correspondance postale) où :
1. Négociation ouverte de cartes (TCG).
2. Décision secrète simultanée : quelles cartes portent un message à
   transmettre, sous l'œil d'un interlocuteur potentiellement allié ou indic.
3. Double lecture de chaque choix : gameplay TCG (bonne affaire ou non) +
   gameplay espionnage (risque pris ou non).

### Structure narrative en actes
- **Acte 1** : pur TCG, apprentissage, aucun enjeu politique — attachement au
  hobby.
- **Acte 2** : introduction progressive des messages cachés, premiers contacts
  à l'Est, apparition de la jauge de suspicion.
- **Acte 3** : fusion complète des deux boucles, dilemmes (une carte rare
  convoitée par un autre collectionneur est justement celle qui contient le
  message vital).
- **Épilogue (1989-1990)** : chute du Mur — échanges soudain possibles
  ouvertement, mais certains contacts ont disparu, d'autres se révèlent avoir
  été des agents doubles.

---

## Stack technique recommandée

Décision : **pas de Three.js / 3D**. Le jeu repose sur la précision 2D
(zoom, nuances de couleur, détails fins), le 3D n'apporterait rien à la
mécanique et complexifierait inutilement le projet.

### Frontend
- **React + Vite** (cohérent avec le stack déjà connu côté nova-gui).
- **Zustand** (ou Context API) pour l'état global : collection, jauge de
  suspicion, progression narrative. Pas besoin de Redux pour ce scope.
- **Framer Motion** pour les animations (retournement de carte, transitions
  d'écran, feedback du minijeu d'inspection).
- **XState** (optionnel) pour structurer le minijeu d'inspection comme une
  machine à états (file d'attente → décision → feedback → carte suivante).

### Rendu des cartes et indices
- Cartes en `<img>` avec calques CSS superposés pour les indices :
  - `mix-blend-mode` / `filter` pour la lettre légèrement colorée.
  - Pseudo-élément positionné en absolu pour l'encoche.
- Composant `<CardInspector>` : effet loupe via `transform: scale()` +
  `transform-origin` suivant la position du curseur (`onMouseMove`).

### Persistance
- v1 : `localStorage`.
- Si la collection grossit (beaucoup d'assets/métadonnées) : IndexedDB via
  `idb`.

### Déploiement
- Build Vite statique, hébergement Vercel/Netlify/GitHub Pages. Aucun backend
  nécessaire pour une v1 solo.

---

## Arborescence de composants suggérée (React)

```
src/
  state/
    collectionStore.ts       # cartes possédées, doublons, catalogue
    suspicionStore.ts        # jauge de suspicion, seuils, events
    progressionStore.ts      # acte narratif courant, contacts débloqués
  data/
    cards.ts                 # définitions des cartes (RFA + objets RDA)
    messages.ts               # définitions des messages cachés / indices / séries
  components/
    rfa/
      CollectionGrid.tsx      # boucle TCG — grille de collection
      TradeScreen.tsx          # écran d'échange/négociation
    rda/
      InspectionQueue.tsx      # minijeu d'inspection façon Papers, Please
      CardInspector.tsx        # effet loupe / zoom
      SuspicionMeter.tsx       # jauge de suspicion (UI)
    shared/
      CardView.tsx             # rendu d'une carte (utilisé des deux côtés)
      DialogueBox.tsx          # dialogues/narration
  styles/
    theme-rfa.css              # palette vive, UI moderne
    theme-rda.css              # palette désaturée, UI austère
```

---

## Prochaines étapes suggérées (ordre de développement)

1. Prototype de la boucle TCG seule (collection, affichage, échange) —
   valider le feeling et le thème visuel RFA.
2. Ajout de la couche d'indices niveau 1-2 (indice visible, puis discret).
3. Prototype isolé du minijeu d'inspection (`InspectionQueue` +
   `CardInspector`), avec le thème visuel RDA distinct.
4. Fusion des deux boucles + jauge de suspicion.
5. Contenu narratif complet, structuration en actes, épilogue 1989-1990.
