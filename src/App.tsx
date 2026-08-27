import ShopScreen from "./components/rfa/ShopScreen";

export default function App() {
  return <ShopScreen onPackOpened={(card) => console.log("drawn:", card)} />;
}
