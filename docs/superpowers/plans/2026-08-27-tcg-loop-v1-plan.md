# Telefonkarte TCG Loop V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone RFA collection loop (Acte 1 of `GAME_DESIGN.md`) as a working, testable React app: open packs with virtual coins, collect cards from the 20 assets in `public/`, browse the owned collection — nothing else.

**Architecture:** Single-page Vite + React + TypeScript app, no router (two local-state tabs). A Zustand store (`collectionStore`) owns all game state (coins, owned cards) and persists it to `localStorage` by hand (try/catch, no middleware) so corrupted/missing storage degrades to the initial state instead of crashing. Card data is a static array generated from the 20 numbered image files. Framer Motion drives the single pack-opening flip animation.

**Tech Stack:** React 18, TypeScript, Vite 5, Zustand 4, Framer Motion 11, Vitest 2 (jsdom environment) for store unit tests.

**Spec:** `docs/superpowers/specs/2026-08-26-tcg-loop-v1-design.md`

## Global Constraints

- No router — navigation is local component state between exactly 2 views (Collection / Boutique). (spec: Écrans → Navigation)
- No RDA loop, no suspicion gauge, no hidden-message layers, no trade/negotiation screen, no rarity tiers — all 20 cards are equivalent. (spec: Contexte)
- `RDA_portrait.png` / `RFA_portrait.png` are NOT used anywhere in this plan. (spec: Contexte)
- Starting coins: exactly 100, fixed, no recurring income. (spec: Data model)
- Pack price: exactly 20 coins. (spec: Data model)
- Card draw: uniform random across all 20 cards, no weighting. (spec: Data model)
- Duplicate cards only increment a counter — no conversion, no extra mechanic. (spec: Data model)
- `CollectionGrid` shows **only owned cards** — no locked/greyed slots for unowned cards. (spec: Écrans → CollectionGrid)
- `openPack()` must no-op (no debit, no draw) when `coins < 20`, as a store-level guard independent of the UI's disabled button. (spec: Error handling)
- `localStorage` read failures (missing/corrupt/unparseable) must fall back to `{ coins: 100, owned: {} }` without throwing. (spec: Error handling)
- No e2e tests in V1. UI components are verified manually via `npm run dev`; only `collectionStore` gets automated unit tests. (spec: Testing)
- Persistence key: `telefonkarte-collection`. (spec: Data model)

---

### Task 1: Project scaffold (Vite + React + TS + Vitest)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: a runnable Vite dev server (`npm run dev`), a working build (`npm run build`), and a working test runner (`npm run test`) that later tasks add real tests to.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "telefonkarte",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "framer-motion": "^11.11.17",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Telefonkarte</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 7: Write placeholder `src/App.tsx`**

```tsx
export default function App() {
  return <div>Telefonkarte</div>;
}
```

- [ ] **Step 8: Write `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`
Expected: completes without error, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 10: Verify build and test runner work**

Run: `npm run build`
Expected: succeeds, produces `dist/`.

Run: `npm run test`
Expected: `vitest run` reports "No test files found" (or 0 tests) with exit code 0 — this is expected, no tests exist yet.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.tsx src/App.tsx .gitignore
git commit -m "chore: scaffold Vite + React + TS + Vitest project"
```

---

### Task 2: Card data (`data/cards.ts`)

**Files:**
- Create: `src/data/cards.ts`
- Test: `src/data/cards.test.ts`

**Interfaces:**
- Consumes: the 20 files `public/1.jpeg` … `public/20.jpeg` (already present, not modified by this task).
- Produces: `interface CardDef { id: string; image: string; name: string }` and `const CARDS: CardDef[]` (20 entries, ids `"1"`..`"20"` in numeric order) — consumed by `collectionStore` (Task 3) and all UI components (Tasks 4-7).

- [ ] **Step 1: Write the failing test**

```ts
// src/data/cards.test.ts
import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";

