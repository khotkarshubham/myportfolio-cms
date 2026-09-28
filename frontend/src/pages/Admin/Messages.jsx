import { useEffect, useState } from "react";
import { FaInbox, FaSyncAlt, FaEnvelope, FaArchive } from "react-icons/fa";
import API from "../../services/api";
import { formatDateTime } from "../../utils/adminFormat";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("inbox");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canEdit = ["superadmin", "editor"].includes(
    localStorage.getItem("admin_role"),
  );
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/admin/contacts");
      setMessages(data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load messages. Please retry.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const update = async (message, changes) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await API.patch(
        `/admin/contacts/${message._id}`,
        changes,
      );
      setMessages((current) =>
        current.map((item) => (item._id === data._id ? data : item)),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Message could not be updated.");
    } finally {
      setBusy(false);
    }
  };
  const open = (message) => {
    setSelectedId(message._id);
    if (canEdit && !message.readAt) update(message, { read: true });
  };
  const remove = async (message) => {
    if (!window.confirm(`Permanently delete the message from ${message.name}?`))
      return;
    setBusy(true);
    setError("");
    try {
      await API.delete(`/admin/contacts/${message._id}`);
      setMessages((current) =>
        current.filter((item) => item._id !== message._id),
      );
      setSelectedId(null);
    } catch (err) {
      setError(err.response?.data?.message || "Message could not be deleted.");
    } finally {
      setBusy(false);
    }
  };
  const filtered = messages.filter(
    (m) =>
      (folder === "archive"
        ? m.archived
        : !m.archived && (folder !== "unread" || !m.readAt)) &&
      `${m.name} ${m.email} ${m.message}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const selected = messages.find((m) => m._id === selectedId);
  const unread = messages.filter((m) => !m.readAt && !m.archived).length;
  return (
    <div className="admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Conversations</p>
          <h1>Messages inbox</h1>
          <p className="admin-page-copy">
            Every opportunity starts with a conversation. {unread} unread.
          </p>
        </div>
        <button
          className="cms-button"
          onClick={load}
          disabled={loading || busy}
        >
          <FaSyncAlt /> Refresh
        </button>
      </div>
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="cms-toolbar">
        <div className="cms-tabs">
          {[
            ["inbox", "Inbox", FaInbox],
            ["unread", `Unread (${unread})`, FaEnvelope],
            ["archive", "Archived", FaArchive],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              aria-pressed={folder === key}
              onClick={() => {
                setFolder(key);
                setSelectedId(null);
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        <input
          className="admin-input cms-search"
          type="search"
          aria-label="Search messages"
          placeholder="Search name, email or message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="cms-inbox">
        <section
          className="cms-message-list"
          aria-label="Messages"
          aria-busy={loading}
        >
          <div className="cms-list-caption">
            {filtered.length} conversations <span>Newest first</span>
          </div>
          {loading ? (
            <div className="cms-empty" role="status">
              Loading messages…
            </div>
          ) : filtered.length === 0 ? (
            <div className="cms-empty">
              <FaInbox />
              <h2>
                {search ? "No matching messages" : "You're all caught up"}
              </h2>
              <p>
                {search
                  ? "Try a different search."
                  : "Messages from your contact form appear here."}
              </p>
            </div>
          ) : (
            filtered.map((m) => (
              <button
                disabled={busy}
                key={m._id}
                className={`cms-message-row ${selectedId === m._id ? "is-selected" : ""} ${!m.readAt ? "is-unread" : ""}`}
                onClick={() => open(m)}
              >
                <span className="cms-avatar">
                  {m.name?.slice(0, 1).toUpperCase()}
                </span>
                <span className="cms-message-summary">
                  <strong>
                    {m.name}{" "}
                    {!m.readAt && (
                      <span className="cms-unread-dot" aria-label="Unread" />
                    )}
                  </strong>
                  <small>{m.email}</small>
                  <span>{m.message}</span>
                  <time dateTime={m.createdAt}>
                    {formatDateTime(m.createdAt)}
                  </time>
                </span>
              </button>
            ))
          )}
        </section>
        <section className="cms-message-detail" aria-label="Selected message">
          {selected ? (
            <>
              <div className="cms-detail-heading">
                <span className="cms-avatar">
                  {selected.name?.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h2>{selected.name}</h2>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  <p>
                    <time dateTime={selected.createdAt}>
                      {formatDateTime(selected.createdAt)}
                    </time>{" "}
                    · Your local time
                  </p>
                </div>
              </div>
              <div className="cms-message-body">{selected.message}</div>
              <div className="cms-actions">
                <a
                  className="cms-button is-primary"
                  href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: Your portfolio message")}`}
                >
                  Reply by email ↗
                </a>
                {canEdit && (
                  <>
                    <button
                      className="cms-button"
                      disabled={busy}
                      onClick={() =>
                        update(selected, { read: !selected.readAt })
                      }
                    >
                      Mark {selected.readAt ? "unread" : "read"}
                    </button>
                    <button
                      className="cms-button"
                      disabled={busy}
                      onClick={() =>
                        update(selected, { archived: !selected.archived })
                      }
                    >
                      {selected.archived ? "Move to inbox" : "Archive"}
                    </button>
                    <button
                      className="cms-button is-danger"
                      disabled={busy}
                      onClick={() => remove(selected)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
              <p className="cms-muted">
                Reply opens your email app. Messages are not sent from this
                dashboard.
              </p>
            </>
          ) : (
            <div className="cms-empty cms-reader-empty">
              <FaEnvelope />
              <h2>A little space for connection</h2>
              <p>Select a conversation to read the full message.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
