import { useEffect, useState } from "react";
import type { CardDef } from "../../data/cards";
import {
  ROUND_SECONDS,
  SUSPICION_PENALTY,
  generateQueue,
  isCompromising,
} from "../../data/inspection";
import { useCollectionStore } from "../../state/collectionStore";
import { useSuspicionStore } from "../../state/suspicionStore";
import CardInspector from "./CardInspector";
import SuspicionMeter from "./SuspicionMeter";

export default function InspectionQueue() {
  const owned = useCollectionStore((state) => state.owned);
  const destroyCard = useCollectionStore((state) => state.destroyCard);
  const suspicion = useSuspicionStore((state) => state.suspicion);
  const addSuspicion = useSuspicionStore((state) => state.addSuspicion);

  const [queue, setQueue] = useState<CardDef[]>(() => generateQueue(owned));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [missedAnomalies, setMissedAnomalies] = useState(0);
  const [roundOver, setRoundOver] = useState(false);

  useEffect(() => {
    if (roundOver || queue.length === 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [roundOver, queue.length]);

  useEffect(() => {
    if (secondsLeft === 0 && !roundOver && queue.length > 0) {
      setRoundOver(true);
    }
  }, [secondsLeft, roundOver, queue.length]);

  const startNewRound = () => {
    setQueue(generateQueue(owned));
    setCurrentIndex(0);
    setSecondsLeft(ROUND_SECONDS);
    setMissedAnomalies(0);
    setRoundOver(false);
  };

  const handleDecision = (action: "keep" | "hide" | "destroy") => {
    const card = queue[currentIndex];
    const compromising = isCompromising(card.id);

    if (action === "keep" && compromising) {
      addSuspicion(SUSPICION_PENALTY);
      setMissedAnomalies((prev) => prev + 1);
    }
    if (action === "destroy") {
      destroyCard(card.id);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setRoundOver(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="rda-theme inspection-queue">
        <p className="inspection-queue__summary">
          Rien à inspecter, ouvre d'abord des packs !
        </p>
      </div>
    );
  }

  if (roundOver) {
    const anomalousInQueue = queue.filter((card) =>
      isCompromising(card.id),
    ).length;
    return (
      <div className="rda-theme inspection-queue">
        <p className="inspection-queue__summary">
          Contrôle terminé. Suspicion actuelle : {suspicion}%.
          <br />
          Cartes compromettantes ratées : {missedAnomalies}/
          {anomalousInQueue}.
        </p>
        <button type="button" onClick={startNewRound}>
          Nouvelle manche
        </button>
      </div>
    );
  }

  const currentCard = queue[currentIndex];

  return (
    <div className="rda-theme inspection-queue">
      <p className="inspection-queue__timer">
        Temps restant : {secondsLeft}s
      </p>
      <SuspicionMeter value={suspicion} />
      <CardInspector card={currentCard} />
      <div className="inspection-queue__actions">
        <button type="button" onClick={() => handleDecision("keep")}>
          Garder visible
        </button>
        <button type="button" onClick={() => handleDecision("hide")}>
          Cacher
        </button>
        <button type="button" onClick={() => handleDecision("destroy")}>
          Détruire
        </button>
      </div>
    </div>
  );
}
