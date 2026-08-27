import { create, type StoreApi, type UseBoundStore } from "zustand";
import { CARDS, type CardDef } from "../data/cards";

const STORAGE_KEY = "telefonkarte-collection";
export const PACK_PRICE = 20;
const STARTING_COINS = 100;

interface PersistedState {
  coins: number;
  owned: Record<string, number>;
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.coins === "number" && typeof v.owned === "object" && v.owned !== null;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { coins: STARTING_COINS, owned: {} };
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return { coins: STARTING_COINS, owned: {} };
    return { coins: parsed.coins, owned: parsed.owned };
  } catch {
    return { coins: STARTING_COINS, owned: {} };
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — in-memory state still works.
  }
}

export interface CollectionState extends PersistedState {
  openPack: () => CardDef | null;
}

export function createCollectionStore(): UseBoundStore<StoreApi<CollectionState>> {
  return create<CollectionState>((set, get) => ({
    ...loadInitialState(),
    openPack: () => {
      const { coins, owned } = get();
      if (coins < PACK_PRICE) return null;

      const card = CARDS[Math.floor(Math.random() * CARDS.length)];
      const nextOwned = { ...owned, [card.id]: (owned[card.id] ?? 0) + 1 };
      const nextCoins = coins - PACK_PRICE;

      set({ coins: nextCoins, owned: nextOwned });
      persist({ coins: nextCoins, owned: nextOwned });
      return card;
    },
  }));
}

export const useCollectionStore = createCollectionStore();
