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
