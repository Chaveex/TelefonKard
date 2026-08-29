# Inspection Minigame Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, Papers-Please-style card-inspection minigame (sub-project 3 of `GAME_DESIGN.md`'s roadmap) as a third tab in the existing app — reusing the 20-card pool and sub-project 2's `ANOMALOUS_CARD_IDS` as the sole "compromising card" criterion, with a 60-second timed round, a local-only suspicion gauge, and a distinct desaturated RDA visual theme. No connection to `collectionStore`, no persistence, no narrative consequences.

**Architecture:** All new state lives in local `useState`/`useEffect` inside `InspectionQueue.tsx` — no Zustand store, no persistence (explicitly out of scope per spec). A pure, testable data module (`src/data/inspection.ts`) generates the 8-card queue and classifies cards as compromising. Two small presentational components (`CardInspector`, `SuspicionMeter`) render the per-card view and the suspicion bar. A new scoped stylesheet (`theme-rda.css`, gated under a `.rda-theme` wrapper class) provides the visual contrast with the existing RFA screens without touching `theme-rfa.css`.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest 2 (jsdom) for the one pure-logic test file — same stack as sub-projects 1 and 2, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-29-inspection-prototype-design.md`

## Global Constraints

- No connection to `collectionStore` or the player's real owned collection — the inspection queue is drawn from the full `CARDS` pool regardless of what the player owns. (spec: Contexte, Contenu inspecté)
- No persistence of any kind for this sub-project's state — reloading the page resets everything. (spec: Contexte)
- Only two actions exist: "Garder visible" and "Cacher" — no "détruire"/"échanger". (spec: Contexte)
- The suspicion gauge is local visual feedback only — no game-over, no narrative consequence, resets to 0 every new round. (spec: Contexte)
- Only indice layer 1 (`ANOMALOUS_CARD_IDS` from `src/data/messages.ts`) determines "compromising" — layers 2-4 are out of scope. (spec: Contexte)
- `RDA_portrait.png`/`RFA_portrait.png` are NOT used anywhere in this plan. (spec: Contexte)
- Queue size is exactly 8 cards; exactly 2 of them come from `ANOMALOUS_CARD_IDS`, the other 6 from the remaining 16 clean cards; no duplicate card in a queue. (spec: Données / logique pure)
- Round timer is exactly 60 seconds (`ROUND_SECONDS`), counting the whole round, not per-card. (spec: Boucle de jeu)
- Suspicion penalty is exactly `SUSPICION_PENALTY = 20` per missed compromising card, clamped to a max of 100. (spec: Boucle de jeu)
- The RDA theme is scoped under a `.rda-theme` wrapper class and must not alter `theme-rfa.css`'s existing selectors or the RFA screens' appearance. (spec: Thème visuel RDA)
- The minigame is reached via a third tab ("Inspection (proto)") in `App.tsx`, alongside the existing Collection/Boutique tabs. (spec: Accès dans l'app)
- No automated tests for UI components (`InspectionQueue`, `CardInspector`, `SuspicionMeter`) — only `src/data/inspection.ts` gets unit tests, consistent with sub-projects 1 and 2's testing strategy. (spec: Testing)

---

### Task 1: `data/inspection.ts` (pure queue-generation logic)

**Files:**
- Create: `src/data/inspection.ts`
- Test: `src/data/inspection.test.ts`

**Interfaces:**
- Consumes: `CARDS: CardDef[]` from `src/data/cards.ts`, `ANOMALOUS_CARD_IDS: readonly string[]` from `src/data/messages.ts` (both already committed, sub-projects 1 and 2).
- Produces:
  - `QUEUE_SIZE = 8`, `GUARANTEED_ANOMALOUS = 2`, `SUSPICION_PENALTY = 20`, `ROUND_SECONDS = 60` (exported constants).
  - `generateQueue(): CardDef[]` — 8-card queue, exactly 2 from `ANOMALOUS_CARD_IDS`, no duplicates, shuffled. Consumed by `InspectionQueue.tsx` (Task 4).
  - `isCompromising(cardId: string): boolean` — consumed by `InspectionQueue.tsx` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
// src/data/inspection.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CARDS } from "./cards";
import { ANOMALOUS_CARD_IDS } from "./messages";
import {
  GUARANTEED_ANOMALOUS,
  QUEUE_SIZE,
  generateQueue,
  isCompromising,
} from "./inspection";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("generateQueue", () => {
  it("returns exactly QUEUE_SIZE cards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const queue = generateQueue();
    expect(queue).toHaveLength(QUEUE_SIZE);
  });

  it("includes exactly GUARANTEED_ANOMALOUS cards from ANOMALOUS_CARD_IDS", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const queue = generateQueue();
    const anomalousInQueue = queue.filter((card) =>
      ANOMALOUS_CARD_IDS.includes(card.id),
    );
    expect(anomalousInQueue).toHaveLength(GUARANTEED_ANOMALOUS);
  });

  it("never includes a duplicate card", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const queue = generateQueue();
    const ids = queue.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only draws cards that exist in CARDS", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const queue = generateQueue();
    const validIds = new Set(CARDS.map((c) => c.id));
    for (const card of queue) {
      expect(validIds.has(card.id)).toBe(true);
    }
  });
});

describe("isCompromising", () => {
  it("returns true for every id in ANOMALOUS_CARD_IDS", () => {
    for (const id of ANOMALOUS_CARD_IDS) {
      expect(isCompromising(id)).toBe(true);
    }
  });

  it("returns false for an id not in ANOMALOUS_CARD_IDS", () => {
    const nonAnomalousId = CARDS.map((c) => c.id).find(
      (id) => !ANOMALOUS_CARD_IDS.includes(id),
    )!;
    expect(isCompromising(nonAnomalousId)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/inspection.test.ts`
