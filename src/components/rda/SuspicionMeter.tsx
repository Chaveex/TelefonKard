interface SuspicionMeterProps {
  value: number;
}

export default function SuspicionMeter({ value }: SuspicionMeterProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="suspicion-meter">
      <div className="suspicion-meter__label">Suspicion : {clamped}%</div>
      <div className="suspicion-meter__track">
        <div
          className="suspicion-meter__fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
