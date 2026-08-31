import { ANOMALOUS_CARD_IDS, HIDDEN_LETTERS } from "./messages";

export interface CardInstance {
  cardId: string;
  instanceId: string;
  markedLetter?: string;
}

export const MARK_CHANCE = 0.3;

export function generateInstanceId(cardId: string): string {
  return `${cardId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeOwned(instances: CardInstance[]): Record<string, number> {
  const owned: Record<string, number> = {};
  for (const instance of instances) {
    owned[instance.cardId] = (owned[instance.cardId] ?? 0) + 1;
  }
  return owned;
}

export function createInstance(cardId: string): CardInstance {
  const instance: CardInstance = {
    cardId,
    instanceId: generateInstanceId(cardId),
  };

  if (ANOMALOUS_CARD_IDS.includes(cardId) && Math.random() < MARK_CHANCE) {
    instance.markedLetter = HIDDEN_LETTERS[cardId];
  }

  return instance;
}

export function revealMarkedLetter(
  instances: CardInstance[],
  cardId: string,
): string | null {
  const marked = instances.find(
    (instance) => instance.cardId === cardId && instance.markedLetter,
  );
  return marked?.markedLetter ?? null;
}
