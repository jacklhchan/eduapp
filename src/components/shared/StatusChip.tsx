import { Icon } from './Icon';

export function StatusChip({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`status-chip ${tone}`}>
      {tone === 'ready' ? <Icon name="sync" /> : <i />}
      {label}
    </span>
  );
}
