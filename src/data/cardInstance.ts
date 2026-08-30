export interface CardInstance {
  cardId: string;
  instanceId: string;
}

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
