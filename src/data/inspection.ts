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

export function generateQueue(): CardDef[] {
  const anomalousPool = CARDS.filter((card) =>
    ANOMALOUS_CARD_IDS.includes(card.id),
  );
  const cleanPool = CARDS.filter(
    (card) => !ANOMALOUS_CARD_IDS.includes(card.id),
  );

  const anomalous = pickRandom(anomalousPool, GUARANTEED_ANOMALOUS);
  const clean = pickRandom(cleanPool, QUEUE_SIZE - GUARANTEED_ANOMALOUS);

  return shuffle([...anomalous, ...clean]);
}

export function isCompromising(cardId: string): boolean {
  return ANOMALOUS_CARD_IDS.includes(cardId);
}
