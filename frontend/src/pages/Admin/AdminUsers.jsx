import { useEffect, useState } from "react";
import { FaUsers, FaUserShield, FaUserCheck } from "react-icons/fa";
import API from "../../services/api";
import {
  PasswordField,
  PasswordRequirements,
  passwordValid,
} from "../../components/PasswordField";
import { formatDateTime } from "../../utils/adminFormat";
const roles = { viewer: "Viewer", editor: "Editor", superadmin: "Super admin" };
const descriptions = {
  viewer:
    "View content, messages and analytics. Cannot change content or manage users.",
  editor:
    "Manage portfolio content and inbox messages. Cannot manage users or view the audit log.",
  superadmin:
    "Full workspace access, including user management and the audit log.",
};
const blank = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  role: "viewer",
};
export default function AdminUsers() {
  const [admins, setAdmins] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const allowed = localStorage.getItem("admin_role") === "superadmin";
  const ownEmail = localStorage.getItem("admin_email");
  const load = () => setRefresh((value) => value + 1);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    const timer = setTimeout(async () => {
      try {
        const { data } = await API.get("/admin/admins", {
          params: { page, search, role, status },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setAdmins(data.admins);
        setTotal(data.total);
        setSummary(data.summary);
      } catch (err) {
        if (!controller.signal.aborted)
          setLoadError(
            err.response?.data?.message ||
              "Unable to load users. Please retry.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [allowed, page, search, role, status, refresh]);
  const create = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!passwordValid(form.password))
      return setError(
        "Use at least 12 characters and no more than 72 UTF-8 bytes.",
      );
    if (form.password !== form.confirm)
      return setError("The passwords do not match.");
    setBusy(true);
    try {
      const { data } = await API.post("/admin/admins", {
        name: form.name,
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setPage(1);
      load();
      setForm(blank);
      setShowCreate(false);
      setNotice(`Account created for ${data.email}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    } finally {
      setBusy(false);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await API.put(`/admin/admins/${editing._id}`, {
        name: editing.name,
        role: editing.role,
        isActive: editing.isActive,
      });
      load();
      setEditing(null);
      setNotice(
        "Account updated. Any changed permissions invalidate existing sessions.",
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update account.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (admin) => {
    if (
      !window.confirm(
        `Permanently delete ${admin.email}? They will lose access to this workspace.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await API.delete(`/admin/admins/${admin._id}`);
      load();
      setNotice(`Account removed: ${admin.email}.`);
      if (editing?._id === admin._id) setEditing(null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete account.");
    } finally {
      setBusy(false);
    }
  };
  const filtered = admins;
  const pages = Math.max(1, Math.ceil(total / 10));
  const currentPage = page;
  if (!allowed)
    return (
      <div className="cms-panel cms-empty">
        <h1>Super admin access required</h1>
        <p>Only super administrators can manage workspace accounts.</p>
      </div>
    );
  return (
    <div className="admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Administration / People</p>
          <h1>The right access, for everyone.</h1>
          <p className="admin-page-copy">
            Manage the people who help keep your portfolio up to date.
          </p>
        </div>
        <div className="cms-actions">
          <button
            className="cms-button"
            disabled={busy || loading}
            onClick={load}
          >
            Refresh
          </button>
          <button
            className="cms-button is-primary"
            disabled={busy}
            onClick={() => {
              setShowCreate(!showCreate);
              setEditing(null);
              setForm(blank);
            }}
          >
            + Add user
          </button>
        </div>
      </div>
      <div className="admin-stat-grid">
        {[
          ["Workspace members", summary?.members, FaUsers],
          ["Active accounts", summary?.active, FaUserCheck],
          ["Super administrators", summary?.superadmins, FaUserShield],
        ].map(([label, count, Icon]) => (
          <div className="admin-stat-card" key={label}>
            <span className="admin-stat-icon">
              <Icon />
            </span>
            <span className="admin-stat-label">{label}</span>
            <strong>{loading ? "…" : (count ?? "—")}</strong>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="admin-form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-form-status">
          {notice}
        </p>
      )}
      {showCreate && (
        <form onSubmit={create} className="cms-panel cms-writing">
          <div className="cms-panel-heading">
            <h2>Create a workspace account</h2>
            <button
              type="button"
              className="cms-button"
              disabled={busy}
              onClick={() => {
                setShowCreate(false);
                setForm(blank);
              }}
            >
              Cancel
            </button>
          </div>
          <fieldset disabled={busy} className="admin-form-grid">
            <label className="admin-field">
              <span>Display name</span>
              <input
                required
                className="admin-input"
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="admin-field">
              <span>Email address</span>
              <input
                required
                type="email"
                className="admin-input"
                maxLength={254}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="off"
              />
            </label>
            <PasswordField
              label="Initial password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <PasswordField
              label="Confirm initial password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
            <label className="admin-field">
              <span>Role</span>
              <select
                className="admin-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {Object.entries(roles).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="cms-muted">{descriptions[form.role]}</p>
          </fieldset>
          <PasswordRequirements value={form.password} />
          <p className="cms-muted">
            An active account is created immediately. No invitation email is
            sent.
          </p>
          <button className="cms-button is-primary" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      )}
      {editing && (
        <form className="cms-panel cms-writing" onSubmit={save}>
          <div className="cms-panel-heading">
            <h2>Manage {editing.email}</h2>
            <button
              type="button"
              className="cms-button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Display name</span>
              <input
                required
                maxLength={100}
                className="admin-input"
                disabled={busy}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              <span>Role</span>
              <select
                className="admin-input"
                value={editing.role}
                disabled={busy}
                onChange={(e) =>
                  setEditing({ ...editing, role: e.target.value })
                }
              >
                {Object.entries(roles).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Account access</span>
              <select
                className="admin-input"
                value={String(editing.isActive)}
                disabled={busy}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    isActive: e.target.value === "true",
                  })
                }
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </label>
          </div>
          <p className="cms-muted">
            {descriptions[editing.role]} Changing role or access signs this user
            out of existing sessions.
          </p>
          <button className="cms-button is-primary" disabled={busy}>
            {busy ? "Saving…" : "Save permissions"}
          </button>
        </form>
      )}
      <div className="cms-toolbar">
        <input
          className="admin-input cms-search"
          type="search"
          aria-label="Search users"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="cms-actions">
          <select
            className="admin-input cms-select"
            aria-label="Filter users by role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {Object.entries(roles).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="admin-input cms-select"
            aria-label="Filter users by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="cms-empty" role="status">
          Loading workspace members…
        </div>
      ) : loadError ? (
        <div className="cms-panel">
          <p className="admin-form-error" role="alert">
            {loadError}
          </p>
          <button className="cms-button" onClick={load}>
            Retry loading users
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="cms-panel cms-empty">
          <h2>No users found</h2>
          <p>Try another search or adjust the filters.</p>
        </div>
      ) : (
        <div className="cms-panel cms-table-wrap">
          <table className="cms-table cms-users-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role & status</th>
                <th>Last sign in</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a._id}>
                  <td>
                    <div className="cms-member">
                      <span className="cms-avatar">
                        {(a.name || a.email).slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>
                          {a.name || "Admin"}{" "}
                          {a.email === ownEmail && (
                            <span className="cms-badge">You</span>
                          )}
                        </strong>
                        <p>{a.email}</p>
                        <small>Joined {formatDateTime(a.createdAt)}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cms-badge">{roles[a.role] || a.role}</span>
                    <p className="cms-muted">
                      {a.isActive ? "● Active" : "○ Disabled"}
                    </p>
                  </td>
                  <td>
                    {a.lastLoginAt
                      ? formatDateTime(a.lastLoginAt)
                      : "Not recorded"}
                  </td>
                  <td>
                    <div className="cms-actions">
                      <button
                        className="cms-button"
                        disabled={busy || a.email === ownEmail}
                        onClick={() => {
                          setEditing({ ...a });
                          setShowCreate(false);
                        }}
                      >
                        Manage
                      </button>
                      <button
                        className="cms-button is-danger"
                        disabled={
                          busy ||
                          a.email === ownEmail ||
                          a.role === "superadmin"
                        }
                        onClick={() => remove(a)}
                      >
                        Delete
                      </button>
                    </div>
                    {a.email === ownEmail && (
                      <small className="cms-muted">
                        Your own access is protected.
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="cms-pagination">
        <button
          className="cms-button"
          disabled={loading || currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          ← Previous
        </button>
        <span>
          {total} matching members · Page {currentPage} of {pages}
        </span>
        <button
          className="cms-button"
          disabled={loading || currentPage === pages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next →
        </button>
      </div>
      <div className="cms-role-guide">
        {Object.entries(roles).map(([key, label]) => (
          <div className="cms-panel" key={key}>
            <span className="cms-badge">{label}</span>
            <p className="cms-muted">{descriptions[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
