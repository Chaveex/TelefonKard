# Fusion Inspection (Sub-project 4a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the inspection minigame (sub-project 3) to the player's real owned collection (sub-project 1), make the suspicion gauge persistent instead of resetting every round, and add a "Détruire" action that actually removes a card from the collection — with no narrative consequences, no "échanger" action, and no contacts system (all deferred).

**Architecture:** `generateQueue()` changes signature to take the player's real `owned` map and draw only from cards actually possessed, shrinking gracefully down to an empty queue. A new Zustand store (`suspicionStore`, same factory+singleton+manual-localStorage pattern as `collectionStore`) replaces `InspectionQueue`'s local suspicion state. `collectionStore` gains a `destroyCard` action. `CollectionGrid` (sub-project 2) is updated to reuse `inspection.ts`'s `isCompromising()` instead of its own inline anomaly check, per the sub-project 3 final review's recommendation.

**Tech Stack:** React 18, TypeScript, Vite 5, Zustand 4, Vitest 2 — identical stack, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-29-fusion-inspection-design.md`

## Global Constraints

- `generateQueue(owned: Record<string, number>)` draws only from cards where `owned[id] > 0`; queue size is `min(QUEUE_SIZE, ownedCards.length)`; anomalous count in the queue is `min(GUARANTEED_ANOMALOUS, anomalies owned, queue size)`; if the player owns no clean cards, the remainder is filled from leftover owned anomalous cards rather than shrinking the queue further; 0 owned cards → empty queue `[]`; no duplicate card ever appears in the queue. (spec: Fusion de la source de données)
- `suspicionStore` persists to `localStorage` under key `telefonkarte-suspicion`, same manual try/catch pattern as `collectionStore` (no Zustand persist middleware), `addSuspicion(amount)` clamps the result to `[0, 100]`. Suspicion no longer resets on "Nouvelle manche" or page reload. (spec: Jauge de suspicion persistante)
- `destroyCard(cardId)` on `collectionStore`: decrements `owned[cardId]` by 1 if `> 1`; deletes the key entirely if it would reach 0; no-op (no mutation, no exception) if the card isn't owned; persists after mutation. (spec: Action "Détruire")
- `InspectionQueue` has exactly 3 actions: "Garder visible", "Cacher", "Détruire" (new). Only "Garder visible" on a compromising card applies the existing `SUSPICION_PENALTY` (20, via `useSuspicionStore`'s `addSuspicion`) — no other action/card combination changes suspicion. (spec: Action "Détruire")
- If `generateQueue(owned)` returns an empty array, `InspectionQueue` shows "Rien à inspecter, ouvre d'abord des packs !" with no timer running — a state distinct from the normal round-over summary. (spec: Fusion de la file vide)
- The round-over summary's "cartes compromettantes ratées : X/Y" denominator is the actual count of anomalous cards in that round's generated queue, not the fixed `GUARANTEED_ANOMALOUS` constant. (spec: Récap de fin de manche)
- `CollectionGrid.tsx` uses `isCompromising()` imported from `src/data/inspection.ts` instead of its own inline `ANOMALOUS_CARD_IDS.includes(...)` check. (spec: Petite dette technique adressée en passant)
- No "échanger" action, no narrative consequences (warning/interrogation/contact loss/arrest), no "contact" concept, no trade/negotiation screen — all explicitly out of scope. (spec: Contexte)
- No automated tests for UI components (`InspectionQueue`, `CollectionGrid`) — only the store/data modules (`suspicionStore`, `collectionStore`, `inspection`) get unit tests, consistent with every prior sub-project's testing strategy. (spec: Testing)

---

### Task 1: `suspicionStore` (new persistent Zustand store)

**Files:**
- Create: `src/state/suspicionStore.ts`
- Test: `src/state/suspicionStore.test.ts`

**Interfaces:**
- Produces:
  - `createSuspicionStore(): UseBoundStore<StoreApi<SuspicionState>>` — factory, used by tests for isolated instances.
  - `useSuspicionStore` — the singleton instance, consumed by `InspectionQueue.tsx` (Task 4).
  - `interface SuspicionState { suspicion: number; addSuspicion: (amount: number) => void }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/state/suspicionStore.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { createSuspicionStore } from "./suspicionStore";