Expected: FAIL — `Failed to resolve import "./inspection"` (file doesn't exist yet).

- [ ] **Step 3: Write `src/data/inspection.ts`**

```ts
import { CARDS, type CardDef } from "./cards";
import { ANOMALOUS_CARD_IDS } from "./messages";

export const QUEUE_SIZE = 8;
export const GUARANTEED_ANOMALOUS = 2;
export const SUSPICION_PENALTY = 20;
export const ROUND_SECONDS = 60;

function pickRandom<T>(pool: T[], count: number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * remaining.length);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return picked;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQueue(): CardDef[] {
  const anomalousPool = CARDS.filter((card) =>
    ANOMALOUS_CARD_IDS.includes(card.id),
  );
  const cleanPool = CARDS.filter(
    (card) => !ANOMALOUS_CARD_IDS.includes(card.id),
  );

  const anomalous = pickRandom(anomalousPool, GUARANTEED_ANOMALOUS);
  const clean = pickRandom(cleanPool, QUEUE_SIZE - GUARANTEED_ANOMALOUS);

  return shuffle([...anomalous, ...clean]);
}

export function isCompromising(cardId: string): boolean {
  return ANOMALOUS_CARD_IDS.includes(cardId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/inspection.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/inspection.ts src/data/inspection.test.ts
git commit -m "feat: add inspection queue generation logic"
```

---

### Task 2: `SuspicionMeter` component

**Files:**
- Create: `src/components/rda/SuspicionMeter.tsx`

**Interfaces:**
- Produces: `<SuspicionMeter value={number} />` — clamps `value` to `[0, 100]` internally. Consumed by `InspectionQueue.tsx` (Task 4).

- [ ] **Step 1: Write `src/components/rda/SuspicionMeter.tsx`**

```tsx
interface SuspicionMeterProps {
  value: number;
}

export default function SuspicionMeter({ value }: SuspicionMeterProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="suspicion-meter">
      <div className="suspicion-meter__label">Suspicion : {clamped}%</div>
      <div className="suspicion-meter__track">
        <div
          className="suspicion-meter__fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verification**

Run: `npx tsc --noEmit` — confirm no type errors. No standalone visual check yet — this component is verified as part of Task 4's manual trace (it has no store/prop dependency to test in isolation beyond the type-check).

- [ ] **Step 3: Commit**

```bash
git add src/components/rda/SuspicionMeter.tsx
git commit -m "feat: add SuspicionMeter component"
```

---

### Task 3: `CardInspector` component

**Files:**
- Create: `src/components/rda/CardInspector.tsx`

**Interfaces:**
- Consumes: `CardDef` from `src/data/cards.ts`, `getSerialNumber` from `src/data/messages.ts` (sub-project 2, already committed).
- Produces: `<CardInspector card={CardDef} />` — consumed by `InspectionQueue.tsx` (Task 4). Does NOT reuse `CardView` (shared, sub-project 1) — different visual behavior (hover-zoom vs duplicate badge), separate component per spec.

- [ ] **Step 1: Write `src/components/rda/CardInspector.tsx`**

```tsx
import { useState, type MouseEvent } from "react";
import type { CardDef } from "../../data/cards";
import { getSerialNumber } from "../../data/messages";

interface CardInspectorProps {
  card: CardDef;
}

export default function CardInspector({ card }: CardInspectorProps) {
  const [origin, setOrigin] = useState("50% 50%");

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="card-inspector">
      <div
        className="card-inspector__zoom"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setOrigin("50% 50%")}
      >
        <img
          src={card.image}
          alt={card.name}
          className="card-inspector__image"
          style={{ transformOrigin: origin }}
        />
      </div>
      <p className="card-inspector__serial">{getSerialNumber(card.id)}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verification**

Run: `npx tsc --noEmit` — confirm no type errors. Manual visual check of the hover-zoom effect is deferred to Task 4/7 (needs the full queue context to be meaningfully exercised).

- [ ] **Step 3: Commit**

```bash
git add src/components/rda/CardInspector.tsx
git commit -m "feat: add CardInspector component with hover-zoom effect"
```

---

### Task 4: `InspectionQueue` component (orchestration)

**Files:**
- Create: `src/components/rda/InspectionQueue.tsx`

**Interfaces:**
- Consumes: `CardDef` (Task-independent, `src/data/cards.ts`), `GUARANTEED_ANOMALOUS`, `ROUND_SECONDS`, `SUSPICION_PENALTY`, `generateQueue`, `isCompromising` from `src/data/inspection.ts` (Task 1), `CardInspector` (Task 3), `SuspicionMeter` (Task 2).
- Produces: `<InspectionQueue />` — self-contained, no props. Consumed by `App.tsx` (Task 6).

- [ ] **Step 1: Write `src/components/rda/InspectionQueue.tsx`**

```tsx
import { useEffect, useState } from "react";
import type { CardDef } from "../../data/cards";
import {
  GUARANTEED_ANOMALOUS,
  ROUND_SECONDS,
  SUSPICION_PENALTY,
  generateQueue,
  isCompromising,
} from "../../data/inspection";
import CardInspector from "./CardInspector";
import SuspicionMeter from "./SuspicionMeter";

export default function InspectionQueue() {
  const [queue, setQueue] = useState<CardDef[]>(() => generateQueue());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suspicion, setSuspicion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [missedAnomalies, setMissedAnomalies] = useState(0);
  const [roundOver, setRoundOver] = useState(false);

  useEffect(() => {
    if (roundOver) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRoundOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roundOver]);

  const startNewRound = () => {
    setQueue(generateQueue());
    setCurrentIndex(0);
    setSuspicion(0);
    setSecondsLeft(ROUND_SECONDS);
    setMissedAnomalies(0);
    setRoundOver(false);
  };

  const handleDecision = (keepVisible: boolean) => {
    const card = queue[currentIndex];
    if (keepVisible && isCompromising(card.id)) {
      setSuspicion((prev) => Math.min(100, prev + SUSPICION_PENALTY));
      setMissedAnomalies((prev) => prev + 1);
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setRoundOver(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (roundOver) {
    return (
      <div className="rda-theme inspection-queue">
        <p className="inspection-queue__summary">
          Contrôle terminé. Suspicion finale : {suspicion}%.
          <br />
          Cartes compromettantes ratées : {missedAnomalies}/
          {GUARANTEED_ANOMALOUS}.
        </p>
        <button type="button" onClick={startNewRound}>
          Nouvelle manche
        </button>
      </div>
    );
  }

  const currentCard = queue[currentIndex];

  return (
    <div className="rda-theme inspection-queue">
      <p className="inspection-queue__timer">
        Temps restant : {secondsLeft}s
      </p>
      <SuspicionMeter value={suspicion} />
      <CardInspector card={currentCard} />
      <div className="inspection-queue__actions">
        <button type="button" onClick={() => handleDecision(true)}>
          Garder visible
        </button>
        <button type="button" onClick={() => handleDecision(false)}>
          Cacher
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

You do not have access to an interactive browser. Substitute this verification:
1. Run `npx tsc --noEmit` — confirm no type errors.
2. Run `npm run build` — confirm it succeeds.
3. Read back the code and manually trace: with `queue` containing 8 cards where 2 have `isCompromising(id) === true`, does clicking "Garder visible" on a compromising card increment `suspicion` by exactly `SUSPICION_PENALTY` (20) and `missedAnomalies` by 1? Does clicking either button on a non-compromising card change neither? Does `currentIndex` advance by exactly 1 per decision, and does `roundOver` become `true` exactly when `currentIndex + 1 >= queue.length` (i.e., after the 8th decision)? Does the `useEffect` cleanup (`clearInterval`) run when `roundOver` becomes `true` (dependency array `[roundOver]` re-runs the effect, and the previous effect's cleanup fires before the new one, canceling the old interval)? Note this trace in your report.
4. Do NOT attempt to start `npm run dev` — full interactive verification (including the timer counting down for real, and the hover-zoom effect) happens later in this plan (Task 7), covered by a browser-equipped session.

- [ ] **Step 3: Commit**

```bash
git add src/components/rda/InspectionQueue.tsx
git commit -m "feat: add InspectionQueue orchestration component"
```

---

### Task 5: RDA theme styling (`theme-rda.css`)

**Files:**
- Create: `src/styles/theme-rda.css`
- Modify: `src/main.tsx` (import the stylesheet)

**Interfaces:**
- Produces: global CSS classes consumed by the class names already emitted in Tasks 2-4 (`.rda-theme`, `.inspection-queue`, `.inspection-queue__timer`, `.inspection-queue__summary`, `.inspection-queue__actions`, `.card-inspector`, `.card-inspector__zoom`, `.card-inspector__image`, `.card-inspector__serial`, `.suspicion-meter`, `.suspicion-meter__label`, `.suspicion-meter__track`, `.suspicion-meter__fill`). No component code changes in this task — pure styling. Must NOT modify `theme-rfa.css` or any of its selectors.

- [ ] **Step 1: Write `src/styles/theme-rda.css`**

```css
.rda-theme {
  --rda-bg: #2b2b28;
  --rda-panel: #3a3a36;
  --rda-text: #d8d4c8;
  --rda-accent: #8a1f1f;
  --rda-border: #5a5a54;
  font-family: "Courier New", monospace;
  background: var(--rda-bg);
  color: var(--rda-text);
  padding: 24px;
  border-radius: 4px;
}

.inspection-queue {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.inspection-queue__timer {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin: 0;
}

.inspection-queue__summary {
  text-align: center;
  line-height: 1.6;
}

.inspection-queue__actions {
  display: flex;
  gap: 12px;
}

.inspection-queue button {
  padding: 10px 20px;
  font-family: inherit;
  font-weight: 700;
  background: var(--rda-panel);
  color: var(--rda-text);
  border: 1px solid var(--rda-border);
  border-radius: 2px;
  cursor: pointer;
}

.inspection-queue button:hover {
  border-color: var(--rda-accent);
}

.card-inspector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.card-inspector__zoom {
  width: 240px;
  height: 160px;
  overflow: hidden;
  border: 1px solid var(--rda-border);
}

.card-inspector__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.1s ease-out;
}

.card-inspector__zoom:hover .card-inspector__image {
  transform: scale(2);
}

.card-inspector__serial {
  font-family: "Courier New", monospace;
  letter-spacing: 0.05em;
  color: var(--rda-text);
  margin: 0;
}

.suspicion-meter {
  width: 240px;
}

.suspicion-meter__label {
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.suspicion-meter__track {
  width: 100%;
  height: 10px;
  background: var(--rda-panel);
  border: 1px solid var(--rda-border);
  border-radius: 2px;
  overflow: hidden;
}

.suspicion-meter__fill {
  height: 100%;
  background: var(--rda-accent);
  transition: width 0.2s ease-out;
}
```

- [ ] **Step 2: Import it in `src/main.tsx`**

Read the current file first — it already imports `./styles/theme-rfa.css` (from sub-project 1). Add the new import alongside it:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme-rfa.css";
import "./styles/theme-rda.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Verification**

Run: `npx tsc --noEmit` and `npm run build` — confirm both succeed. Read back `theme-rda.css` and cross-check every class name against `InspectionQueue.tsx`, `CardInspector.tsx`, and `SuspicionMeter.tsx` (Tasks 2-4) — confirm no typo'd selector. Confirm `theme-rfa.css` is untouched (this task only adds a new import line to `main.tsx`, doesn't modify the RFA stylesheet).

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme-rda.css src/main.tsx
git commit -m "style: add RDA theme stylesheet for the inspection prototype"
```

---

### Task 6: Wire the third tab into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `InspectionQueue` (Task 4).
- Produces: the final `App` component with 3 tabs — no further tasks depend on it.

- [ ] **Step 1: Write the updated `src/App.tsx`**

```tsx
import { useState } from "react";
import type { CardDef } from "./data/cards";
import CollectionGrid from "./components/rfa/CollectionGrid";
import ShopScreen from "./components/rfa/ShopScreen";
import PackOpening from "./components/rfa/PackOpening";
import InspectionQueue from "./components/rda/InspectionQueue";

type Tab = "collection" | "shop" | "inspection";

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
        <button
          type="button"
          onClick={() => setTab("inspection")}
          disabled={tab === "inspection"}
        >
          Inspection (proto)
        </button>
      </nav>
      {tab === "collection" && <CollectionGrid />}
      {tab === "shop" && <ShopScreen onPackOpened={setRevealedCard} />}
      {tab === "inspection" && <InspectionQueue />}
    </div>
  );
}
```

Note: this replaces the previous `{tab === "collection" ? (...) : (...)}` ternary (which only handled 2 tabs) with three `&&` conditionals (needed for a 3-way branch). This is a deliberate, minimal structural change — not a rewrite of unrelated logic.

- [ ] **Step 2: Manual verification**

Substitute for interactive browser access:
1. Run `npx tsc --noEmit` and `npm run build` — confirm both succeed.
2. Run `npm run test` — confirm the full existing suite (cards, collectionStore, messages, inspection — should now total 21 tests: 3 + 8 + 4 + 6) still passes unmodified.
3. Read back the code and manually trace: does clicking the "Inspection (proto)" tab render `<InspectionQueue />` and disable itself, while the other two tabs re-enable? Do the existing Collection/Boutique tabs and the `PackOpening` full-screen override still behave exactly as before (this task must not change their logic, only add a third branch)?
4. Do NOT attempt to start `npm run dev` — the full interactive walkthrough happens in Task 7, covered by a browser-equipped session.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Inspection tab wiring InspectionQueue into App"
```

---

### Task 7: Full test suite + build sanity check

**Files:** none created — verification only.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: PASS, 21 tests total (3 `cards.test.ts` + 8 `collectionStore.test.ts` + 4 `messages.test.ts` + 6 `inspection.test.ts`), 0 failures.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors, produces `dist/`. Confirm via `git status --short` that no stray generated files land in the repo root (the sub-project 1 `tsconfig.node.json` `outDir` fix should already prevent this — this step just re-confirms it still holds).

- [ ] **Step 3: Smoke-test the production build**

Run: `npm run preview`, open the printed URL (or drive it headlessly if no interactive browser is available in this environment — Playwright was already used for this purpose in sub-project 1's final verification).
Expected walkthrough:
1. Land on Collection tab (unchanged from before).
2. Click "Inspection (proto)" — RDA-themed screen appears (desaturated palette, monospace font), clearly visually distinct from the RFA tabs.
3. Timer counts down from 60s.
4. Hovering the card image in `CardInspector` shows a zoom effect following the cursor.
5. The serial number is visible below the card image.
6. Clicking "Garder visible" on a card whose serial visibly breaks the `DBP-XXX-83` pattern (an anomalous card) increases the suspicion bar; clicking either button on a normal-looking card does not.
7. After 8 decisions (or the timer reaching 0), the round-over summary appears with the final suspicion percentage and missed-anomaly count, plus a "Nouvelle manche" button that starts a fresh round.
8. Switching back to Collection/Boutique tabs still works exactly as in sub-projects 1-2, unaffected by this addition.

No commit for this task — it's a verification checkpoint confirming Tasks 1-6 integrate cleanly.
