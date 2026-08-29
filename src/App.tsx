import { useState } from "react";
import type { CardDef } from "./data/cards";
import CollectionGrid from "./components/rfa/CollectionGrid";
import ShopScreen from "./components/rfa/ShopScreen";
import PackOpening from "./components/rfa/PackOpening";
import InspectionQueue from "./components/rda/InspectionQueue";

type Tab = "collection" | "shop" | "inspection";

export default function App() {
  const [tab, setTab] = useState<Tab>("collection");
  const [revealedCard, setRevealedCard] = useState<CardDef | null>(null);

  if (revealedCard) {
    return (
      <PackOpening
        card={revealedCard}
        onContinue={() => setRevealedCard(null)}
      />
    );
  }

  return (
    <div className="app">
      <nav className="app__tabs">
        <button
          type="button"
          onClick={() => setTab("collection")}
          disabled={tab === "collection"}
        >
          Collection
        </button>
        <button
          type="button"
          onClick={() => setTab("shop")}
          disabled={tab === "shop"}
        >
          Boutique
        </button>
        <button
          type="button"
          onClick={() => setTab("inspection")}
          disabled={tab === "inspection"}
        >
          Inspection (proto)
        </button>
      </nav>
      {tab === "collection" && <CollectionGrid />}
      {tab === "shop" && <ShopScreen onPackOpened={setRevealedCard} />}
      {tab === "inspection" && <InspectionQueue />}
    </div>
  );
}
