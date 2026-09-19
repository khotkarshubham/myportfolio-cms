export default function SectionHeading({
  icon,
  title,
  accent,
  lede,
  aside,
  compact = true,
  headingId,
  className = "",
}) {
  return (
    <div
      className={["section-heading", compact ? "compact" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        {icon ? (
          <span className="section-index is-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <h2 id={headingId}>
          {title}
          {accent ? (
            <>
              {" "}
              <span className="section-heading-accent">{accent}</span>
            </>
          ) : null}
        </h2>
        {lede ? <p className="section-lede">{lede}</p> : null}
      </div>
      {aside}
    </div>
  );
}
