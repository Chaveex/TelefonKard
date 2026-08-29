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

  it("shuffles: anomalous cards do not always land at fixed positions", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 100; i++) {
      generateQueue().forEach((card, idx) => {
        if (ANOMALOUS_CARD_IDS.includes(card.id)) positions.add(idx);
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
