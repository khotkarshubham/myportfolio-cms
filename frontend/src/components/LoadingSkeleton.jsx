export default function LoadingSkeleton({
  label = "Loading page",
  compact = false,
}) {
  return (
    <div
      className={`loading-skeleton ${compact ? "is-compact" : "content-width"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="loader-caption">
        <span className="loader-spinner" aria-hidden="true" />
        {label}…
      </span>
      <div className="skeleton-line" aria-hidden="true" />
      <div className="skeleton-cards" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} />
        ))}
      </div>
    </div>
  );
}
