import type { CardDef } from "../../data/cards";
import { PACK_PRICE, useCollectionStore } from "../../state/collectionStore";

interface ShopScreenProps {
  onPackOpened: (card: CardDef) => void;
}

export default function ShopScreen({ onPackOpened }: ShopScreenProps) {
  const coins = useCollectionStore((state) => state.coins);
  const openPack = useCollectionStore((state) => state.openPack);

  const handleOpenPack = () => {
    const drawn = openPack();
    if (drawn) onPackOpened(drawn);
  };

  return (
    <div className="shop-screen">
      <p className="shop-screen__coins">Solde : {coins} pièces</p>
      <button
        type="button"
        onClick={handleOpenPack}
        disabled={coins < PACK_PRICE}
      >
        Ouvrir un pack ({PACK_PRICE})
      </button>
    </div>
  );
}
