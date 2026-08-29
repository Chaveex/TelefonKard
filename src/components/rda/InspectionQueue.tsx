import { useEffect, useState } from "react";
import type { CardDef } from "../../data/cards";
import {
  GUARANTEED_ANOMALOUS,
  ROUND_SECONDS,
  SUSPICION_PENALTY,
  generateQueue,
  isCompromising,
} from "../../data/inspection";
import CardInspector from "./CardInspector";
import SuspicionMeter from "./SuspicionMeter";

export default function InspectionQueue() {
  const [queue, setQueue] = useState<CardDef[]>(() => generateQueue());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suspicion, setSuspicion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [missedAnomalies, setMissedAnomalies] = useState(0);
  const [roundOver, setRoundOver] = useState(false);

  useEffect(() => {
    if (roundOver) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRoundOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roundOver]);

  const startNewRound = () => {
    setQueue(generateQueue());
    setCurrentIndex(0);
    setSuspicion(0);
    setSecondsLeft(ROUND_SECONDS);
    setMissedAnomalies(0);
    setRoundOver(false);
  };

  const handleDecision = (keepVisible: boolean) => {
    const card = queue[currentIndex];
    if (keepVisible && isCompromising(card.id)) {
      setSuspicion((prev) => Math.min(100, prev + SUSPICION_PENALTY));
      setMissedAnomalies((prev) => prev + 1);
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setRoundOver(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (roundOver) {
    return (
      <div className="rda-theme inspection-queue">
        <p className="inspection-queue__summary">
          Contrôle terminé. Suspicion finale : {suspicion}%.
          <br />
          Cartes compromettantes ratées : {missedAnomalies}/
          {GUARANTEED_ANOMALOUS}.
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
        <button type="button" onClick={() => handleDecision(true)}>
          Garder visible
        </button>
        <button type="button" onClick={() => handleDecision(false)}>
          Cacher
        </button>
      </div>
    </div>
  );
}
