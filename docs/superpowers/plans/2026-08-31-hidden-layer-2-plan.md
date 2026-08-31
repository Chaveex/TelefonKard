# Hidden Layer-2 Clue (Sub-project 5b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the per-instance hidden-clue data model (which physical copy of an anomalous card, if any, carries a hidden letter) as pure, tested logic, wired into `collectionStore.openPack` — no UI, no rendering, no Inspection integration.

**Architecture:** `CardInstance` gains an optional `markedLetter` field. A new `HIDDEN_LETTERS` lookup table lives in `src/data/messages.ts` alongside the existing layer-1 `ANOMALOUS_CARD_IDS`/`getSerialNumber`. Two new pure functions in `src/data/cardInstance.ts` — `createInstance` (replaces the inline instance construction in `openPack`, rolls a chance to mark anomalous cards) and `revealMarkedLetter` (finds the marked instance's letter among a list of same-card instances) — carry the actual logic. `collectionStore.ts` changes in exactly one place: `openPack` calls `createInstance` instead of building `{cardId, instanceId}` inline.

**Tech Stack:** React 18, TypeScript, Vite 5, Zustand 4, Vitest 2 — identical stack, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-31-hidden-layer-2-design.md`

## Global Constraints

- `markedLetter?: string` is the only new `CardInstance` property — no color/notch rendering metadata, that's a future sub-project's UI concern. (spec: Modèle de données)
- Only cards in `ANOMALOUS_CARD_IDS` (from `src/data/messages.ts`) can ever produce a marked instance — reuse the existing layer-1 set, don't introduce a second card list. (spec: Table des lettres cachées)
- `HIDDEN_LETTERS` has exactly one entry per `ANOMALOUS_CARD_IDS` id: `{"3": "K", "7": "G", "12": "B", "18": "R"}` — arbitrary placeholder values, no narrative meaning yet. (spec: Table des lettres cachées)
- `MARK_CHANCE = 0.3` — the probability a new instance of an anomalous card is the marked copy. (spec: Nouvelles fonctions pures)
- `createInstance(cardId)` calls `generateInstanceId(cardId)` first, then — only if `cardId` is anomalous — calls `Math.random()` once to decide marking. A non-anomalous `cardId` never calls `Math.random()` for marking (0 extra calls); this ordering is load-bearing for how tests mock `Math.random()`. (spec: Nouvelles fonctions pures)
- `revealMarkedLetter(instances, cardId)` is total on any input (including empty arrays or no matching `cardId`) and never throws — returns `null` when nothing is found. (spec: Error handling)
- Zero changes to `destroyCard`, `computeOwned`, `resetCollection`, or any file under `src/components/` — `owned` stays derived from `instances` exactly as in 5a, and no UI reads `markedLetter` yet. (spec: Contexte, hors-scope)

---

### Task 1: `HIDDEN_LETTERS` lookup in `src/data/messages.ts`

**Files:**
- Modify: `src/data/messages.ts`
- Modify: `src/data/messages.test.ts`

**Interfaces:**
- Produces: `HIDDEN_LETTERS: Record<string, string>` — consumed by `src/data/cardInstance.ts` (Task 2).

- [ ] **Step 1: Write the failing test**

Add to `src/data/messages.test.ts` (new `describe` block, keep the existing `getSerialNumber` block untouched):

```ts
import { ANOMALOUS_CARD_IDS, getSerialNumber, HIDDEN_LETTERS } from "./messages";
```

(replace the existing import line at the top of the file with the one above, adding `HIDDEN_LETTERS`)

```ts
describe("HIDDEN_LETTERS", () => {
  it("has exactly one single-uppercase-letter entry per anomalous card id", () => {
    for (const id of ANOMALOUS_CARD_IDS) {
      expect(HIDDEN_LETTERS[id]).toMatch(/^[A-Z]$/);
    }
  });

  it("has no entries for non-anomalous card ids", () => {
    expect(Object.keys(HIDDEN_LETTERS).sort()).toEqual(
      [...ANOMALOUS_CARD_IDS].sort(),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/messages.test.ts`
Expected: FAIL — `HIDDEN_LETTERS` is not exported yet (`SyntaxError` / undefined import).

- [ ] **Step 3: Add `HIDDEN_LETTERS` to `src/data/messages.ts`**

Add this export to the end of `src/data/messages.ts` (leave `ANOMALOUS_CARD_IDS` and `getSerialNumber` untouched):

```ts
export const HIDDEN_LETTERS: Record<string, string> = {
  "3": "K",
  "7": "G",
  "12": "B",
  "18": "R",
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/messages.test.ts`
Expected: PASS (6 tests: 4 existing `getSerialNumber` + 2 new `HIDDEN_LETTERS`).

- [ ] **Step 5: Commit**

```bash
git add src/data/messages.ts src/data/messages.test.ts
git commit -m "feat: add HIDDEN_LETTERS lookup for layer-2 clue"
```

---

### Task 2: `createInstance` and `revealMarkedLetter` in `src/data/cardInstance.ts`

**Files:**
- Modify: `src/data/cardInstance.ts`
- Modify: `src/data/cardInstance.test.ts`

**Interfaces:**
- Consumes: `ANOMALOUS_CARD_IDS`, `HIDDEN_LETTERS` from `src/data/messages.ts` (Task 1).
- Produces:
  - `CardInstance.markedLetter?: string` — consumed by `collectionStore.ts` (Task 3, transitively via `createInstance`'s return value) and by `revealMarkedLetter` itself.
  - `MARK_CHANCE: number` — consumed by `collectionStore.test.ts` (Task 3) to compute mock `Math.random()` thresholds.
  - `createInstance(cardId: string): CardInstance` — consumed by `collectionStore.ts`'s `openPack` (Task 3).
  - `revealMarkedLetter(instances: CardInstance[], cardId: string): string | null` — not consumed by any other task in this plan (future UI sub-project consumes it); still exported and tested here.

- [ ] **Step 1: Write the failing tests**

Replace `src/data/cardInstance.test.ts` in full with:

```ts
// src/data/cardInstance.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  computeOwned,
  createInstance,
  generateInstanceId,
  MARK_CHANCE,
  revealMarkedLetter,
  type CardInstance,
} from "./cardInstance";
import { HIDDEN_LETTERS } from "./messages";

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

describe("createInstance", () => {
  it("never marks a non-anomalous card, and never calls Math.random for marking", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const instance = createInstance("1");

    expect(instance.markedLetter).toBeUndefined();
    expect(randomSpy).toHaveBeenCalledTimes(1); // only generateInstanceId's call
  });

  it("sets cardId and a generated instanceId regardless of marking", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const instance = createInstance("5");

    expect(instance.cardId).toBe("5");
    expect(typeof instance.instanceId).toBe("string");
  });

  it("marks an anomalous card when the roll is under MARK_CHANCE", () => {
    expect(MARK_CHANCE).toBe(0.3);
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.5); // generateInstanceId's suffix
    randomSpy.mockReturnValueOnce(0.1); // < MARK_CHANCE

    const instance = createInstance("3");

    expect(instance.markedLetter).toBe(HIDDEN_LETTERS["3"]);
  });

  it("does not mark an anomalous card when the roll is at or above MARK_CHANCE", () => {
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.5); // generateInstanceId's suffix
    randomSpy.mockReturnValueOnce(0.3); // >= MARK_CHANCE, boundary is exclusive

    const instance = createInstance("3");

    expect(instance.markedLetter).toBeUndefined();
  });
});

describe("revealMarkedLetter", () => {
  it("returns null for an empty instance list", () => {
    expect(revealMarkedLetter([], "3")).toBeNull();
  });

  it("returns null when no instance of the given cardId is marked", () => {
    const instances: CardInstance[] = [
      { cardId: "3", instanceId: "a" },
      { cardId: "3", instanceId: "b" },
    ];
    expect(revealMarkedLetter(instances, "3")).toBeNull();
  });

  it("returns the marked letter when one instance of the given cardId is marked", () => {
    const instances: CardInstance[] = [
      { cardId: "3", instanceId: "a" },
      { cardId: "3", instanceId: "b", markedLetter: "K" },
    ];
    expect(revealMarkedLetter(instances, "3")).toBe("K");
  });

  it("ignores marked instances of a different cardId", () => {
    const instances: CardInstance[] = [
      { cardId: "7", instanceId: "a", markedLetter: "G" },
    ];
    expect(revealMarkedLetter(instances, "3")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/cardInstance.test.ts`
Expected: FAIL — `createInstance`, `MARK_CHANCE`, `revealMarkedLetter` are not exported yet.

- [ ] **Step 3: Replace `src/data/cardInstance.ts`**

```ts
// src/data/cardInstance.ts
import { ANOMALOUS_CARD_IDS, HIDDEN_LETTERS } from "./messages";

export interface CardInstance {
  cardId: string;
  instanceId: string;
  markedLetter?: string;
}

export const MARK_CHANCE = 0.3;

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

export function createInstance(cardId: string): CardInstance {
  const instance: CardInstance = {
    cardId,
    instanceId: generateInstanceId(cardId),
  };

  if (ANOMALOUS_CARD_IDS.includes(cardId) && Math.random() < MARK_CHANCE) {
    instance.markedLetter = HIDDEN_LETTERS[cardId];
  }

  return instance;
}

export function revealMarkedLetter(
  instances: CardInstance[],
  cardId: string,
): string | null {
  const marked = instances.find(
    (instance) => instance.cardId === cardId && instance.markedLetter,
  );
  return marked?.markedLetter ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/cardInstance.test.ts`
Expected: PASS (13 tests: 3 `computeOwned` + 2 `generateInstanceId` + 4 `createInstance` + 4 `revealMarkedLetter`).

- [ ] **Step 5: Commit**

```bash
git add src/data/cardInstance.ts src/data/cardInstance.test.ts
git commit -m "feat: add createInstance/revealMarkedLetter for layer-2 marking"
```

---

### Task 3: Wire `collectionStore.openPack` to `createInstance`

**Files:**
- Modify: `src/state/collectionStore.ts`
- Modify: `src/state/collectionStore.test.ts`

**Interfaces:**
- Consumes: `createInstance` from `src/data/cardInstance.ts` (Task 2), `HIDDEN_LETTERS` from `src/data/messages.ts` (Task 1, test-only).
- Produces: no new public interface — `CollectionState`'s shape is unchanged; `instances[].markedLetter` simply appears on newly-drawn anomalous-card instances at runtime.

- [ ] **Step 1: Add failing tests to `src/state/collectionStore.test.ts`**

Add `HIDDEN_LETTERS` to the imports at the top of the file:

```ts
import { HIDDEN_LETTERS } from "../data/messages";
```

Add this `describe` block at the end of the file, inside or after the existing `describe("collectionStore", ...)` block (as a sibling top-level `describe`, so it gets its own `beforeEach` from the file-level one already in place):

```ts
describe("collectionStore — layer-2 marking", () => {
  it("marks the drawn instance when the card is anomalous and the mark roll succeeds", () => {
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.1); // floor(0.1 * 20) = 2 -> CARDS[2], id "3" (anomalous)
    randomSpy.mockReturnValueOnce(0.5); // generateInstanceId's random suffix
    randomSpy.mockReturnValueOnce(0.1); // < MARK_CHANCE (0.3) -> marked
    const store = createCollectionStore();

    store.getState().openPack();

    const instance = store.getState().instances[0];
    expect(instance.cardId).toBe("3");
    expect(instance.markedLetter).toBe(HIDDEN_LETTERS["3"]);
  });

  it("does not mark the drawn instance when the mark roll fails", () => {
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.1); // CARDS[2], id "3" (anomalous)
    randomSpy.mockReturnValueOnce(0.5); // generateInstanceId's random suffix
    randomSpy.mockReturnValueOnce(0.9); // >= MARK_CHANCE -> not marked
    const store = createCollectionStore();

    store.getState().openPack();

    expect(store.getState().instances[0].markedLetter).toBeUndefined();
  });

  it("never marks a non-anomalous card's drawn instance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // CARDS[0], id "1" (not anomalous)
    const store = createCollectionStore();

    store.getState().openPack();

    expect(store.getState().instances[0].markedLetter).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: FAIL on the 2 new marking tests (`markedLetter` is `undefined` when a mark was expected) — `openPack` still builds `{cardId, instanceId}` inline without calling `createInstance`. The pre-existing tests should still PASS unchanged (CARDS[0].id is "1", non-anomalous, so their `mockReturnValue(0)` behavior is unaffected by this task).

- [ ] **Step 3: Update `openPack` in `src/state/collectionStore.ts`**

Change the import block at the top:

```ts
import {
  computeOwned,
  createInstance,
  type CardInstance,
} from "../data/cardInstance";
```

(this drops `generateInstanceId` from the import — `collectionStore.ts` no longer calls it directly, only `createInstance` does)

In `openPack`, replace:

```ts
      const nextInstances = [
        ...instances,
        { cardId: card.id, instanceId: generateInstanceId(card.id) },
      ];
```

with:

```ts
      const nextInstances = [...instances, createInstance(card.id)];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/collectionStore.test.ts`
Expected: PASS (19 tests: 16 existing + 3 new marking tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/collectionStore.ts src/state/collectionStore.test.ts
git commit -m "feat: wire openPack to createInstance for layer-2 marking"
```

---

### Task 4: Full test suite + build sanity check

**Files:** none created — verification only.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: PASS, 62 tests total (49 pre-existing + 2 new `messages.test.ts` + 8 net new `cardInstance.test.ts` [13 total, 5 pre-existing] + 3 new `collectionStore.test.ts`), 0 failures.

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: 0 errors — no file outside `src/data/messages.ts`, `src/data/cardInstance.ts`, `src/state/collectionStore.ts` (and their tests) should need changes, since `CollectionState`'s public shape is unchanged.

Run: `npm run build`
Expected: succeeds, produces `dist/`.

Run: `git status --short`
Expected: no stray generated files land in the repo root.

No commit for this task — it's a verification checkpoint confirming Tasks 1-3 integrate cleanly.
