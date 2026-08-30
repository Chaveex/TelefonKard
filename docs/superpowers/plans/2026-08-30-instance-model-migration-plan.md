# Instance Model Migration (Sub-project 5a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `collectionStore`'s internal collection tracking from a count map (`owned: Record<string, number>`) to a per-instance list (`instances: CardInstance[]`), with `owned` re-derived from `instances` after every mutation — zero visible gameplay behavior change, zero changes to any consumer file.

**Architecture:** A new pure-logic module (`src/data/cardInstance.ts`) defines the `CardInstance` type and two pure helpers: `generateInstanceId` (unique-enough per-copy id) and `computeOwned` (derives the count map from an instance list). `collectionStore.ts` persists `{ coins, instances }` to `localStorage` instead of `{ coins, owned }`, and computes `owned` fresh after every mutation so it stays byte-for-byte identical in shape to what `CollectionGrid`, `ShopScreen`, `InspectionQueue`, and `generateQueue` already expect.

**Tech Stack:** React 18, TypeScript, Vite 5, Zustand 4, Vitest 2 — identical stack, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-30-instance-model-migration-design.md`

## Global Constraints

- `instances: CardInstance[]` is the persisted source of truth (`localStorage` key stays `telefonkarte-collection`, but its JSON shape changes from `{coins, owned}` to `{coins, instances}`). (spec: `collectionStore` — migration interne)
- `owned: Record<string, number>` remains a field on `CollectionState`, recomputed via `computeOwned(instances)` after every mutation (`openPack`, `destroyCard`, `resetCollection`) — its VALUE must be identical to what the old counter-based implementation would have produced for the same sequence of actions. (spec: `collectionStore` — migration interne)
- `destroyCard(cardId)` removes exactly one instance whose `cardId` matches (the first one found — no instance differs from another yet); no-op if none match. (spec: `collectionStore` — migration interne)
- A `localStorage` value in the OLD format (`{coins, owned}`, no `instances` array) must fail validation and fall back to the initial state (`coins: 100, instances: []`) — this is a deliberate "reset, don't migrate" decision, not a bug. (spec: Contexte, "Migration des sauvegardes")
- Zero changes to `src/components/rfa/CollectionGrid.tsx`, `src/components/rfa/ShopScreen.tsx`, `src/components/rda/InspectionQueue.tsx`, or `src/data/inspection.ts` — none of these files are touched by this plan. (spec: Contexte)
- No `CardInstance` property beyond `cardId` and `instanceId` — no indice-layer-2 fields yet, that's a future sub-project. (spec: Contexte)
- `src/data/cardInstance.ts`'s two functions are pure and get unit tests; `collectionStore`'s existing test suite is updated wherever it seeded state via `owned` directly (since `destroyCard` now reads `instances`, not `owned`) — consistent with this project's established testing strategy (store/data logic tested, UI not). (spec: Testing)

---

### Task 1: `src/data/cardInstance.ts` (pure per-instance helpers)

**Files:**
- Create: `src/data/cardInstance.ts`
- Test: `src/data/cardInstance.test.ts`

**Interfaces:**
- Produces:
  - `interface CardInstance { cardId: string; instanceId: string }` — consumed by `collectionStore.ts` (Task 2).
  - `generateInstanceId(cardId: string): string` — consumed by `collectionStore.ts`'s `openPack` (Task 2).
  - `computeOwned(instances: CardInstance[]): Record<string, number>` — consumed by `collectionStore.ts` (Task 2), in every mutation.

- [ ] **Step 1: Write the failing tests**

```ts
// src/data/cardInstance.test.ts
import { describe, expect, it } from "vitest";
import {
  computeOwned,
  generateInstanceId,
  type CardInstance,
} from "./cardInstance";

describe("computeOwned", () => {
  it("returns an empty map for an empty instance list", () => {
    expect(computeOwned([])).toEqual({});
  });

  it("counts multiple instances of the same card", () => {
    const instances: CardInstance[] = [
      { cardId: "1", instanceId: "a" },
      { cardId: "1", instanceId: "b" },
      { cardId: "1", instanceId: "c" },
    ];
    expect(computeOwned(instances)).toEqual({ "1": 3 });
  });

  it("counts different cards independently", () => {
    const instances: CardInstance[] = [
      { cardId: "1", instanceId: "a" },
      { cardId: "5", instanceId: "b" },
      { cardId: "1", instanceId: "c" },
      { cardId: "9", instanceId: "d" },
    ];
    expect(computeOwned(instances)).toEqual({ "1": 2, "5": 1, "9": 1 });
  });
});

