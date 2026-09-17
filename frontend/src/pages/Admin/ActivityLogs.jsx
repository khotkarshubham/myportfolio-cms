import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("timeline");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    let mounted = true;

    const loadLogs = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/logs");

        if (!mounted) return;

        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        setLogs(data);
      } catch (err) {
        console.error("Failed to load activity logs:", err);

        if (mounted) {
          setError(
            err?.response?.data?.message ||
              "Unable to load activity logs. Please try again."
          );
          setLogs([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- HELPERS ---------------- */

  const getAdminEmail = (log) => {
    return (
      log?.adminId?.email ||
      log?.email ||
      "Unknown admin"
    );
  };

  const getAction = (log) => {
    return typeof log?.action === "string" ? log.action : "Unknown action";
  };

  const getEntity = (log) => {
    return typeof log?.entity === "string" && log.entity.trim()
      ? log.entity
      : "—";
  };

  const getCreatedAt = (log) => {
    const value = log?.createdAt;
    const dateValue = value ? new Date(value) : null;

    return dateValue && !Number.isNaN(dateValue.getTime())
      ? dateValue
      : null;
  };

  const formatDateTime = (log) => {
    const dateValue = getCreatedAt(log);

    return dateValue
      ? dateValue.toLocaleString()
      : "Unknown time";
  };

  /* ---------------- FILTER ---------------- */

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const action = getAction(log).toLowerCase();
      const entity = getEntity(log).toLowerCase();
      const adminEmail = getAdminEmail(log).toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        action.includes(normalizedSearch) ||
        entity.includes(normalizedSearch) ||
        adminEmail.includes(normalizedSearch);

      const createdAt = getCreatedAt(log);

      const matchesDate =
        !date ||
        (createdAt &&
          createdAt.toISOString().startsWith(date));

      return matchesSearch && matchesDate;
    });
  }, [logs, search, date]);

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div
        className="text-center text-gray-400 mt-10 animate-pulse"
        role="status"
        aria-live="polite"
      >
        Loading logs...
      </div>
    );
  }

  /* ---------------- ERROR ---------------- */

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl text-tech-accent font-bold">
          Activity Logs 📜
        </h2>

        <div
          className="bg-tech-card border border-red-500/40 rounded-xl p-5 text-red-300"
          role="alert"
        >
          {error}
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded bg-tech-accent text-black font-semibold hover:opacity-90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl text-tech-accent font-bold">
        Activity Logs 📜
      </h2>

      {/* ---------------- FILTER BAR ---------------- */}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* SEARCH */}

          <input
            type="search"
            placeholder="Search actions, entities, or admins..."
            aria-label="Search activity logs"
            className="w-full sm:max-w-md p-3 bg-tech-card rounded border border-transparent focus:border-tech-accent focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* DATE FILTER */}

          <input
            type="date"
            aria-label="Filter activity logs by date"
            className="p-3 bg-tech-card rounded border border-transparent focus:border-tech-accent focus:outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {search || date ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDate("");
              }}
              className="px-4 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* VIEW TOGGLE */}

        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            className={`px-4 py-2 rounded transition ${
              view === "table"
                ? "bg-tech-accent text-black"
                : "bg-tech-card text-gray-400 hover:text-white"
            }`}
          >
            Table
          </button>

          <button
            type="button"
            onClick={() => setView("timeline")}
            aria-pressed={view === "timeline"}
            className={`px-4 py-2 rounded transition ${
              view === "timeline"
                ? "bg-tech-accent text-black"
                : "bg-tech-card text-gray-400 hover:text-white"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* RESULT COUNT */}

      {filtered.length > 0 && (
        <p className="text-sm text-gray-500">
          Showing {filtered.length} of {logs.length} log
          {logs.length === 1 ? "" : "s"}
        </p>
      )}

      {/* ---------------- EMPTY STATE ---------------- */}

      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-10 bg-tech-card rounded-xl">
          {logs.length === 0
            ? "No activity logs found."
            : "No logs match your filters."}
        </div>
      )}

      {/* ================= TABLE VIEW ================= */}

      {view === "table" && filtered.length > 0 && (
        <div className="bg-tech-card rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-gray-300">
              <tr>
                <th className="p-3 text-left">Admin</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Time</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((log, index) => (
                <tr
                  key={log?._id || `${log?.createdAt || "log"}-${index}`}
                  className="border-t border-gray-700"
                >
                  <td className="p-3">
                    {getAdminEmail(log)}
                  </td>

                  <td className="p-3 text-tech-accent">
                    {getAction(log)}
                  </td>

                  <td className="p-3">
                    {getEntity(log)}
                  </td>

                  <td className="p-3 text-gray-400 whitespace-nowrap">
                    {formatDateTime(log)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TIMELINE VIEW ================= */}

      {view === "timeline" && filtered.length > 0 && (
        <div className="relative border-l border-gray-700 pl-4 space-y-6">
          {filtered.map((log, index) => (
            <div
              key={log?._id || `${log?.createdAt || "log"}-${index}`}
              className="relative"
            >
              {/* DOT */}

              <div
                className="
                  absolute -left-[9px] top-2
                  w-3 h-3 bg-tech-accent rounded-full
                  shadow
                "
                aria-hidden="true"
              />

              {/* CARD */}

              <div
                className="
                  bg-tech-card p-4 rounded-xl
                  border border-gray-700
                  hover:border-tech-accent
                  transition
                "
              >
                <p className="text-sm sm:text-base">
                  <b>{getAdminEmail(log)}</b>{" "}
                  performed{" "}
                  <span className="text-tech-accent font-semibold">
                    {getAction(log)}
                  </span>
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {getEntity(log)}
                </p>

                <p className="text-xs text-gray-500 mt-2">
                  {formatDateTime(log)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}