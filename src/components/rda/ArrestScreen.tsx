interface ArrestScreenProps {
  onNewGame: () => void;
}

export default function ArrestScreen({ onNewGame }: ArrestScreenProps) {
  return (
    <div className="rda-theme arrest-screen">
      <p className="arrest-screen__message">
        Arrestation. Ta collection a été confisquée par la Stasi.
      </p>
      <button type="button" onClick={onNewGame}>
        Nouvelle partie
      </button>
    </div>
  );
}
