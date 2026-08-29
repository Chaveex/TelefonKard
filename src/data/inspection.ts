import { CARDS, type CardDef } from "./cards";
import { ANOMALOUS_CARD_IDS } from "./messages";

export const QUEUE_SIZE = 8;
export const GUARANTEED_ANOMALOUS = 2;
export const SUSPICION_PENALTY = 20;
export const ROUND_SECONDS = 60;

function pickRandom<T>(pool: T[], count: number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * remaining.length);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return picked;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQueue(owned: Record<string, number>): CardDef[] {
  const ownedCards = CARDS.filter((card) => (owned[card.id] ?? 0) > 0);
  const queueSize = Math.min(QUEUE_SIZE, ownedCards.length);

  const anomalousOwned = ownedCards.filter((card) => isCompromising(card.id));
  const cleanOwned = ownedCards.filter((card) => !isCompromising(card.id));

  const anomalousCount = Math.min(
    GUARANTEED_ANOMALOUS,
    anomalousOwned.length,
    queueSize,
  );
  const anomalousPicked = pickRandom(anomalousOwned, anomalousCount);
  const pickedIds = new Set(anomalousPicked.map((card) => card.id));

  const remainingCount = queueSize - anomalousCount;
  const cleanPicked = pickRandom(
    cleanOwned,
    Math.min(remainingCount, cleanOwned.length),
  );

  const stillNeeded = remainingCount - cleanPicked.length;
  const leftoverAnomalous = anomalousOwned.filter(
    (card) => !pickedIds.has(card.id),
  );
  const fillerPicked = pickRandom(leftoverAnomalous, stillNeeded);

  return shuffle([...anomalousPicked, ...cleanPicked, ...fillerPicked]);
}

export function isCompromising(cardId: string): boolean {
  return ANOMALOUS_CARD_IDS.includes(cardId);
}
