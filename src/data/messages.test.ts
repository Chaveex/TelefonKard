import { describe, expect, it } from "vitest";
import { ANOMALOUS_CARD_IDS, getSerialNumber, HIDDEN_LETTERS } from "./messages";

describe("getSerialNumber", () => {
  it("returns the clean DBP-XXX-83 format for a non-anomalous card", () => {
    expect(ANOMALOUS_CARD_IDS).not.toContain("1");
    expect(getSerialNumber("1")).toBe("DBP-001-83");
  });

  it("returns the clean format for another non-anomalous card, zero-padded", () => {
    expect(ANOMALOUS_CARD_IDS).not.toContain("20");
    expect(getSerialNumber("20")).toBe("DBP-020-83");
  });

  it("returns a visibly broken serial for every anomalous card id", () => {
    for (const id of ANOMALOUS_CARD_IDS) {
      const serial = getSerialNumber(id);
      expect(serial).not.toBe(`DBP-${id.padStart(3, "0")}-83`);
      expect(serial).toBe(`DBP-${id.padStart(3, "0")}X-8V`);
    }
  });

  it("has a non-empty, fixed subset of anomalous ids, all valid card ids", () => {
    expect(ANOMALOUS_CARD_IDS.length).toBeGreaterThan(0);
    for (const id of ANOMALOUS_CARD_IDS) {
      const n = Number(id);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(20);
    }
  });
});

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
