import type { CardDef } from "../../data/cards";

interface CardViewProps {
  card: CardDef;
  count?: number;
}

export default function CardView({ card, count }: CardViewProps) {
  return (
    <div className="card-view">
      <img src={card.image} alt={card.name} className="card-view__image" />
      {count !== undefined && count > 1 && (
        <span className="card-view__badge">×{count}</span>
      )}
    </div>
  );
}
