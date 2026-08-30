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
    expect(JSON.parse(raw!)).toEqual({
      coins: 80,
      owned: { [CARDS[0].id]: 1 },
    });
  });

  it("rehydrates state from localStorage on creation", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ coins: 42, owned: { "3": 2 } }),
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

  it("resetCollection sets coins back to 100 and clears owned", () => {
    const store = createCollectionStore();
    store.setState({ coins: 0, owned: { "1": 3, "5": 1 } });

    store.getState().resetCollection();

    expect(store.getState().coins).toBe(100);
    expect(store.getState().owned).toEqual({});
  });

  it("resetCollection persists the reset state", () => {
    const store = createCollectionStore();
    store.setState({ coins: 0, owned: { "1": 3 } });

    store.getState().resetCollection();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ coins: 100, owned: {} });
  });
});
