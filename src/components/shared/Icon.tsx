export function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={filled ? 'material-symbols-outlined icon-filled' : 'material-symbols-outlined'}
    >
      {name}
    </span>
  );
}
