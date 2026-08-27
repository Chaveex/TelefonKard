export const ANOMALOUS_CARD_IDS: readonly string[] = ["3", "7", "12", "18"];

export function getSerialNumber(cardId: string): string {
  const padded = cardId.padStart(3, "0");
  if (!ANOMALOUS_CARD_IDS.includes(cardId)) return `DBP-${padded}-83`;
  return `DBP-${padded}X-8V`;
}
