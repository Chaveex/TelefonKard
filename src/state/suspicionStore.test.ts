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

  it("resetSuspicion sets suspicion back to 0", () => {
    const store = createSuspicionStore();
    store.getState().addSuspicion(80);

    store.getState().resetSuspicion();

    expect(store.getState().suspicion).toBe(0);
  });

  it("resetSuspicion persists the reset value", () => {
    const store = createSuspicionStore();
    store.getState().addSuspicion(80);

    store.getState().resetSuspicion();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ suspicion: 0 });
  });
});
