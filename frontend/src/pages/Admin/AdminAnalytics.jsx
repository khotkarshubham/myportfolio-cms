import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaChartLine, FaUsers, FaFileDownload, FaSignal } from "react-icons/fa";
import API from "../../services/api";
import { formatDateTime } from "../../utils/adminFormat";
const ranges = {
  7: "Last 7 days",
  30: "Last 30 days",
  90: "Last 90 days",
  all: "All time",
  custom: "Custom dates",
};
const number = (value) => (value ?? 0).toLocaleString();
const changeText = (current, previous) =>
  previous === 0
    ? current
      ? "New activity this period"
      : "No change from previous period"
    : `${current >= previous ? "+" : ""}${Math.round(((current - previous) / previous) * 100)}% vs previous period`;
const dayLabel = (value) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const countryLabel = (value) => {
  if (!value || value === "Unknown") return "Unknown location";
  try {
    return (
      new Intl.DisplayNames(undefined, { type: "region" }).of(value) || value
    );
  } catch {
    return value;
  }
};
function Rankings({ title, subtitle, rows, total, country = false }) {
  return (
    <section className="cms-panel">
      <div className="cms-panel-heading">
        <div>
          <h2>{title}</h2>
          <p className="cms-muted">{subtitle}</p>
        </div>
        <span className="cms-badge">Top 10</span>
      </div>
      {!rows.length ? (
        <div className="cms-empty">No visits recorded in this period.</div>
      ) : (
        <div className="cms-rankings">
          {rows.map((row, index) => (
            <div key={row._id} className="cms-ranking">
              <div>
                <span className="cms-rank-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>
                  {country ? countryLabel(row._id) : row._id || "/"}
                </strong>
                <span>
                  {number(row.count)}{" "}
                  <small>
                    {total ? ((row.count / total) * 100).toFixed(1) : "0"}%
                  </small>
                </span>
              </div>
              <div className="cms-rank-track">
                <span
                  style={{
                    width: `${total ? Math.min(100, (row.count / total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState("30");
  const [metric, setMetric] = useState("visits");
  const today = new Date().toISOString().slice(0, 10);
  const [appliedDates, setAppliedDates] = useState({
    from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to: today,
  });
  const [dateError, setDateError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const applyDates = (e) => {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const dates = { from: fields.get("from"), to: fields.get("to") };
    const days = (new Date(dates.to) - new Date(dates.from)) / 86400000 + 1;
    if (
      !dates.from ||
      !dates.to ||
      !Number.isFinite(days) ||
      days < 1 ||
      days > 366 ||
      dates.to > today
    ) {
      setDateError("Choose up to 366 days, ending today or earlier.");
      return;
    }
    setDateError("");
    setAppliedDates({ ...dates });
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true,
      controller;
    setLoading(true);
    setError("");
    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const { data } = await API.get("/admin/analytics", {
          params: { range, ...(range === "custom" ? appliedDates : {}) },
          signal: request.signal,
        });
        if (active && !request.signal.aborted) {
          setStats(data);
          setError("");
        }
      } catch (err) {
        if (active && !request.signal.aborted)
          setError(
            err.response?.data?.message ||
              "Unable to load analytics. Please retry.",
          );
      } finally {
        if (active && !request.signal.aborted) setLoading(false);
      }
    };
    load();
    const timer = autoRefresh
      ? setInterval(() => {
          if (document.visibilityState === "visible") load();
        }, 30000)
      : null;
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
    };
  }, [range, refresh, appliedDates, autoRefresh]);
  const data =
    stats?.range === range &&
    (range !== "custom" ||
      (stats.period?.from?.slice(0, 10) === appliedDates.from &&
        stats.period?.to?.slice(0, 10) === appliedDates.to))
      ? stats
      : null;
  const exportCsv = () => {
    if (!data) return;
    const csv = [
      "Date (UTC),Page visits,Estimated visitors,Resume clicks",
      ...data.chart.map(
        (row) =>
          `${row._id},${row.visits},${row.visitors || 0},${row.resumeClicks}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfolio-traffic-${data.chartDays}-days-${data.generatedAt.slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const cards = data
    ? [
        [
          "Page visits",
          data.totalVisits,
          data.previous?.totalVisits,
          FaChartLine,
          "Every recorded public page visit",
        ],
        [
          "Estimated visitors",
          data.uniqueVisitors,
          data.previous?.uniqueVisitors,
          FaUsers,
          "Distinct anonymized IP addresses",
        ],
        [
          "Resume clicks",
          data.resumeClicks,
          data.previous?.resumeClicks,
          FaFileDownload,
          "Clicks on your resume link",
        ],
        [
          "Active in last 5 min",
          data.activeVisitors,
          null,
          FaSignal,
          "Visitors with a recent page visit",
        ],
      ]
    : [];
  const metricLabel =
    metric === "visits"
      ? "Page visits"
      : metric === "visitors"
        ? "Estimated visitors"
        : "Resume clicks";
  const chartTotal =
    data?.chart.reduce((sum, row) => sum + (row[metric] || 0), 0) || 0;
  const peak = data?.chart.reduce(
    (best, row) => (!best || row[metric] > best[metric] ? row : best),
    null,
  );
  return (
    <div className="admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Insights / Portfolio performance</p>
          <h1>Understand your audience.</h1>
          <p className="admin-page-copy">
            See how people discover your work and engage with it.
          </p>
        </div>
        <div className="cms-actions">
          <button
            className="cms-button"
            disabled={!data || loading}
            onClick={exportCsv}
          >
            Export daily CSV
          </button>
          <button
            className="cms-button"
            disabled={loading}
            onClick={() => setRefresh((n) => n + 1)}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      <div className="cms-toolbar">
        <div className="cms-tabs" aria-label="Analytics date range">
          {Object.entries(ranges).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="cms-muted">
          {data
            ? `Updated ${formatDateTime(data.generatedAt)}`
            : "Waiting for data"}{" "}
          · {autoRefresh ? "Refreshes every 30s" : "Auto-refresh paused"}
        </p>
        <button
          className="cms-button"
          aria-pressed={autoRefresh}
          onClick={() => setAutoRefresh((value) => !value)}
        >
          {autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
        </button>
      </div>
      {range === "custom" && (
        <form className="cms-panel cms-date-range" onSubmit={applyDates}>
          <label className="admin-field">
            <span>From · UTC</span>
            <input
              required
              type="date"
              className="admin-input"
              max={today}
              name="from"
              defaultValue={appliedDates.from}
            />
          </label>
          <label className="admin-field">
            <span>Through · UTC</span>
            <input
              required
              type="date"
              className="admin-input"
              max={today}
              name="to"
              defaultValue={appliedDates.to}
            />
          </label>
          <button className="cms-button is-primary">Apply dates</button>
          <p className="cms-muted">
            Up to 366 days. Both selected dates are included.
          </p>
          {dateError && (
            <p role="alert" className="admin-form-error">
              {dateError}
            </p>
          )}
        </form>
      )}
      {error && (
        <div className="cms-panel">
          <p className="admin-form-error" role="alert">
            {error} {data && "Showing the last successful result."}
          </p>
          <button
            className="cms-button"
            onClick={() => setRefresh((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {!data ? (
        <div className="cms-panel cms-empty" role="status">
          {loading
            ? "Loading portfolio insights…"
            : "Analytics are unavailable. Retry to load your data."}
        </div>
      ) : (
        <>
          <div className="admin-stat-grid cms-overview-stats cms-analytics-stats">
            {cards.map(([title, value, previous, Icon, note]) => (
              <div className="admin-stat-card" key={title}>
                <span className="admin-stat-icon">
                  <Icon />
                </span>
                <span className="admin-stat-label">{title}</span>
                <strong>{number(value)}</strong>
                <small className="cms-muted">{note}</small>
                {previous != null && (
                  <span className="cms-trend">
                    {changeText(value, previous)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <section className="cms-panel">
            <div className="cms-panel-heading">
              <div>
                <h2>Traffic over time</h2>
                <p className="cms-muted">
                  {range === "all"
                    ? "Daily chart shows the last 30 days; summary cards show all time."
                    : range === "custom"
                      ? `${appliedDates.from} to ${appliedDates.to}.`
                      : `${ranges[range]}, including today.`}{" "}
                  Dates are grouped in UTC.
                </p>
              </div>
              <div className="cms-tabs">
                <button
                  aria-pressed={metric === "visits"}
                  onClick={() => setMetric("visits")}
                >
                  Page visits
                </button>
                <button
                  aria-pressed={metric === "visitors"}
                  onClick={() => setMetric("visitors")}
                >
                  Visitors
                </button>
                <button
                  aria-pressed={metric === "resumeClicks"}
                  onClick={() => setMetric("resumeClicks")}
                >
                  Resume clicks
                </button>
              </div>
            </div>
            <div className="cms-chart-summary">
              <span>
                <strong>{number(chartTotal)}</strong> in chart period
              </span>
              <span>
                <strong>{(chartTotal / data.chartDays).toFixed(1)}</strong>{" "}
                daily average
              </span>
              <span>
                <strong>
                  {peak && peak[metric] ? dayLabel(peak._id) : "—"}
                </strong>{" "}
                busiest day
              </span>
            </div>
            <div
              className="cms-analytics-chart"
              role="img"
              aria-label={`${metricLabel} over ${data.chartDays} days. ${chartTotal} total. Daily values are available in the table below.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.chart}
                  margin={{ top: 15, right: 12, left: -18, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="analyticsFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--accent)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--accent)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--line)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="_id"
                    tickFormatter={dayLabel}
                    minTickGap={45}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={dayLabel}
                    contentStyle={{
                      background: "var(--page)",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      color: "var(--ink)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    name={metricLabel}
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    fill="url(#analyticsFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {!chartTotal && (
              <p className="cms-muted">
                No {metricLabel.toLowerCase()} recorded in this chart period
                yet.
              </p>
            )}
            <details className="cms-daily-details">
              <summary>View daily data</summary>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Page visits</th>
                      <th>Estimated visitors</th>
                      <th>Resume clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.chart.map((row) => (
                      <tr key={row._id}>
                        <td>{row._id}</td>
                        <td>{number(row.visits)}</td>
                        <td>{number(row.visitors)}</td>
                        <td>{number(row.resumeClicks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <div className="cms-dashboard-panels">
            <Rankings
              title="Top pages"
              subtitle="Most visited public pages"
              rows={data.topPages}
              total={data.totalVisits}
            />
            <Rankings
              title="Where visitors come from"
              subtitle="Approximate country based on IP location"
              rows={data.countries}
              total={data.totalVisits}
              country
            />
          </div>
          <p className="cms-muted">
            Daily visitor totals count returning visitors again on each day; the
            summary deduplicates across the whole period. Visitor counts are
            estimates: people sharing a network may count as one visitor. Active
            means a page visit in the last five minutes, not an open browser
            connection.{" "}
            {range !== "all" &&
              "Comparisons use the preceding period of the same duration."}
          </p>
        </>
      )}
    </div>
  );
}
