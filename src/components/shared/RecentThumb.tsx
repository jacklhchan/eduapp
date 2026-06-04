export function RecentThumb({ image, title, time }: { image: string; title: string; time: string }) {
  return (
    <div className="recent-thumb">
      <img src={image} alt={title} />
      <div>
        <strong>{title}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}
