import { motion } from "framer-motion";
import type { CardDef } from "../../data/cards";
import CardView from "../shared/CardView";

interface PackOpeningProps {
  card: CardDef;
  onContinue: () => void;
}

export default function PackOpening({ card, onContinue }: PackOpeningProps) {
  return (
    <div className="pack-opening">
      <motion.div
        className="pack-opening__reveal"
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <CardView card={card} />
      </motion.div>
      <button type="button" onClick={onContinue}>
        Continuer
      </button>
    </div>
  );
}
