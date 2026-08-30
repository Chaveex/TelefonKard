import { create, type StoreApi, type UseBoundStore } from "zustand";
import { CARDS, type CardDef } from "../data/cards";
import {
  computeOwned,
  generateInstanceId,
  type CardInstance,
} from "../data/cardInstance";

const STORAGE_KEY = "telefonkarte-collection";
export const PACK_PRICE = 20;
const STARTING_COINS = 100;

interface PersistedState {
  coins: number;
  instances: CardInstance[];
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.coins === "number" && Array.isArray(v.instances);
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { coins: STARTING_COINS, instances: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return { coins: STARTING_COINS, instances: [] };
    return { coins: parsed.coins, instances: parsed.instances };
  } catch {
    return { coins: STARTING_COINS, instances: [] };
  }
}

function persist(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — in-memory state still works.
  }
}

export interface CollectionState {
  coins: number;
  instances: CardInstance[];
  owned: Record<string, number>;
  openPack: () => CardDef | null;
  destroyCard: (cardId: string) => void;
  resetCollection: () => void;
}

export function createCollectionStore(): UseBoundStore<StoreApi<CollectionState>> {
  const initial = loadInitialState();

  return create<CollectionState>((set, get) => ({
    coins: initial.coins,
    instances: initial.instances,
    owned: computeOwned(initial.instances),
    openPack: () => {
      const { coins, instances } = get();
      if (coins < PACK_PRICE) return null;

      const card = CARDS[Math.floor(Math.random() * CARDS.length)];
      const nextInstances = [
        ...instances,
        { cardId: card.id, instanceId: generateInstanceId(card.id) },
      ];
      const nextCoins = coins - PACK_PRICE;

      set({
        coins: nextCoins,
        instances: nextInstances,
        owned: computeOwned(nextInstances),
      });
      persist({ coins: nextCoins, instances: nextInstances });
      return card;
    },
    destroyCard: (cardId: string) => {
      const { coins, instances } = get();
      const index = instances.findIndex(
        (instance) => instance.cardId === cardId,
      );
      if (index === -1) return;

      const nextInstances = [
        ...instances.slice(0, index),
        ...instances.slice(index + 1),
      ];

      set({ instances: nextInstances, owned: computeOwned(nextInstances) });
      persist({ coins, instances: nextInstances });
    },
    resetCollection: () => {
      const next: PersistedState = { coins: STARTING_COINS, instances: [] };
      set({ ...next, owned: {} });
      persist(next);
    },
  }));
}

export const useCollectionStore = createCollectionStore();
