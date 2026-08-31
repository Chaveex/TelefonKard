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
