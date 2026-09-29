import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { setToken } from "../../services/api";
import ThemeToggle from "../../components/ThemeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await API.post("/auth/login", {
        email: email.trim(),
        password,
      });
      const token = res.data.token;
      const admin = res.data.admin;

      if (!token || !admin) {
        setError("Login failed. Please try again.");
        return;
      }

      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_role", admin.role);
      localStorage.setItem("admin_email", admin.email);
      setToken(token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-theme">
        <ThemeToggle />
      </div>

      <div className="cms-login-layout">
        <section className="cms-login-story">
          <Link to="/" className="cms-login-home">
            ← Back to portfolio
          </Link>
          <p className="admin-kicker">Portfolio / Workspace</p>
          <h2>
            Good work deserves
            <br />
            <em>a great story.</em>
          </h2>
          <p>
            Your space to curate projects, share ideas, and turn new connections
            into opportunities.
          </p>
          <div className="cms-login-outline">
            <span>01 / Create</span>
            <strong>Keep your story moving.</strong>
            <p>
              Projects. Articles. Conversations.
              <br />
              All in one thoughtful workspace.
            </p>
            <div className="cms-login-lines">
              <i />
              <i />
              <i />
            </div>
          </div>
          <small>Portfolio CMS · Administrator access</small>
        </section>
        <form onSubmit={submit} className="admin-login-form">
          <div className="admin-login-brand">
            <span className="admin-login-mark">SK</span>
            <p>Portfolio CMS</p>
          </div>
          <h1>Welcome back.</h1>
          <p className="admin-login-copy">
            Sign in to your portfolio workspace.
          </p>

          <label className="admin-field">
            <span>Email</span>
            <input
              disabled={submitting}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              type="email"
              autoComplete="username"
              required
              className="admin-input"
            />
          </label>

          <label className="admin-field">
            <span>Password</span>
            <div className="cms-password-field">
              <input
                disabled={submitting}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="admin-input"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && (
            <p className="admin-form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in to workspace →"}
          </button>
          <p className="cms-muted">
            Access is limited to authorized administrators.
          </p>
        </form>
      </div>
    </div>
  );
}
