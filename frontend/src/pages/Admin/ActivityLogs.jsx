import { useEffect, useState } from "react";
import API from "../../services/api";
import { formatDateTime, humanize } from "../../utils/adminFormat";

export default function ActivityLogs() {
  const [result, setResult] = useState({ logs: [], total: 0, pageSize: 25 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("timeline");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const params = { page, search, category };
        if (date) {
          const from = new Date(`${date}T00:00:00`);
          const to = new Date(from);
          to.setDate(to.getDate() + 1);
          params.from = from.toISOString();
          params.to = to.toISOString();
        }
        const { data } = await API.get("/admin/logs", {
          params,
          signal: controller.signal,
        });
        setResult(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err.response?.data?.message ||
              "Unable to load activity. Please retry.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, category, date, refresh]);
  const actor = (log) =>
    log.email || log.adminId?.email || "Unknown administrator";
  const details = (log) => (
    <details className="cms-log-details">
      <summary>Event details</summary>
      <dl>
        <dt>Event ID</dt>
        <dd>{log._id}</dd>
        <dt>Resource ID</dt>
        <dd>{log.entityId || "Not recorded"}</dd>
        <dt>IP address</dt>
        <dd>{log.ip || "Not recorded"}</dd>
        <dt>Browser</dt>
        <dd>{log.userAgent || "Not recorded"}</dd>
      </dl>
    </details>
  );
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <div className="admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Administration / Audit trail</p>
          <h1>Activity log</h1>
          <p className="admin-page-copy">
            A clear record of who changed what, and when.
          </p>
        </div>
        <button
          className="cms-button"
          disabled={loading}
          onClick={() => setRefresh((n) => n + 1)}
        >
          Refresh activity
        </button>
      </div>
      <div className="cms-panel cms-log-filters">
        <label className="admin-field">
          <span>Search history</span>
          <input
            className="admin-input"
            type="search"
            placeholder="Admin, action, resource or IP…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="admin-field">
          <span>Activity type</span>
          <select
            className="admin-input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All activities</option>
            <option value="create">Created content</option>
            <option value="update">Updated content</option>
            <option value="delete">Deleted content</option>
            <option value="login">Account & sign in</option>
            <option value="inbox">Inbox activity</option>
          </select>
        </label>
        <label className="admin-field">
          <span>Date · your local time</span>
          <input
            className="admin-input"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          className="cms-button"
          onClick={() => {
            setSearch("");
            setDate("");
            setCategory("");
            setPage(1);
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="cms-toolbar">
        <p className="cms-muted">
          {loading
            ? "Loading history…"
            : `${result.total} matching events · newest first`}
        </p>
        <div className="cms-tabs">
          {["timeline", "table"].map((mode) => (
            <button
              key={mode}
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
            >
              {humanize(mode)}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="cms-panel">
          <p className="admin-form-error" role="alert">
            {error}
          </p>
          <button
            className="cms-button"
            onClick={() => setRefresh((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="cms-empty" role="status">
          Loading activity…
        </div>
      ) : !result.logs.length ? (
        <div className="cms-panel cms-empty">
          <h2>No activity found</h2>
          <p>Try another date or reset the filters.</p>
        </div>
      ) : view === "timeline" ? (
        <div className="cms-timeline">
          {result.logs.map((log) => (
            <article className="cms-log-event" key={log._id}>
              <span
                className={`cms-event-dot ${/DELETE|FAIL/.test(log.action) ? "is-warning" : ""}`}
              />
              <div className="cms-panel">
                <div className="cms-panel-heading">
                  <span className="cms-badge">
                    {humanize(log.entity || "Account")}
                  </span>
                  <time dateTime={log.createdAt}>
                    {formatDateTime(log.createdAt)}
                  </time>
                </div>
                <h2>{humanize(log.action)}</h2>
                <p className="cms-muted">{actor(log)}</p>
                {details(log)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="cms-panel cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Administrator</th>
                <th>Resource</th>
                <th>Date & time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.logs.map((log) => (
                <tr key={log._id}>
                  <td>{humanize(log.action)}</td>
                  <td>{actor(log)}</td>
                  <td>{humanize(log.entity || "Account")}</td>
                  <td>
                    <time dateTime={log.createdAt}>
                      {formatDateTime(log.createdAt)}
                    </time>
                  </td>
                  <td>{details(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="cms-pagination">
        <button
          className="cms-button"
          disabled={loading || page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className="cms-button"
          disabled={loading || page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
