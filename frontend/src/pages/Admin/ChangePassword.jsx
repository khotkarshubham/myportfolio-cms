import { useEffect, useState } from "react";
import { FaShieldAlt, FaKey, FaLaptop } from "react-icons/fa";
import API from "../../services/api";
import {
  PasswordField,
  PasswordRequirements,
  passwordValid,
} from "../../components/PasswordField";
import { formatDateTime } from "../../utils/adminFormat";

export default function ChangePassword() {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [sessionPassword, setSessionPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState("");
  const [view, setView] = useState("password");
  const loadAccount = async () => {
    setAccountError("");
    try {
      const { data } = await API.get("/auth/me");
      setAccount(data);
    } catch {
      setAccountError("Account details could not be loaded.");
    }
  };
  useEffect(() => {
    loadAccount();
  }, []);
  const change = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setNotice("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!passwordValid(form.newPassword))
      return setError("Your new password must meet both requirements below.");
    if (form.newPassword !== form.confirm)
      return setError("The new passwords do not match.");
    if (form.oldPassword === form.newPassword)
      return setError("Choose a different password from your current one.");
    setBusy("password");
    try {
      const { data } = await API.post("/auth/change-password", {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      setForm({ oldPassword: "", newPassword: "", confirm: "" });
      setNotice(data.message || "Password updated successfully.");
      loadAccount();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change your password. Please try again.",
      );
    } finally {
      setBusy("");
    }
  };
  const revoke = async (e) => {
    e.preventDefault();
    setBusy("sessions");
    setError("");
    setNotice("");
    try {
      const { data } = await API.post("/auth/revoke-sessions", {
        currentPassword: sessionPassword,
      });
      setSessionPassword("");
      setNotice(data.message);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to sign out other sessions.",
      );
    } finally {
      setBusy("");
    }
  };
  const switchView = (next) => {
    setView(next);
    setError("");
    setNotice("");
    setSessionPassword("");
    setForm({ oldPassword: "", newPassword: "", confirm: "" });
  };
  return (
    <div className="admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Account / Security</p>
          <h1>Keep your workspace secure.</h1>
          <p className="admin-page-copy">
            Manage your password and where your account stays signed in.
          </p>
        </div>
        <span className="cms-security-icon">
          <FaShieldAlt />
        </span>
      </div>
      <div className="cms-security-layout">
        <section className="cms-panel cms-writing">
          <div className="cms-tabs" aria-label="Security settings">
            <button
              disabled={!!busy}
              aria-pressed={view === "password"}
              onClick={() => switchView("password")}
            >
              <FaKey /> Password
            </button>
            <button
              disabled={!!busy}
              aria-pressed={view === "sessions"}
              onClick={() => switchView("sessions")}
            >
              <FaLaptop /> Sessions
            </button>
          </div>
          {error && (
            <p className="admin-form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="admin-form-status" role="status">
              {notice}
            </p>
          )}
          {view === "password" ? (
            <form onSubmit={submit} className="cms-writing">
              <div>
                <h2 className="cms-form-title">Change password</h2>
                <p className="cms-muted">
                  Choose a unique passphrase you don't use anywhere else.
                </p>
              </div>
              <PasswordField
                label="Current password"
                value={form.oldPassword}
                onChange={change("oldPassword")}
                autoComplete="current-password"
                disabled={!!busy}
              />
              <PasswordField
                label="New password"
                value={form.newPassword}
                onChange={change("newPassword")}
                disabled={!!busy}
              />
              <PasswordRequirements value={form.newPassword} />
              <PasswordField
                label="Confirm new password"
                value={form.confirm}
                onChange={change("confirm")}
                disabled={!!busy}
              />
              {form.confirm && (
                <p
                  className={
                    form.confirm === form.newPassword
                      ? "cms-muted"
                      : "admin-form-error"
                  }
                  aria-live="polite"
                >
                  {form.confirm === form.newPassword
                    ? "✓ Passwords match"
                    : "Passwords do not match yet"}
                </p>
              )}
              <button className="cms-button is-primary" disabled={!!busy}>
                {busy ? "Updating password…" : "Update password"}
              </button>
              <p className="cms-muted">
                Your current session stays signed in. Other sessions end on
                their next API request.
              </p>
            </form>
          ) : (
            <form onSubmit={revoke} className="cms-writing">
              <div className="cms-session-card">
                <span className="cms-security-icon">
                  <FaLaptop />
                </span>
                <div>
                  <h2 className="cms-form-title">This browser session</h2>
                  <span className="cms-badge">Current session</span>
                </div>
              </div>
              <p className="cms-muted">
                Used a shared computer? Sign out all other sessions without
                changing your password. Confirm your current password to
                continue.
              </p>
              <PasswordField
                label="Confirm current password"
                autoComplete="current-password"
                value={sessionPassword}
                onChange={(e) => setSessionPassword(e.target.value)}
                disabled={!!busy}
              />
              <button className="cms-button is-primary" disabled={!!busy}>
                {busy
                  ? "Signing out other sessions…"
                  : "Sign out other sessions"}
              </button>
              <p className="cms-muted">
                Other sessions lose access on their next request. This does not
                show a list of devices or browser locations.
              </p>
            </form>
          )}
        </section>
        <aside className="cms-panel cms-security-guide">
          <span className="cms-badge">Your account</span>
          <h2>{account?.name || "Workspace account"}</h2>
          <p>{account?.email || localStorage.getItem("admin_email")}</p>
          {accountError ? (
            <div>
              <p role="alert">{accountError}</p>
              <button className="cms-button" onClick={loadAccount}>
                Retry account details
              </button>
            </div>
          ) : (
            <dl className="cms-account-facts">
              <div>
                <dt>Access level</dt>
                <dd>{account?.role || "Loading…"}</dd>
              </div>
              <div>
                <dt>Last sign in</dt>
                <dd>
                  {account
                    ? account.lastLoginAt
                      ? formatDateTime(account.lastLoginAt)
                      : "Not recorded"
                    : "Loading…"}
                </dd>
              </div>
              <div>
                <dt>Password last changed</dt>
                <dd>
                  {account
                    ? account.passwordChangedAt
                      ? formatDateTime(account.passwordChangedAt)
                      : "Not recorded"
                    : "Loading…"}
                </dd>
              </div>
            </dl>
          )}
          <div>
            <strong>Make access personal</strong>
            <p>
              Use a password manager and a separate account for each
              collaborator. Give each person only the access they need.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
