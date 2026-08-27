import { CARDS } from "./data/cards";
import PackOpening from "./components/rfa/PackOpening";

export default function App() {
  return (
    <PackOpening
      card={CARDS[0]}
      onContinue={() => console.log("continue clicked")}
    />
  );
}
