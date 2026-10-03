export default function LoadingSkeleton({
  label = "Loading page",
  compact = false,
}) {
  return (
    <div
      className={`loading-skeleton devops-loader ${compact ? "is-compact" : "content-width"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="devops-terminal">
        <div className="devops-terminal-bar" aria-hidden="true">
          <span className="devops-window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>portfolio / runtime</span>
          <span className="devops-terminal-mark">&gt;_</span>
        </div>
        <div className="devops-terminal-body">
          <div className="devops-command" aria-hidden="true">
            <span>❯</span> portfolio load <span className="devops-cursor" />
          </div>
          <span className="loader-caption">
            <span className="devops-status-light" aria-hidden="true" />
            {label}…
          </span>
          <div className="devops-pipeline" aria-hidden="true">
            {[
              ["01", "assets"],
              ["02", "modules"],
              ["03", "interface"],
            ].map(([step, title]) => (
              <div className="devops-stage" key={step}>
                <span>{step}</span>
                <span>{title}</span>
              </div>
            ))}
          </div>
          <div className="devops-load-track" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
