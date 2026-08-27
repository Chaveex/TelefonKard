import { CARDS } from "../../data/cards";
import { useCollectionStore } from "../../state/collectionStore";
import CardView from "../shared/CardView";

export default function CollectionGrid() {
  const owned = useCollectionStore((state) => state.owned);
  const ownedCards = CARDS.filter((card) => (owned[card.id] ?? 0) > 0);

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
        <CardView key={card.id} card={card} count={owned[card.id]} />
      ))}
    </div>
  );
}