const STORAGE_KEY = "telefonkarte-suspicion";

beforeEach(() => {
  localStorage.clear();
});

describe("suspicionStore", () => {
  it("starts with 0 suspicion", () => {
    const store = createSuspicionStore();
    expect(store.getState().suspicion).toBe(0);
  });

  it("addSuspicion increments the value", () => {
    const store = createSuspicionStore();
    store.getState().addSuspicion(20);
    expect(store.getState().suspicion).toBe(20);
  });

  it("addSuspicion clamps at 100", () => {
    const store = createSuspicionStore();
    store.getState().addSuspicion(90);
    store.getState().addSuspicion(90);
    expect(store.getState().suspicion).toBe(100);
  });

  it("persists to localStorage after addSuspicion", () => {
    const store = createSuspicionStore();
    store.getState().addSuspicion(20);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ suspicion: 20 });
  });

  it("rehydrates state from localStorage on creation", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ suspicion: 55 }));

    const store = createSuspicionStore();

    expect(store.getState().suspicion).toBe(55);
  });

  it("falls back to initial state when localStorage holds invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{{");

    const store = createSuspicionStore();

    expect(store.getState().suspicion).toBe(0);
  });

  it("falls back to initial state when localStorage holds a wrong shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    const store = createSuspicionStore();

    expect(store.getState().suspicion).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/suspicionStore.test.ts`
Expected: FAIL — `Failed to resolve import "./suspicionStore"` (file doesn't exist yet).

- [ ] **Step 3: Write `src/state/suspicionStore.ts`**

```ts
import { create, type StoreApi, type UseBoundStore } from "zustand";

const STORAGE_KEY = "telefonkarte-suspicion";

interface PersistedState {
  suspicion: number;
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.suspicion === "number";
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { suspicion: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return { suspicion: 0 };
    return { suspicion: parsed.suspicion };
  } catch {
    return { suspicion: 0 };
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — in-memory state still works.
  }
}

export interface SuspicionState extends PersistedState {
  addSuspicion: (amount: number) => void;
}

export function createSuspicionStore(): UseBoundStore<StoreApi<SuspicionState>> {
  return create<SuspicionState>((set, get) => ({
    ...loadInitialState(),
    addSuspicion: (amount: number) => {
      const next = Math.min(100, Math.max(0, get().suspicion + amount));
      set({ suspicion: next });
      persist({ suspicion: next });
    },
  }));
}

export const useSuspicionStore = createSuspicionStore();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/suspicionStore.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/suspicionStore.ts src/state/suspicionStore.test.ts
git commit -m "feat: add persistent suspicionStore"
```

---

### Task 2: `destroyCard` action on `collectionStore`

**Files:**
- Modify: `src/state/collectionStore.ts`
- Modify: `src/state/collectionStore.test.ts`

**Interfaces:**
- Produces: `destroyCard: (cardId: string) => void` added to `CollectionState` — consumed by `InspectionQueue.tsx` (Task 4).

- [ ] **Step 1: Write the failing tests**

Append these 4 `it(...)` blocks inside the existing `describe("collectionStore", ...)` block in `src/state/collectionStore.test.ts` (after the last existing test, before the closing `});`):

```ts
  it("destroyCard decrements a count greater than 1", () => {
    const store = createCollectionStore();
    store.setState({ owned: { "5": 3 } });

    store.getState().destroyCard("5");

    expect(store.getState().owned).toEqual({ "5": 2 });
  });

  it("destroyCard removes the key entirely when count reaches 0", () => {
    const store = createCollectionStore();
    store.setState({ owned: { "5": 1 } });

    store.getState().destroyCard("5");

    expect(store.getState().owned).toEqual({});
  });

  it("destroyCard is a no-op when the card is not owned", () => {
    const store = createCollectionStore();
    store.setState({ owned: { "5": 1 } });

    store.getState().destroyCard("9");

    expect(store.getState().owned).toEqual({ "5": 1 });
  });

  it("destroyCard persists the updated owned map", () => {
    const store = createCollectionStore();
    store.setState({ owned: { "5": 1 } });

    store.getState().destroyCard("5");

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).owned).toEqual({});
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: FAIL — `store.getState().destroyCard is not a function` (4 failures, the other 8 pre-existing tests still pass).

