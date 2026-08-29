import { useState, type MouseEvent } from "react";
import type { CardDef } from "../../data/cards";
import { getSerialNumber } from "../../data/messages";

interface CardInspectorProps {
  card: CardDef;
}

export default function CardInspector({ card }: CardInspectorProps) {
  const [origin, setOrigin] = useState("50% 50%");

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="card-inspector">
      <div
        className="card-inspector__zoom"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setOrigin("50% 50%")}
      >
        <img
          src={card.image}
          alt={card.name}
          className="card-inspector__image"
          style={{ transformOrigin: origin }}
        />
      </div>
      <p className="card-inspector__serial">{getSerialNumber(card.id)}</p>
    </div>
  );
}
