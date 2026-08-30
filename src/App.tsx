import { useState } from "react";
import type { CardDef } from "./data/cards";
import CollectionGrid from "./components/rfa/CollectionGrid";
import ShopScreen from "./components/rfa/ShopScreen";
import PackOpening from "./components/rfa/PackOpening";
import InspectionQueue from "./components/rda/InspectionQueue";
import WarningBanner from "./components/rda/WarningBanner";
import ArrestScreen from "./components/rda/ArrestScreen";
import { useCollectionStore } from "./state/collectionStore";
import {
  ARREST_THRESHOLD,
  WARNING_THRESHOLD,
  useSuspicionStore,
} from "./state/suspicionStore";

type Tab = "collection" | "shop" | "inspection";

export default function App() {
  const [tab, setTab] = useState<Tab>("collection");
  const [revealedCard, setRevealedCard] = useState<CardDef | null>(null);
  const suspicion = useSuspicionStore((state) => state.suspicion);
  const resetSuspicion = useSuspicionStore((state) => state.resetSuspicion);
  const resetCollection = useCollectionStore((state) => state.resetCollection);

  if (suspicion >= ARREST_THRESHOLD) {
    return (
      <ArrestScreen
        onNewGame={() => {
          resetCollection();
          resetSuspicion();
        }}
      />
    );
  }

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
      {suspicion >= WARNING_THRESHOLD && <WarningBanner />}
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
