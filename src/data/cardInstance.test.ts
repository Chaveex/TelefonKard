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
