import { useState } from "react";
import { CARDS, type CardDef } from "../../data/cards";
import { useCollectionStore } from "../../state/collectionStore";
import CardView from "../shared/CardView";

export default function CollectionGrid() {
  const owned = useCollectionStore((state) => state.owned);
  const ownedCards = CARDS.filter((card) => (owned[card.id] ?? 0) > 0);
  const [selectedCard, setSelectedCard] = useState<CardDef | null>(null);

  if (ownedCards.length === 0) {
    return (
      <p className="collection-grid__empty">
        Aucune carte encore, ouvre un pack !
      </p>
    );
  }

  return (
    <div className="collection-grid">
      {ownedCards.map((card) => (
        <CardView
          key={card.id}
          card={card}
          count={owned[card.id]}
          onClick={() => setSelectedCard(card)}
        />
      ))}
      {selectedCard && (
        <div
          className="card-detail-overlay"
          onClick={() => setSelectedCard(null)}
        >
          <div className="card-detail-overlay__backdrop" />
          <div
            className="card-detail-overlay__content"
            onClick={(event) => event.stopPropagation()}
          >
            <CardView card={selectedCard} />
            <button
              type="button"
              className="card-detail-overlay__close"
              onClick={() => setSelectedCard(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