describe("CARDS", () => {
  it("has exactly 20 entries", () => {
    expect(CARDS).toHaveLength(20);
  });

  it("has ids '1' through '20' in order", () => {
    expect(CARDS.map((c) => c.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1)),
    );
  });

  it("maps each id to its image path and a placeholder name", () => {
    expect(CARDS[0]).toEqual({ id: "1", image: "/1.jpeg", name: "Carte n°1" });
    expect(CARDS[19]).toEqual({
      id: "20",
      image: "/20.jpeg",
      name: "Carte n°20",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/cards.test.ts`
Expected: FAIL — `Failed to resolve import "./cards"` (file doesn't exist yet).

- [ ] **Step 3: Write `src/data/cards.ts`**

```ts
export interface CardDef {
  id: string;
  image: string;
  name: string;
}

const CARD_COUNT = 20;

export const CARDS: CardDef[] = Array.from(
  { length: CARD_COUNT },
  (_, i) => {
    const id = String(i + 1);
    return { id, image: `/${id}.jpeg`, name: `Carte n°${id}` };
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/cards.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/cards.ts src/data/cards.test.ts
git commit -m "feat: add static card data for the 20 collection cards"
```

---

### Task 3: `collectionStore` (Zustand state + manual localStorage persistence)

**Files:**
- Create: `src/state/collectionStore.ts`
- Test: `src/state/collectionStore.test.ts`

**Interfaces:**
- Consumes: `CARDS: CardDef[]` from `src/data/cards.ts` (Task 2).
- Produces:
  - `createCollectionStore(): UseBoundStore<StoreApi<CollectionState>>` — factory, used directly by tests to get isolated instances.
  - `useCollectionStore` — the singleton instance, consumed by `ShopScreen` (Task 6), `PackOpening` (Task 7), and `CollectionGrid` (Task 5).
  - `interface CollectionState { coins: number; owned: Record<string, number>; openPack: () => CardDef | null }`
  - `PACK_PRICE = 20` (exported for `ShopScreen`'s disabled-button check).

- [ ] **Step 1: Write the failing tests**

```ts
// src/state/collectionStore.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCollectionStore, PACK_PRICE } from "./collectionStore";
import { CARDS } from "../data/cards";

const STORAGE_KEY = "telefonkarte-collection";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("collectionStore", () => {
  it("starts with 100 coins and no owned cards", () => {
    const store = createCollectionStore();
    expect(store.getState().coins).toBe(100);
    expect(store.getState().owned).toEqual({});
  });

  it("openPack debits PACK_PRICE and adds the drawn card", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // picks CARDS[0]
    const store = createCollectionStore();

    const drawn = store.getState().openPack();

    expect(PACK_PRICE).toBe(20);
    expect(drawn).toEqual(CARDS[0]);
    expect(store.getState().coins).toBe(80);
    expect(store.getState().owned).toEqual({ [CARDS[0].id]: 1 });
  });

  it("openPack on a duplicate increments the existing counter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // always CARDS[0]
    const store = createCollectionStore();

    store.getState().openPack();
    store.getState().openPack();

    expect(store.getState().owned).toEqual({ [CARDS[0].id]: 2 });
    expect(store.getState().coins).toBe(60);
  });

  it("openPack refuses to draw when coins < PACK_PRICE", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const store = createCollectionStore();
    store.setState({ coins: 10 });

    const drawn = store.getState().openPack();

    expect(drawn).toBeNull();
    expect(store.getState().coins).toBe(10);
    expect(store.getState().owned).toEqual({});
  });

  it("persists state to localStorage after openPack", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const store = createCollectionStore();

    store.getState().openPack();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({
      coins: 80,
      owned: { [CARDS[0].id]: 1 },
    });
  });

  it("rehydrates state from localStorage on creation", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ coins: 42, owned: { "3": 2 } }),
    );

    const store = createCollectionStore();

    expect(store.getState().coins).toBe(42);
    expect(store.getState().owned).toEqual({ "3": 2 });
  });

  it("falls back to initial state when localStorage holds invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{{");

    const store = createCollectionStore();

    expect(store.getState().coins).toBe(100);
    expect(store.getState().owned).toEqual({});
  });

  it("falls back to initial state when localStorage holds a wrong shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    const store = createCollectionStore();

    expect(store.getState().coins).toBe(100);
    expect(store.getState().owned).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: FAIL — `Failed to resolve import "./collectionStore"` (file doesn't exist yet).

- [ ] **Step 3: Write `src/state/collectionStore.ts`**

```ts
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { CARDS, type CardDef } from "../data/cards";

const STORAGE_KEY = "telefonkarte-collection";
export const PACK_PRICE = 20;
const STARTING_COINS = 100;

interface PersistedState {
  coins: number;
  owned: Record<string, number>;
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.coins === "number" && typeof v.owned === "object" && v.owned !== null;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { coins: STARTING_COINS, owned: {} };
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return { coins: STARTING_COINS, owned: {} };
    return { coins: parsed.coins, owned: parsed.owned };
  } catch {
    return { coins: STARTING_COINS, owned: {} };
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — in-memory state still works.
  }
}

export interface CollectionState extends PersistedState {
  openPack: () => CardDef | null;
}

export function createCollectionStore(): UseBoundStore<StoreApi<CollectionState>> {
  return create<CollectionState>((set, get) => ({
    ...loadInitialState(),
    openPack: () => {
      const { coins, owned } = get();
      if (coins < PACK_PRICE) return null;

      const card = CARDS[Math.floor(Math.random() * CARDS.length)];
      const nextOwned = { ...owned, [card.id]: (owned[card.id] ?? 0) + 1 };
      const nextCoins = coins - PACK_PRICE;

      set({ coins: nextCoins, owned: nextOwned });
      persist({ coins: nextCoins, owned: nextOwned });
      return card;
    },
  }));
}

export const useCollectionStore = createCollectionStore();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/collectionStore.ts src/state/collectionStore.test.ts
git commit -m "feat: add collectionStore with pack draw and manual localStorage persistence"
```

---

### Task 4: `CardView` shared component

**Files:**
- Create: `src/components/shared/CardView.tsx`

**Interfaces:**
- Consumes: `CardDef` from `src/data/cards.ts` (Task 2).
- Produces: `<CardView card={CardDef} count={number}>` — used by `CollectionGrid` (Task 5) and `PackOpening` (Task 7). `count` is optional; the `×N` badge only renders when `count` is provided and `> 1`.

- [ ] **Step 1: Write `src/components/shared/CardView.tsx`**

```tsx
import type { CardDef } from "../../data/cards";

interface CardViewProps {
  card: CardDef;
  count?: number;
}

export default function CardView({ card, count }: CardViewProps) {
  return (
    <div className="card-view">
      <img src={card.image} alt={card.name} className="card-view__image" />
      {count !== undefined && count > 1 && (
        <span className="card-view__badge">×{count}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

This component has no standalone screen yet — it's verified visually as part of Task 5's manual check (`CollectionGrid` renders `CardView` instances). No isolated verification step here; proceed to Task 5 in the same session before committing, or commit now and verify visually once Task 5 lands.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/CardView.tsx
git commit -m "feat: add CardView component for rendering a single card"
```

---

### Task 5: `CollectionGrid` component

**Files:**
- Create: `src/components/rfa/CollectionGrid.tsx`

**Interfaces:**
- Consumes: `CardDef` from `src/data/cards.ts`, `CardView` from `src/components/shared/CardView.tsx` (Task 4), `useCollectionStore` from `src/state/collectionStore.ts` (Task 3) — reads `owned: Record<string, number>`.
- Produces: `<CollectionGrid />` — a self-contained screen (reads the store itself, takes no props) — used by `App.tsx` (Task 8).

- [ ] **Step 1: Write `src/components/rfa/CollectionGrid.tsx`**

```tsx
import { CARDS } from "../../data/cards";
import { useCollectionStore } from "../../state/collectionStore";
import CardView from "../shared/CardView";

export default function CollectionGrid() {
  const owned = useCollectionStore((state) => state.owned);
  const ownedCards = CARDS.filter((card) => (owned[card.id] ?? 0) > 0);

  if (ownedCards.length === 0) {
    return (
      <p className="collection-grid__empty">
        Aucune carte encore, ouvre un pack !
      </p>
    );
  }

  return (
    <div className="collection-grid">
      {ownedCards.map((card) => (
        <CardView key={card.id} card={card} count={owned[card.id]} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Temporarily render `<CollectionGrid />` in `src/App.tsx` (this wiring becomes permanent in Task 8, so just leave it in place):

```tsx
// src/App.tsx
import CollectionGrid from "./components/rfa/CollectionGrid";

export default function App() {
  return <CollectionGrid />;
}
```

Run: `npm run dev`, open the printed local URL in a browser.
Expected: page shows "Aucune carte encore, ouvre un pack !" (store starts empty). In the browser devtools console, run:
```js
localStorage.setItem("telefonkarte-collection", JSON.stringify({ coins: 100, owned: { "1": 2, "5": 1 } }));
location.reload();
```
Expected: grid now shows cards `1.jpeg` (with a `×2` badge) and `5.jpeg` (no badge, count is 1), and no other cards.

- [ ] **Step 3: Commit**

```bash
git add src/components/rfa/CollectionGrid.tsx src/App.tsx
git commit -m "feat: add CollectionGrid showing only owned cards"
```

---

### Task 6: `ShopScreen` component

**Files:**
- Create: `src/components/rfa/ShopScreen.tsx`

**Interfaces:**
- Consumes: `useCollectionStore`, `PACK_PRICE` from `src/state/collectionStore.ts` (Task 3).
- Produces: `<ShopScreen onPackOpened={(card: CardDef) => void} />` — calls `onPackOpened` with the drawn card right after a successful `openPack()`, so the parent (`App.tsx`, Task 8) can trigger the `PackOpening` reveal screen. Does nothing (no call) if `openPack()` returns `null`.

- [ ] **Step 1: Write `src/components/rfa/ShopScreen.tsx`**

```tsx
import type { CardDef } from "../../data/cards";
import { PACK_PRICE, useCollectionStore } from "../../state/collectionStore";

interface ShopScreenProps {
  onPackOpened: (card: CardDef) => void;
}

export default function ShopScreen({ onPackOpened }: ShopScreenProps) {
  const coins = useCollectionStore((state) => state.coins);
  const openPack = useCollectionStore((state) => state.openPack);

  const handleOpenPack = () => {
    const drawn = openPack();
    if (drawn) onPackOpened(drawn);
  };

  return (
    <div className="shop-screen">
      <p className="shop-screen__coins">Solde : {coins} pièces</p>
      <button
        type="button"
        onClick={handleOpenPack}
        disabled={coins < PACK_PRICE}
      >
        Ouvrir un pack ({PACK_PRICE})
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Temporarily swap `src/App.tsx` to render `ShopScreen`:

```tsx
// src/App.tsx
import ShopScreen from "./components/rfa/ShopScreen";

export default function App() {
  return <ShopScreen onPackOpened={(card) => console.log("drawn:", card)} />;
}
```

Run: `npm run dev`.
Expected: with a fresh `localStorage` (100 coins), the button reads "Ouvrir un pack (20)" and is enabled. Clicking it 5 times logs 5 drawn cards to the console and updates "Solde : X pièces" each time (100 → 80 → 60 → 40 → 20 → 0). On the 6th click the button is disabled (0 < 20) and no further log appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/rfa/ShopScreen.tsx src/App.tsx
git commit -m "feat: add ShopScreen with pack purchase button"
```

---

### Task 7: `PackOpening` component (Framer Motion reveal)

**Files:**
- Create: `src/components/rfa/PackOpening.tsx`

**Interfaces:**
- Consumes: `CardDef` from `src/data/cards.ts`, `CardView` from `src/components/shared/CardView.tsx` (Task 4), `motion` from `framer-motion`.
- Produces: `<PackOpening card={CardDef} onContinue={() => void} />` — used by `App.tsx` (Task 8) as the screen shown right after `ShopScreen`'s `onPackOpened` fires.

- [ ] **Step 1: Write `src/components/rfa/PackOpening.tsx`**

```tsx
import { motion } from "framer-motion";
import type { CardDef } from "../../data/cards";
import CardView from "../shared/CardView";

interface PackOpeningProps {
  card: CardDef;
  onContinue: () => void;
}

export default function PackOpening({ card, onContinue }: PackOpeningProps) {
  return (
    <div className="pack-opening">
      <motion.div
        className="pack-opening__reveal"
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <CardView card={card} />
      </motion.div>
      <button type="button" onClick={onContinue}>
        Continuer
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Temporarily swap `src/App.tsx`:

```tsx
// src/App.tsx
import { CARDS } from "./data/cards";
import PackOpening from "./components/rfa/PackOpening";

export default function App() {
  return (
    <PackOpening
      card={CARDS[0]}
      onContinue={() => console.log("continue clicked")}
    />
  );
}
```

Run: `npm run dev`.
Expected: on load, `1.jpeg` flips in (rotateY 180° → 0°, fade in) over ~0.6s. Clicking "Continuer" logs "continue clicked" in the console.

- [ ] **Step 3: Commit**

```bash
git add src/components/rfa/PackOpening.tsx src/App.tsx
git commit -m "feat: add PackOpening reveal animation with Framer Motion"
```

---

### Task 8: Wire `App.tsx` (navigation + full flow)

**Files:**
- Modify: `src/App.tsx` (replace the temporary single-component version from Task 7)

**Interfaces:**
- Consumes: `CollectionGrid` (Task 5), `ShopScreen` (Task 6), `PackOpening` (Task 7), `CardDef` (Task 2).
- Produces: the final `App` component — no further tasks depend on it, this is the integration point.

- [ ] **Step 1: Write the final `src/App.tsx`**

```tsx
import { useState } from "react";
import type { CardDef } from "./data/cards";
import CollectionGrid from "./components/rfa/CollectionGrid";
import ShopScreen from "./components/rfa/ShopScreen";
import PackOpening from "./components/rfa/PackOpening";

type Tab = "collection" | "shop";

export default function App() {
  const [tab, setTab] = useState<Tab>("collection");
  const [revealedCard, setRevealedCard] = useState<CardDef | null>(null);

  if (revealedCard) {
    return (
      <PackOpening
        card={revealedCard}
        onContinue={() => setRevealedCard(null)}
      />
    );
  }

  return (
    <div className="app">
      <nav className="app__tabs">
        <button
          type="button"
          onClick={() => setTab("collection")}
          disabled={tab === "collection"}
        >
          Collection
        </button>
        <button
          type="button"
          onClick={() => setTab("shop")}
          disabled={tab === "shop"}
        >
          Boutique
        </button>
      </nav>
      {tab === "collection" ? (
        <CollectionGrid />
      ) : (
        <ShopScreen onPackOpened={setRevealedCard} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification (full flow, fresh state)**

Run: in the browser devtools console, `localStorage.removeItem("telefonkarte-collection")`, then reload.
Expected end-to-end walkthrough:
1. Starts on "Collection" tab, showing the empty-state message.
2. Switch to "Boutique" — shows "Solde : 100 pièces", button enabled.
3. Click "Ouvrir un pack (20)" — `PackOpening` screen replaces the tabs, flip animation plays, a card is shown.
4. Click "Continuer" — returns to "Boutique", "Solde : 80 pièces".
5. Switch to "Collection" — the drawn card now appears in the grid.
6. Repeat opening packs until coins reach 0 — button becomes disabled at that point, no further deduction possible.
7. Reload the page — collection and coin balance are unchanged (persisted).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Collection/Boutique tabs and pack-opening flow in App"
```

---

### Task 9: RFA theme styling (`theme-rfa.css`)

**Files:**
- Create: `src/styles/theme-rfa.css`
- Modify: `src/main.tsx` (import the stylesheet)

**Interfaces:**
- Produces: global CSS classes consumed by the class names already emitted in Tasks 4-8 (`.card-view`, `.card-view__image`, `.card-view__badge`, `.collection-grid`, `.collection-grid__empty`, `.shop-screen`, `.shop-screen__coins`, `.pack-opening`, `.pack-opening__reveal`, `.app`, `.app__tabs`). No component code changes in this task — pure styling.

- [ ] **Step 1: Write `src/styles/theme-rfa.css`**

```css
:root {
  --rfa-bg: #f5f0e6;
  --rfa-accent: #d6001c;
  --rfa-accent-dark: #a30016;
  --rfa-text: #1a1a1a;
  --rfa-card-radius: 10px;
}

body {
  margin: 0;
  background: var(--rfa-bg);
  color: var(--rfa-text);
  font-family: "Segoe UI", system-ui, sans-serif;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.app__tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.app__tabs button {
  padding: 8px 20px;
  border: 2px solid var(--rfa-accent);
  border-radius: 999px;
  background: white;
  color: var(--rfa-accent);
  font-weight: 600;
  cursor: pointer;
}

.app__tabs button:disabled {
  background: var(--rfa-accent);
  color: white;
  cursor: default;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.collection-grid__empty {
  text-align: center;
  color: #666;
  margin-top: 48px;
}

.card-view {
  position: relative;
}

.card-view__image {
  width: 100%;
  border-radius: var(--rfa-card-radius);
  display: block;
}

.card-view__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: var(--rfa-accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.shop-screen {
  text-align: center;
  margin-top: 48px;
}

.shop-screen__coins {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.shop-screen button {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  background: var(--rfa-accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.shop-screen button:disabled {
  background: #bbb;
  cursor: default;
}

.pack-opening {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-top: 64px;
}

.pack-opening__reveal {
  width: 280px;
}

.pack-opening button {
  padding: 10px 28px;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  background: var(--rfa-accent-dark);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
```

- [ ] **Step 2: Import it in `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme-rfa.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, walk through the same flow as Task 8 Step 2.
Expected: tabs, grid, shop button and pack-opening screen are all styled (no unstyled black-on-white default browser look) — vivid RFA palette (cream background, red accent).

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme-rfa.css src/main.tsx
git commit -m "style: add RFA theme stylesheet"
```

---

### Task 10: Full test suite + build sanity check

**Files:** none created — verification only.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: PASS, 11 tests total (3 from `cards.test.ts` + 8 from `collectionStore.test.ts`), 0 failures.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors, produces `dist/`.

- [ ] **Step 3: Smoke-test the production build**

Run: `npm run preview`, open the printed URL.
Expected: same walkthrough as Task 8 Step 2 works against the built app, not just the dev server.

No commit for this task — it's a verification checkpoint confirming Tasks 1-9 integrate cleanly.
