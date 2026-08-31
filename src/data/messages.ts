export const ANOMALOUS_CARD_IDS: readonly string[] = ["3", "7", "12", "18"];

export function getSerialNumber(cardId: string): string {
  const padded = cardId.padStart(3, "0");
  if (!ANOMALOUS_CARD_IDS.includes(cardId)) return `DBP-${padded}-83`;
  return `DBP-${padded}X-8V`;
}

export const HIDDEN_LETTERS: Record<string, string> = {
  "3": "K",
  "7": "G",
  "12": "B",
  "18": "R",
};
