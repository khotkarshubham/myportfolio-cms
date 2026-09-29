import { useEffect, useRef, useState } from "react";
import API from "../../services/api";
import { assetUrl } from "../../utils/assetUrl";

const emptyProfile = {
  name: "",
  title: "",
  email: "",
  github: "",
  linkedin: "",
  instagram: "",
  whatsapp: "",
  image: "",
  resume: "",
};
export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [image, setImage] = useState(null);
  const [resume, setResume] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const imageInput = useRef(null),
    resumeInput = useRef(null);
  const canEdit = ["superadmin", "editor"].includes(
    localStorage.getItem("admin_role"),
  );
  const load = async () => {
    setLoading(true);
    setError("");
    setLoadFailed(false);
    try {
      const { data } = await API.get("/public/profile");
      setProfile({ ...emptyProfile, ...data });
    } catch (err) {
      if (err.response?.status !== 404) {
        setError("Unable to load profile. Retry before editing.");
        setLoadFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const update = (key) => (e) => {
    setProfile((current) => ({ ...current, [key]: e.target.value }));
    setFeedback("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFeedback("");
    const fields = Object.fromEntries(
      [
        "name",
        "title",
        "email",
        "github",
        "linkedin",
        "instagram",
        "whatsapp",
      ].map((key) => [key, profile[key] || ""]),
    );
    let payload = fields;
    if (image || resume) {
      payload = new FormData();
      Object.entries(fields).forEach(([key, value]) =>
        payload.append(key, value),
      );
      if (image) payload.append("image", image);
      if (resume) payload.append("resume", resume);
    }
    try {
      const { data } = await API.put("/admin/profile", payload);
      setProfile({ ...emptyProfile, ...data });
      setImage(null);
      setResume(null);
      if (imageInput.current) imageInput.current.value = "";
      if (resumeInput.current) resumeInput.current.value = "";
      window.dispatchEvent(new Event("profile-updated"));
      // Notify other portfolio tabs without storing profile data locally.
      localStorage.setItem("profile_updated_at", String(Date.now()));
      setFeedback("Profile saved. Your public links are up to date.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save profile. Your changes are still here.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="admin-form-page admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Public identity</p>
          <h1>Manage profile</h1>
          <p className="admin-page-copy">
            Keep your introduction and contact details current.
          </p>
        </div>
      </div>
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
      {loadFailed && (
        <button className="cms-button" onClick={load}>
          Retry loading profile
        </button>
      )}
      {loading && <p role="status">Loading profile…</p>}
      <form onSubmit={submit} className="admin-form-card">
        <fieldset
          disabled={loading || loadFailed || saving || !canEdit}
          className="cms-editor-fields"
        >
          <div className="cms-detail-heading">
            <span className="cms-avatar">
              {profile.name.slice(0, 1) || "P"}
            </span>
            <div>
              <h2>Profile & contact</h2>
              <p className="cms-muted">
                Leave a social link blank to hide it from your public contact
                details.
              </p>
            </div>
          </div>
          <label className="admin-field">
            <span>Full name</span>
            <input
              required
              className="admin-input"
              maxLength={100}
              autoComplete="name"
              value={profile.name}
              onChange={update("name")}
            />
          </label>
          <label className="admin-field">
            <span>Professional title</span>
            <textarea
              required
              className="admin-input"
              rows={3}
              maxLength={300}
              value={profile.title}
              onChange={update("title")}
            />
          </label>
          <label className="admin-field">
            <span>Public email</span>
            <input
              type="email"
              className="admin-input"
              maxLength={200}
              autoComplete="email"
              value={profile.email}
              onChange={update("email")}
            />
          </label>
          <div className="admin-form-grid">
            {[
              ["github", "GitHub", "github.com/username"],
              ["linkedin", "LinkedIn", "linkedin.com/in/username"],
              ["instagram", "Instagram", "instagram.com/username"],
            ].map(([key, label, placeholder]) => (
              <label className="admin-field" key={key}>
                <span>{label}</span>
                <input
                  className="admin-input"
                  type="text"
                  inputMode="url"
                  maxLength={300}
                  value={profile[key]}
                  placeholder={placeholder}
                  onChange={update(key)}
                />
                <small className="cms-muted">
                  https:// is added automatically.
                </small>
              </label>
            ))}
            <label className="admin-field">
              <span>WhatsApp</span>
              <input
                className="admin-input"
                type="text"
                maxLength={300}
                value={profile.whatsapp}
                placeholder="+91 98765 43210 or wa.me/…"
                onChange={update("whatsapp")}
              />
              <small className="cms-muted">
                Include your country code. Spaces and WhatsApp links are
                accepted.
              </small>
            </label>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Profile photo · JPG, PNG or WebP</span>
              <input
                ref={imageInput}
                className="admin-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>
            <label className="admin-field">
              <span>Resume · PDF</span>
              <input
                ref={resumeInput}
                className="admin-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          {(preview || profile.image) && (
            <div className="admin-profile-preview">
              <img
                src={preview || assetUrl(profile.image)}
                alt="Profile preview"
              />
            </div>
          )}
          {profile.resume && (
            <a
              className="cms-text-link"
              href={assetUrl(profile.resume)}
              target="_blank"
              rel="noreferrer"
            >
              View current resume ↗
            </a>
          )}
          {canEdit && (
            <button type="submit" className="admin-login-submit">
              {saving ? "Saving…" : "Save profile"}
            </button>
          )}
        </fieldset>
        {feedback && (
          <p className="admin-form-status" role="status">
            {feedback}
          </p>
        )}
      </form>
    </div>
  );
}
