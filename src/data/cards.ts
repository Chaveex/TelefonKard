export interface CardDef {
  id: string;
  image: string;
  name: string;
}

const CARD_COUNT = 20;

export const CARDS: CardDef[] = Array.from(
  { length: CARD_COUNT },
  (_, i) => {
    const id = String(i + 1);
    return { id, image: `/${id}.jpeg`, name: `Carte n°${id}` };
  },
);
