import { useEffect, useState } from "react";
import API from "../../services/api";
import { SOCIAL_PROFILES } from "../../data/socials";

const emptyProfile = {
  name: "",
  title: "",
  image: "",
  resume: "",
  email: SOCIAL_PROFILES.email,
  github: SOCIAL_PROFILES.github,
  linkedin: SOCIAL_PROFILES.linkedin,
  instagram: SOCIAL_PROFILES.instagram,
  whatsapp: SOCIAL_PROFILES.whatsapp || "919270702964",
};

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [image, setImage] = useState(null);
  const [resume, setResume] = useState(null);
  const [preview, setPreview] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:4000";

  const loadProfile = async () => {
    try {
      const res = await API.get("/public/profile");
      setProfile({ ...emptyProfile, ...res.data });

      if (res.data.image) {
        setPreview(`${API_BASE}${res.data.image}`);
      } else {
        setPreview("/Profile.png");
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleResume = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setResume(file);
  };

  const updateField = (key) => (event) => {
    setProfile((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback("");
    setSaving(true);

    const form = new FormData();
    form.append("name", profile.name);
    form.append("title", profile.title);
    form.append("email", profile.email || "");
    form.append("github", profile.github || "");
    form.append("linkedin", profile.linkedin || "");
    form.append("instagram", profile.instagram || "");
    form.append("whatsapp", profile.whatsapp || "");
    if (image) form.append("image", image);
    if (resume) form.append("resume", resume);

    try {
      await API.put("/admin/profile", form);
      setFeedback("Profile saved.");
      loadProfile();
    } catch (err) {
      setFeedback(err.response?.data?.message || "Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-form-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Public site</p>
          <h1>Manage Profile</h1>
        </div>
      </div>

      <div className="admin-profile-preview">
        <img src={preview || "/Profile.png"} alt="" />
      </div>

      <form onSubmit={submit} className="admin-form-card">
        <label className="admin-field">
          <span>Full name</span>
          <input className="admin-input" value={profile.name} onChange={updateField("name")} />
        </label>

        <label className="admin-field">
          <span>Professional title</span>
          <textarea className="admin-input" rows="3" value={profile.title} onChange={updateField("title")} />
        </label>

        <label className="admin-field">
          <span>Public email</span>
          <input className="admin-input" type="email" value={profile.email || ""} onChange={updateField("email")} />
        </label>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>GitHub</span>
            <input className="admin-input" value={profile.github || ""} onChange={updateField("github")} />
          </label>
          <label className="admin-field">
            <span>LinkedIn</span>
            <input className="admin-input" value={profile.linkedin || ""} onChange={updateField("linkedin")} />
          </label>
          <label className="admin-field">
            <span>Instagram</span>
            <input className="admin-input" value={profile.instagram || ""} onChange={updateField("instagram")} />
          </label>
          <label className="admin-field">
            <span>WhatsApp (E.164, e.g. 9198XXXXXXXX)</span>
            <input className="admin-input" value={profile.whatsapp || ""} onChange={updateField("whatsapp")} placeholder="9198XXXXXXXX" />
          </label>
        </div>

        <label className="admin-field">
          <span>Upload profile image</span>
          <input type="file" accept="image/*" onChange={handleImage} className="admin-file" />
        </label>

        <label className="admin-field">
          <span>Upload resume (PDF)</span>
          <input type="file" accept=".pdf" onChange={handleResume} className="admin-file" />
        </label>

        {profile.resume && (
          <p className="admin-page-copy">
            Current resume:{" "}
            <a href={`${API_BASE}${profile.resume}`} target="_blank" rel="noreferrer">
              View resume
            </a>
          </p>
        )}

        {feedback && <p className="admin-form-status">{feedback}</p>}

        <button className="admin-login-submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
