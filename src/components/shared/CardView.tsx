import type { KeyboardEvent } from "react";
import type { CardDef } from "../../data/cards";

interface CardViewProps {
  card: CardDef;
  count?: number;
  onClick?: () => void;
}

export default function CardView({ card, count, onClick }: CardViewProps) {
  const interactiveProps = onClick
    ? {
        onClick,
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div className="card-view" {...interactiveProps}>
      <img src={card.image} alt={card.name} className="card-view__image" />
      {count !== undefined && count > 1 && (
        <span className="card-view__badge">×{count}</span>
      )}
    </div>
  );
}
