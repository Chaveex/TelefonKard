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

  it("includes exactly GUARANTEED_ANOMALOUS owned anomalous cards, over many real random draws", () => {
    const owned = ownedFromIds(CARDS.map((c) => c.id)); // owns all 20
    for (let i = 0; i < 200; i++) {
      const queue = generateQueue(owned);
      const anomalousInQueue = queue.filter((card) => isCompromising(card.id));
      expect(anomalousInQueue).toHaveLength(GUARANTEED_ANOMALOUS);
    }
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
