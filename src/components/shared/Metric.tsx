export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="metric-pill">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}