- [ ] **Step 3: Modify `src/state/collectionStore.ts`**

Add `destroyCard: (cardId: string) => void;` to the `CollectionState` interface, and add the implementation to the object returned by `create<CollectionState>(...)`. Full resulting file:

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
  destroyCard: (cardId: string) => void;
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
    destroyCard: (cardId: string) => {
      const { coins, owned } = get();
      const count = owned[cardId] ?? 0;
      if (count <= 0) return;

      const nextOwned = { ...owned };
      if (count <= 1) {
        delete nextOwned[cardId];
      } else {
        nextOwned[cardId] = count - 1;
      }

      set({ owned: nextOwned });
      persist({ coins, owned: nextOwned });
    },
  }));
}

export const useCollectionStore = createCollectionStore();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: PASS (12 tests: 8 pre-existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/state/collectionStore.ts src/state/collectionStore.test.ts
git commit -m "feat: add destroyCard action to collectionStore"
```

---

### Task 3: `generateQueue(owned)` — draw from the real owned collection

**Files:**
- Modify: `src/data/inspection.ts`
- Modify: `src/data/inspection.test.ts` (full rewrite)

**Interfaces:**
- Consumes: `CARDS: CardDef[]` from `src/data/cards.ts`, `ANOMALOUS_CARD_IDS` from `src/data/messages.ts` (unchanged).
- Produces: `generateQueue(owned: Record<string, number>): CardDef[]` (signature change — was `generateQueue(): CardDef[]`), `isCompromising(cardId: string): boolean` (unchanged signature, but now also consumed by `CollectionGrid.tsx`, Task 5). Consumed by `InspectionQueue.tsx` (Task 4).

- [ ] **Step 1: Write the failing tests**

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

function ownedFromIds(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 1]));
}

describe("generateQueue", () => {
  it("returns an empty queue when nothing is owned", () => {
    expect(generateQueue({})).toEqual([]);
  });

  it("returns exactly QUEUE_SIZE cards when the player owns at least that many", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const owned = ownedFromIds(CARDS.map((c) => c.id)); // owns all 20
    const queue = generateQueue(owned);
    expect(queue).toHaveLength(QUEUE_SIZE);
  });

  it("shrinks the queue to the number of owned cards when fewer than QUEUE_SIZE are owned", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const anomalousId = ANOMALOUS_CARD_IDS[0];
    const cleanId = CARDS.map((c) => c.id).find(
      (id) => !ANOMALOUS_CARD_IDS.includes(id),
    )!;
    const owned = ownedFromIds([anomalousId, cleanId]); // owns only 2 cards
    const queue = generateQueue(owned);
    expect(queue).toHaveLength(2);
  });

  it("includes up to GUARANTEED_ANOMALOUS owned anomalous cards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const owned = ownedFromIds(CARDS.map((c) => c.id)); // owns all 20
    const queue = generateQueue(owned);
    const anomalousInQueue = queue.filter((card) => isCompromising(card.id));
    expect(anomalousInQueue).toHaveLength(GUARANTEED_ANOMALOUS);
  });

  it("includes only as many anomalous cards as the player actually owns, if fewer than GUARANTEED_ANOMALOUS", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const oneAnomalousId = ANOMALOUS_CARD_IDS[0];
    const cleanIds = CARDS.map((c) => c.id)
      .filter((id) => !ANOMALOUS_CARD_IDS.includes(id))
      .slice(0, 5);
    const owned = ownedFromIds([oneAnomalousId, ...cleanIds]); // owns only 1 anomalous card
    const queue = generateQueue(owned);
    const anomalousInQueue = queue.filter((card) => isCompromising(card.id));
    expect(anomalousInQueue).toHaveLength(1);
    expect(queue).toHaveLength(6);
  });

  it("fills the queue from remaining anomalous cards when the player owns no clean cards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const owned = ownedFromIds([...ANOMALOUS_CARD_IDS]); // owns only the 4 anomalous cards, 0 clean
    const queue = generateQueue(owned);
    expect(queue).toHaveLength(4);
    const ids = queue.map((card) => card.id).sort();
    expect(ids).toEqual([...ANOMALOUS_CARD_IDS].sort());
  });

  it("never includes a duplicate card", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const owned = ownedFromIds(CARDS.map((c) => c.id));
    const queue = generateQueue(owned);
    const ids = queue.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only draws cards that are actually owned", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const owned = ownedFromIds(["2", "4", "6", "8", ANOMALOUS_CARD_IDS[0]]);
    const queue = generateQueue(owned);
    const ownedIds = new Set(Object.keys(owned));
    for (const card of queue) {
      expect(ownedIds.has(card.id)).toBe(true);
    }
  });

  it("shuffles: anomalous cards do not always land at fixed positions", () => {
    const owned = ownedFromIds(CARDS.map((c) => c.id));
    const positions = new Set<number>();
    for (let i = 0; i < 100; i++) {
      generateQueue(owned).forEach((card, idx) => {
        if (isCompromising(card.id)) positions.add(idx);
      });
    }
    expect(positions.size).toBeGreaterThan(GUARANTEED_ANOMALOUS);
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

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/inspection.test.ts`
Expected: FAIL — `generateQueue` still has the old zero-argument signature; the "empty queue"/"shrinks"/"only as many anomalous"/"fills from remaining anomalous"/"only draws owned" tests fail because `generateQueue` doesn't read its argument yet (TypeScript will also flag the call-site argument as excess under the current signature — that type error is itself part of the expected RED state).

- [ ] **Step 3: Modify `src/data/inspection.ts`**

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

export function generateQueue(owned: Record<string, number>): CardDef[] {
  const ownedCards = CARDS.filter((card) => (owned[card.id] ?? 0) > 0);
  const queueSize = Math.min(QUEUE_SIZE, ownedCards.length);

  const anomalousOwned = ownedCards.filter((card) => isCompromising(card.id));
  const anomalousCount = Math.min(
    GUARANTEED_ANOMALOUS,
    anomalousOwned.length,
    queueSize,
  );
  const anomalousPicked = pickRandom(anomalousOwned, anomalousCount);
  const pickedIds = new Set(anomalousPicked.map((card) => card.id));

  const remainingPool = ownedCards.filter((card) => !pickedIds.has(card.id));
  const remainingCount = queueSize - anomalousCount;
  const restPicked = pickRandom(remainingPool, remainingCount);

  return shuffle([...anomalousPicked, ...restPicked]);
}

export function isCompromising(cardId: string): boolean {
  return ANOMALOUS_CARD_IDS.includes(cardId);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/inspection.test.ts`
Expected: PASS (11 tests: 9 in `generateQueue`, 2 in `isCompromising`).

- [ ] **Step 5: Commit**

```bash
git add src/data/inspection.ts src/data/inspection.test.ts
git commit -m "feat: generateQueue draws from the player's real owned collection"
```

---

### Task 4: `InspectionQueue` — wire real collection, persistent suspicion, "Détruire"

**Files:**
- Modify: `src/components/rda/InspectionQueue.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useCollectionStore` (`owned`, `destroyCard`) from `src/state/collectionStore.ts` (Task 2), `useSuspicionStore` (`suspicion`, `addSuspicion`) from `src/state/suspicionStore.ts` (Task 1), `generateQueue(owned)`, `isCompromising`, `ROUND_SECONDS`, `SUSPICION_PENALTY` from `src/data/inspection.ts` (Task 3). `CardInspector`, `SuspicionMeter` (sub-project 3, unchanged).
- Produces: `<InspectionQueue />` — still self-contained, no props (reads the stores itself instead of holding local suspicion state). Consumed by `App.tsx` (unchanged from sub-project 3, no wiring change needed here).

- [ ] **Step 1: Write the new `src/components/rda/InspectionQueue.tsx`**

```tsx
import { useEffect, useState } from "react";
import type { CardDef } from "../../data/cards";
import {
  ROUND_SECONDS,
  SUSPICION_PENALTY,
  generateQueue,
  isCompromising,
} from "../../data/inspection";
import { useCollectionStore } from "../../state/collectionStore";
import { useSuspicionStore } from "../../state/suspicionStore";
import CardInspector from "./CardInspector";
import SuspicionMeter from "./SuspicionMeter";

export default function InspectionQueue() {
  const owned = useCollectionStore((state) => state.owned);
  const destroyCard = useCollectionStore((state) => state.destroyCard);
  const suspicion = useSuspicionStore((state) => state.suspicion);
  const addSuspicion = useSuspicionStore((state) => state.addSuspicion);

  const [queue, setQueue] = useState<CardDef[]>(() => generateQueue(owned));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [missedAnomalies, setMissedAnomalies] = useState(0);
  const [roundOver, setRoundOver] = useState(false);

  useEffect(() => {
    if (roundOver || queue.length === 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [roundOver, queue.length]);

  useEffect(() => {
    if (secondsLeft === 0 && !roundOver && queue.length > 0) {
      setRoundOver(true);
    }
  }, [secondsLeft, roundOver, queue.length]);

  const startNewRound = () => {
    setQueue(generateQueue(owned));
    setCurrentIndex(0);
    setSecondsLeft(ROUND_SECONDS);
    setMissedAnomalies(0);
    setRoundOver(false);
  };

  const handleDecision = (action: "keep" | "hide" | "destroy") => {
    const card = queue[currentIndex];
    const compromising = isCompromising(card.id);

    if (action === "keep" && compromising) {
      addSuspicion(SUSPICION_PENALTY);
      setMissedAnomalies((prev) => prev + 1);
    }
    if (action === "destroy") {
      destroyCard(card.id);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setRoundOver(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="rda-theme inspection-queue">
        <p className="inspection-queue__summary">
          Rien à inspecter, ouvre d'abord des packs !
        </p>
      </div>
    );
  }

  if (roundOver) {
    const anomalousInQueue = queue.filter((card) =>
      isCompromising(card.id),
    ).length;
    return (
      <div className="rda-theme inspection-queue">
        <p className="inspection-queue__summary">
          Contrôle terminé. Suspicion actuelle : {suspicion}%.
          <br />
          Cartes compromettantes ratées : {missedAnomalies}/
          {anomalousInQueue}.
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
        <button type="button" onClick={() => handleDecision("keep")}>
          Garder visible
        </button>
        <button type="button" onClick={() => handleDecision("hide")}>
          Cacher
        </button>
        <button type="button" onClick={() => handleDecision("destroy")}>
          Détruire
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

You do not have access to an interactive browser. Substitute this verification:
1. Run `npx tsc --noEmit` — confirm no type errors (this also validates `generateQueue(owned)`'s new call signature and both stores' hook usage).
2. Run `npm run build` — confirm it succeeds.
3. Read back the code and manually trace three scenarios:
   - `owned = {}` (nothing owned): does `queue.length === 0` render the "Rien à inspecter" message, with no timer interval ever starting (the timer effect's `queue.length === 0` guard)?
   - `owned` has exactly 3 cards, one of them anomalous: does `generateQueue` (Task 3, already verified) produce a 3-card queue with exactly 1 anomalous card, and does the round-over summary's denominator show that actual count (1), not the fixed `GUARANTEED_ANOMALOUS` (2)?
   - Clicking "Détruire" on the current card: does it call `destroyCard(card.id)` and then advance to the next card exactly like "Garder visible"/"Cacher" do (same `nextIndex` logic), without applying any suspicion penalty (only `action === "keep" && compromising` does that)?
4. Confirm `suspicion` is read from `useSuspicionStore` (not local state) — so it does NOT reset to 0 in `startNewRound()` (verify `startNewRound` only resets `queue`, `currentIndex`, `secondsLeft`, `missedAnomalies`, `roundOver` — 5 pieces, not 6 like sub-project 3's version which used to include `suspicion`).
5. Do NOT attempt to start `npm run dev` — full interactive verification (including a real browser session confirming persistence across a page reload) happens later in this plan (Task 6), covered by a browser-equipped session.

- [ ] **Step 3: Commit**

```bash
git add src/components/rda/InspectionQueue.tsx
git commit -m "feat: wire InspectionQueue to real collection, persistent suspicion, and Détruire"
```

---

### Task 5: `CollectionGrid` — reuse `isCompromising()` instead of inline check

**Files:**
- Modify: `src/components/rfa/CollectionGrid.tsx`

**Interfaces:**
- Consumes: `isCompromising(cardId: string): boolean` from `src/data/inspection.ts` (Task 3), replacing the direct `ANOMALOUS_CARD_IDS` import from `src/data/messages.ts` (the `getSerialNumber` import from `messages.ts` stays — only `ANOMALOUS_CARD_IDS` is removed from this file).

- [ ] **Step 1: Modify `src/components/rfa/CollectionGrid.tsx`**

Change the import line:

```tsx
// Before
import { ANOMALOUS_CARD_IDS, getSerialNumber } from "../../data/messages";

// After
import { getSerialNumber } from "../../data/messages";
import { isCompromising } from "../../data/inspection";
```

Change the className logic in the detail overlay's serial `<p>`:

```tsx
// Before
className={
  ANOMALOUS_CARD_IDS.includes(selectedCard.id)
    ? "card-detail-overlay__serial card-detail-overlay__serial--anomaly"
    : "card-detail-overlay__serial"
}

// After
className={
  isCompromising(selectedCard.id)
    ? "card-detail-overlay__serial card-detail-overlay__serial--anomaly"
    : "card-detail-overlay__serial"
}
```

No other lines in this file change.

- [ ] **Step 2: Manual verification**

1. Run `npx tsc --noEmit` — confirm no type errors (confirms `ANOMALOUS_CARD_IDS` is no longer referenced anywhere in this file, and the new import resolves).
2. Run `npm run build` — confirm it succeeds.
3. Read back the code: does `isCompromising(selectedCard.id)` produce the exact same boolean as the old `ANOMALOUS_CARD_IDS.includes(selectedCard.id)` for every card id (both ultimately check membership in the same `ANOMALOUS_CARD_IDS` array — `isCompromising` is a pure passthrough, confirmed in Task 3's `isCompromising` tests)?
4. Do NOT attempt to start `npm run dev` — covered by Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/components/rfa/CollectionGrid.tsx
git commit -m "refactor: CollectionGrid uses isCompromising() instead of inline ANOMALOUS_CARD_IDS check"
```

---

### Task 6: Full test suite + build sanity check + E2E walkthrough

**Files:** none created — verification only.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: PASS, 37 tests total (3 `cards.test.ts` + 4 `messages.test.ts` + 11 `inspection.test.ts` + 12 `collectionStore.test.ts` + 7 `suspicionStore.test.ts`), 0 failures.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors, produces `dist/`. Confirm via `git status --short` that no stray generated files land in the repo root (the sub-project 1 `tsconfig.node.json` `outDir` fix should already prevent this).

- [ ] **Step 3: Smoke-test the production build**

Run: `npm run preview` (or drive it headlessly via Playwright if no interactive browser is available in this environment — this pattern was already used for sub-project 1's and sub-project 3's final verification).

Expected walkthrough:
1. Fresh `localStorage` (clear both `telefonkarte-collection` and `telefonkarte-suspicion` keys). Land on Collection tab (empty), switch to "Inspection (proto)" — should show "Rien à inspecter, ouvre d'abord des packs !" since nothing is owned yet.
2. Switch to Boutique, open enough packs to own at least 3-4 distinct cards including at least one of the 4 anomalous ids ("3", "7", "12", "18") — may take a few tries given randomness, or open ~10 packs to make it likely.
3. Switch to Inspection tab — a queue now renders sized to the owned collection (not necessarily 8), with the timer running.
4. Click "Détruire" on the current card — switch to Collection tab and confirm that card's owned count decreased by 1 (or the card disappeared from the grid if it was a single copy).
5. Return to Inspection tab (this remounts `InspectionQueue`, generating a fresh queue from the now-updated collection) — click "Garder visible" on a card whose serial number visibly breaks the `DBP-XXX-83` pattern (an anomalous card) — suspicion bar increases.
6. Play through to round-over — reload the page entirely — switch back to Inspection tab — confirm the suspicion percentage shown is unchanged from before the reload (persisted), unlike sub-project 3 where it used to reset to 0.
7. Confirm zero console errors throughout.

No commit for this task — it's a verification checkpoint confirming Tasks 1-5 integrate cleanly.