describe("generateInstanceId", () => {
  it("produces different ids across multiple calls", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => generateInstanceId("1")),
    );
    expect(ids.size).toBe(50);
  });

  it("includes the cardId as a prefix for debuggability", () => {
    const id = generateInstanceId("7");
    expect(id.startsWith("7-")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/cardInstance.test.ts`
Expected: FAIL — `Failed to resolve import "./cardInstance"` (file doesn't exist yet).

- [ ] **Step 3: Write `src/data/cardInstance.ts`**

```ts
export interface CardInstance {
  cardId: string;
  instanceId: string;
}

export function generateInstanceId(cardId: string): string {
  return `${cardId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeOwned(instances: CardInstance[]): Record<string, number> {
  const owned: Record<string, number> = {};
  for (const instance of instances) {
    owned[instance.cardId] = (owned[instance.cardId] ?? 0) + 1;
  }
  return owned;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/cardInstance.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/cardInstance.ts src/data/cardInstance.test.ts
git commit -m "feat: add CardInstance model and computeOwned/generateInstanceId helpers"
```

---

### Task 2: Migrate `collectionStore` to `instances`

**Files:**
- Modify: `src/state/collectionStore.ts`
- Modify: `src/state/collectionStore.test.ts` (full rewrite)

**Interfaces:**
- Consumes: `CardInstance`, `generateInstanceId`, `computeOwned` from `src/data/cardInstance.ts` (Task 1).
- Produces: `CollectionState` now has `instances: CardInstance[]` in addition to the unchanged `coins`, `owned`, `openPack`, `destroyCard`, `resetCollection` — the PUBLIC shape consumers rely on (`coins`, `owned`, the 3 actions) is unchanged; `instances` is new and not yet consumed by anything outside this store (future sub-project 5b will read it).

- [ ] **Step 1: Replace `src/state/collectionStore.test.ts` with the rewritten suite**

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
    const persisted = JSON.parse(raw!);
    expect(persisted.coins).toBe(80);
    expect(persisted.instances).toHaveLength(1);
    expect(persisted.instances[0].cardId).toBe(CARDS[0].id);
    expect(typeof persisted.instances[0].instanceId).toBe("string");
  });

  it("rehydrates state from localStorage on creation", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coins: 42,
        instances: [
          { cardId: "3", instanceId: "a" },
          { cardId: "3", instanceId: "b" },
        ],
      }),
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

  it("falls back to initial state when localStorage holds the old owned-map format", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ coins: 42, owned: { "3": 2 } }),
    );

    const store = createCollectionStore();

    expect(store.getState().coins).toBe(100);
    expect(store.getState().owned).toEqual({});
  });

  it("destroyCard decrements a count greater than 1", () => {
    const store = createCollectionStore();
    store.setState({
      instances: [
        { cardId: "5", instanceId: "a" },
        { cardId: "5", instanceId: "b" },
        { cardId: "5", instanceId: "c" },
      ],
    });

    store.getState().destroyCard("5");

    expect(store.getState().owned).toEqual({ "5": 2 });
  });

  it("destroyCard removes the key entirely when count reaches 0", () => {
    const store = createCollectionStore();
    store.setState({ instances: [{ cardId: "5", instanceId: "a" }] });

    store.getState().destroyCard("5");

    expect(store.getState().owned).toEqual({});
  });

  it("destroyCard is a no-op when the card is not owned", () => {
    const store = createCollectionStore();
    store.setState({ instances: [{ cardId: "5", instanceId: "a" }] });

    store.getState().destroyCard("9");

    expect(store.getState().owned).toEqual({ "5": 1 });
  });

  it("destroyCard persists the updated instances", () => {
    const store = createCollectionStore();
    store.setState({ instances: [{ cardId: "5", instanceId: "a" }] });

    store.getState().destroyCard("5");

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).instances).toEqual([]);
  });

  it("resetCollection sets coins back to 100 and clears owned", () => {
    const store = createCollectionStore();
    store.setState({
      coins: 0,
      instances: [
        { cardId: "1", instanceId: "a" },
        { cardId: "1", instanceId: "b" },
        { cardId: "1", instanceId: "c" },
        { cardId: "5", instanceId: "d" },
      ],
    });

    store.getState().resetCollection();

    expect(store.getState().coins).toBe(100);
    expect(store.getState().owned).toEqual({});
  });

  it("resetCollection persists the reset state", () => {
    const store = createCollectionStore();
    store.setState({
      coins: 0,
      instances: [{ cardId: "1", instanceId: "a" }],
    });

    store.getState().resetCollection();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ coins: 100, instances: [] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: FAIL — the `destroyCard`/rehydrate/persist tests fail because the current implementation still reads/writes `owned` directly (seeding `instances` via `setState` has no effect on the old code, and the old code's `persist()` output has an `owned` key, not `instances`). The 6 tests that only read `owned` without seeding it (starts-with, openPack debits, duplicate, refuses, invalid JSON, wrong shape) should still PASS even before this task's implementation change — that's expected and fine, TypeScript may also flag `store.setState({ instances: [...] })` as an error against the CURRENT `CollectionState` type (which has no `instances` field yet) — that type error is itself part of the expected RED state.

- [ ] **Step 3: Replace `src/state/collectionStore.ts`**

```ts
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { CARDS, type CardDef } from "../data/cards";
import {
  computeOwned,
  generateInstanceId,
  type CardInstance,
} from "../data/cardInstance";

const STORAGE_KEY = "telefonkarte-collection";
export const PACK_PRICE = 20;
const STARTING_COINS = 100;

interface PersistedState {
  coins: number;
  instances: CardInstance[];
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.coins === "number" && Array.isArray(v.instances);
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { coins: STARTING_COINS, instances: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return { coins: STARTING_COINS, instances: [] };
    return { coins: parsed.coins, instances: parsed.instances };
  } catch {
    return { coins: STARTING_COINS, instances: [] };
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — in-memory state still works.
  }
}

export interface CollectionState {
  coins: number;
  instances: CardInstance[];
  owned: Record<string, number>;
  openPack: () => CardDef | null;
  destroyCard: (cardId: string) => void;
  resetCollection: () => void;
}

export function createCollectionStore(): UseBoundStore<StoreApi<CollectionState>> {
  const initial = loadInitialState();

  return create<CollectionState>((set, get) => ({
    coins: initial.coins,
    instances: initial.instances,
    owned: computeOwned(initial.instances),
    openPack: () => {
      const { coins, instances } = get();
      if (coins < PACK_PRICE) return null;

      const card = CARDS[Math.floor(Math.random() * CARDS.length)];
      const nextInstances = [
        ...instances,
        { cardId: card.id, instanceId: generateInstanceId(card.id) },
      ];
      const nextCoins = coins - PACK_PRICE;

      set({
        coins: nextCoins,
        instances: nextInstances,
        owned: computeOwned(nextInstances),
      });
      persist({ coins: nextCoins, instances: nextInstances });
      return card;
    },
    destroyCard: (cardId: string) => {
      const { coins, instances } = get();
      const index = instances.findIndex(
        (instance) => instance.cardId === cardId,
      );
      if (index === -1) return;

      const nextInstances = [
        ...instances.slice(0, index),
        ...instances.slice(index + 1),
      ];

      set({ instances: nextInstances, owned: computeOwned(nextInstances) });
      persist({ coins, instances: nextInstances });
    },
    resetCollection: () => {
      const next: PersistedState = { coins: STARTING_COINS, instances: [] };
      set({ ...next, owned: {} });
      persist(next);
    },
  }));
}

export const useCollectionStore = createCollectionStore();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Confirm zero changes needed in consumer files**

Run: `npx tsc --noEmit` — confirm zero errors project-wide. Since `CollectionState`'s public shape (`coins`, `owned`, `openPack`, `destroyCard`, `resetCollection`) is unchanged and only gains a new `instances` field, `CollectionGrid.tsx`, `ShopScreen.tsx`, `InspectionQueue.tsx`, and `inspection.ts` (all of which only ever read `state.owned` or call the 3 actions, never touch `instances`) must type-check with no changes. If `tsc` reports an error in any of those files, STOP — that means an assumption in this plan was wrong, and the fix belongs in a follow-up task, not a silent edit to "make it compile."

- [ ] **Step 6: Commit**

```bash
git add src/state/collectionStore.ts src/state/collectionStore.test.ts
git commit -m "refactor: migrate collectionStore to a per-instance CardInstance model"
```

---

### Task 3: Full test suite + build sanity check + E2E walkthrough

**Files:** none created — verification only.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: PASS, 48 tests total (42 pre-existing + 5 `cardInstance.test.ts` + 1 new old-format-fallback case added to `collectionStore.test.ts`, which itself is now 15 tests instead of 14), 0 failures.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors, produces `dist/`. Confirm via `git status --short` that no stray generated files land in the repo root.

- [ ] **Step 3: Smoke-test the production build (behavior-preservation focus)**

Run: `npm run preview` (or drive it headlessly via Playwright if no interactive browser is available in this environment — this pattern was already used for prior sub-projects' final verification).

Since this plan makes NO visible gameplay changes, the walkthrough's job is to confirm nothing regressed:
1. Fresh `localStorage` (clear `telefonkarte-collection`). Open a few packs from the Boutique tab — confirm coins decrement by 20 each time, and the Collection tab shows the drawn cards with correct duplicate badges (`×N`) exactly as before this plan.
2. Switch to the Inspection tab — confirm the queue still sizes itself to the owned collection (sub-project 4a behavior) and un-owned cards never appear.
3. Use "Détruire" on a duplicate card in the Inspection tab — confirm its badge count decrements by exactly 1 on the Collection tab afterward (not deleted entirely, since it started with 2+ copies).
4. Reload the page — confirm the collection and coin balance persisted correctly (this is the most important regression check: it proves the new `{coins, instances}` JSON shape round-trips correctly through `localStorage`).
5. Open the browser's devtools/localStorage inspector (or read it via `page.evaluate` in a headless walkthrough) and confirm the `telefonkarte-collection` key's JSON now has an `instances` array (not an `owned` object) at the top level.
6. Confirm zero console errors throughout.

No commit for this task — it's a verification checkpoint confirming Tasks 1-2 integrate cleanly and preserve behavior.
