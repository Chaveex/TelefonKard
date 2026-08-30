import { create, type StoreApi, type UseBoundStore } from "zustand";

const STORAGE_KEY = "telefonkarte-suspicion";
export const WARNING_THRESHOLD = 70;
export const ARREST_THRESHOLD = 100;

interface PersistedState {
  suspicion: number;
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.suspicion === "number";
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { suspicion: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return { suspicion: 0 };
    return { suspicion: parsed.suspicion };
  } catch {
    return { suspicion: 0 };
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — in-memory state still works.
  }
}

export interface SuspicionState extends PersistedState {
  addSuspicion: (amount: number) => void;
  resetSuspicion: () => void;
}

export function createSuspicionStore(): UseBoundStore<StoreApi<SuspicionState>> {
  return create<SuspicionState>((set, get) => ({
    ...loadInitialState(),
    addSuspicion: (amount: number) => {
      const next = Math.min(100, Math.max(0, get().suspicion + amount));
      set({ suspicion: next });
      persist({ suspicion: next });
    },
    resetSuspicion: () => {
      set({ suspicion: 0 });
      persist({ suspicion: 0 });
    },
  }));
}

export const useSuspicionStore = createSuspicionStore();
