import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { setToken } from "../../services/api";
import ThemeToggle from "../../components/ThemeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await API.post("/auth/login", { email, password });
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
      navigate("/admin");
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

      <form onSubmit={submit} className="admin-login-form" noValidate>
        <div className="admin-login-brand">
          <span className="admin-login-mark">SK</span>
          <p>Portfolio CMS</p>
        </div>
        <h1>Admin sign in</h1>
        <p className="admin-login-copy">
          Manage profile, experience, projects and messages from one place.
        </p>

        <label className="admin-field">
          <span>Email</span>
          <input
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
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="admin-input"
          />
        </label>

        {error && (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="admin-login-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
