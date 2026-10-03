import { useEffect, useState } from "react";
import API from "../../services/api";
import SkillIcon, { hasSkillIcon } from "../../components/SkillIcon";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import SkillIconSelector from "../../components/SkillIconSelector";

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState("");
  const [editing, setEditing] = useState(null);
  const [editIconKey, setEditIconKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canEdit = ["superadmin", "editor"].includes(
    localStorage.getItem("admin_role"),
  );
  const loadSkills = async () => {
    setLoading(true);
    try {
      const res = await API.get("/public/skills");
      setSkills(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Unable to load skills. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadSkills();
  }, []);
  const createSkill = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await API.post("/admin/skills", { name: name.trim(), iconKey });
      setName("");
      setIconKey("");
      setNotice("Skill added.");
      await loadSkills();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add skill.");
    } finally {
      setBusy(false);
    }
  };
  const saveIcon = async (skill) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await API.patch(`/admin/skills/${skill._id}`, {
        iconKey: editIconKey,
      });
      setSkills((current) =>
        current.map((item) => (item._id === skill._id ? res.data : item)),
      );
      setEditing(null);
      setNotice("Skill icon updated.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save icon. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const deleteSkill = async (skill) => {
    if (!window.confirm(`Delete ${skill.name}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await API.delete(`/admin/skills/${skill._id}`);
      setSkills((current) => current.filter((item) => item._id !== skill._id));
      setNotice("Skill deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete skill.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-workspace">
      <div>
        <p className="cms-eyebrow">Portfolio content</p>
        <h1>Skills & tools</h1>
        <p className="cms-muted">
          Recognizable icons, automatically matched to each tool.
        </p>
      </div>
      {error && (
        <div className="cms-error" role="alert">
          {error}{" "}
          <button
            className="cms-button"
            onClick={() => {
              setError("");
              loadSkills();
            }}
          >
            Retry loading
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {canEdit && (
        <form onSubmit={createSkill} className="cms-panel skill-editor">
          <label htmlFor="skill-name">Skill name</label>
          <div className="skill-editor-input">
            <input
              id="skill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub Actions, Node.js, Proxmox"
              required
              maxLength={100}
              disabled={busy}
            />
            <button
              className="cms-button cms-button-primary"
              disabled={busy || !name.trim()}
            >
              {busy ? "Saving…" : "Add skill"}
            </button>
          </div>
          <div className="skill-preview">
            <span className="skill-icon">
              <SkillIcon name={name} iconKey={iconKey} />
            </span>
            <div>
              <strong>{name.trim() || "Your skill preview"}</strong>
              <p className="cms-muted">
                {iconKey
                  ? "Manual icon selected. This icon will appear on your portfolio."
                  : !name.trim()
                    ? "Enter a tool name to preview its icon."
                    : hasSkillIcon(name)
                      ? "Brand icon matched. This icon will appear on your portfolio."
                      : "No exact brand match. Choose an icon below or keep the neutral code icon."}
              </p>
            </div>
          </div>
          <SkillIconSelector
            name={name}
            value={iconKey}
            onChange={setIconKey}
            disabled={busy}
          />
        </form>
      )}
      {loading ? (
        <LoadingSkeleton compact label="Loading skills" />
      ) : (
        <div className="admin-skills-grid">
          {skills.map((skill) => (
            <div
              key={skill._id}
              className="cms-panel admin-skill-item manual-icon-card"
            >
              <span className="skill-icon">
                <SkillIcon name={skill.name} iconKey={skill.iconKey} />
              </span>
              <strong>{skill.name}</strong>
              {canEdit && (
                <button
                  className="cms-button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(skill._id);
                    setEditIconKey(skill.iconKey || "");
                  }}
                  aria-label={`Change icon for ${skill.name}`}
                >
                  Icon
                </button>
              )}
              {canEdit && (
                <button
                  className="cms-button"
                  disabled={busy}
                  onClick={() => deleteSkill(skill)}
                  aria-label={`Delete ${skill.name}`}
                >
                  Delete
                </button>
              )}
              {canEdit && editing === skill._id && (
                <div className="skill-icon-edit">
                  <SkillIconSelector
                    name={skill.name}
                    value={editIconKey}
                    onChange={setEditIconKey}
                    disabled={busy}
                  />
                  <div className="skill-editor-input">
                    <button
                      className="cms-button cms-button-primary"
                      disabled={busy}
                      onClick={() => saveIcon(skill)}
                    >
                      {busy ? "Saving…" : "Save icon"}
                    </button>
                    <button
                      className="cms-button"
                      disabled={busy}
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && !skills.length && (
        <p className="cms-empty">No skills yet. Add your first tool above.</p>
      )}
    </div>
  );
}
