import { useEffect, useRef, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import API from "../../services/api";
import { adminSession } from "../../services/adminSession";
import ProjectCard from "../../components/ProjectCard";
import { projectTypes, projectStatuses } from "../../utils/projects";

const blank = () => ({
  title: "",
  description: "",
  type: "repository",
  status: "completed",
  github: "",
  demo: "",
  outcome: "",
  tech: [],
  image: "",
});
export default function AdminProjects() {
  const canEdit = ["superadmin", "editor"].includes(
    adminSession.getItem("admin_role"),
  );
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(blank);
  const [tech, setTech] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const input = useRef(null);
  const form = useRef(null);
  const load = async () => {
    try {
      const { data } = await API.get("/public/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load projects. Please retry.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigation = (e) => {
      const link = e.target.closest?.("a[href]");
      if (
        dirty &&
        link &&
        link.target !== "_blank" &&
        link.origin === location.origin &&
        link.pathname !== location.pathname &&
        !window.confirm("Discard unsaved project changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigation, true);
    };
  }, [dirty]);
  const change = (key, value) => {
    setProject((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setNotice("");
  };
  const select = (value) => {
    if (busy || (dirty && !window.confirm("Discard unsaved project changes?")))
      return;
    setProject({ ...blank(), ...value });
    setTech((value.tech || []).join(", "));
    setFile(null);
    if (input.current) input.current.value = "";
    setDirty(false);
    setError("");
    setNotice("");
    form.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const technologies = [
    ...new Set(
      tech
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
  const chooseFile = (e) => {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(chosen.type) ||
      chosen.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG, or WebP image up to 5 MB.");
      e.target.value = "";
      return;
    }
    setFile(chosen);
    setDirty(true);
    setError("");
  };
  const save = async (e) => {
    e.preventDefault();
    if (busy || !canEdit) return;
    if (technologies.length > 20 || technologies.some((t) => t.length > 50)) {
      setError("Use up to 20 technologies, each at most 50 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      for (const key of [
        "title",
        "description",
        "type",
        "status",
        "outcome",
        "github",
        "demo",
      ])
        body.append(key, project[key] || "");
      body.append("tech", JSON.stringify(technologies));
      if (file) body.append("projectImage", file);
      else if (project._id && !project.image) body.append("image", "");
      const { data } = await API[project._id ? "put" : "post"](
        `/admin/projects${project._id ? `/${project._id}` : ""}`,
        body,
      );
      setProject({ ...blank(), ...data });
      setTech((data.tech || []).join(", "));
      setFile(null);
      if (input.current) input.current.value = "";
      setDirty(false);
      setNotice("Project saved. Your public portfolio is updated.");
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the project. Your changes are still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item) => {
    if (
      busy ||
      !canEdit ||
      !window.confirm(
        `Delete "${item.title}" and its cover image?${dirty && item._id === project._id ? " Unsaved changes will also be discarded." : ""}`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await API.delete(`/admin/projects/${item._id}`);
      if (item._id === project._id) {
        setProject(blank());
        setTech("");
        setFile(null);
        setDirty(false);
        if (input.current) input.current.value = "";
      }
      setNotice("Project deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete this project.");
    } finally {
      setBusy(false);
    }
  };
  const visible = projects.filter((p) =>
    `${p.title} ${projectTypes[p.type] || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section>
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Portfolio / Projects</p>
          <h1>Your engineering work</h1>
          <p className="admin-page-copy">
            Give every build a clear story, from the first commit to production.
          </p>
        </div>
        {canEdit && (
          <button
            className="button"
            disabled={busy}
            onClick={() => select(blank())}
          >
            <FiPlus /> New project
          </button>
        )}
      </header>
      {error && (
        <p className="admin-form-error project-notice" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-form-status project-notice" role="status">
          {notice}
        </p>
      )}
      {canEdit && (
        <div className="project-editor" ref={form}>
          <form className="admin-form-card" onSubmit={save}>
            <div>
              <p className="admin-kicker">
                {project._id ? "Edit project" : "New project"}
              </p>
              <h2 className="project-form-title">Tell the story</h2>
              <p className="admin-page-copy">
                Saved projects appear publicly. Images and links are optional.
              </p>
            </div>
            <fieldset disabled={busy} className="project-fields">
              <label className="admin-field">
                <span>Project title *</span>
                <input
                  className="admin-input"
                  required
                  maxLength={150}
                  value={project.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="e.g. Highly available AWS platform"
                />
              </label>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>Project type</span>
                  <select
                    aria-label="Project type"
                    className="admin-input"
                    value={project.type}
                    onChange={(e) => change("type", e.target.value)}
                  >
                    {Object.entries(projectTypes).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Status</span>
                  <select
                    aria-label="Status"
                    className="admin-input"
                    value={project.status}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    {Object.entries(projectStatuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="admin-field">
                <span>Description * · {project.description.length}/1000</span>
                <textarea
                  className="admin-input"
                  required
                  rows={5}
                  maxLength={1000}
                  value={project.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="What did you build? What problem does it solve? Describe your contribution."
                />
              </label>
              <label className="admin-field">
                <span>Outcome (optional)</span>
                <textarea
                  className="admin-input"
                  rows={2}
                  maxLength={300}
                  value={project.outcome}
                  onChange={(e) => change("outcome", e.target.value)}
                  placeholder="e.g. Automated provisioning and reduced deployment time from hours to minutes."
                />
              </label>
              <label className="admin-field">
                <span>Technologies · comma separated</span>
                <input
                  className="admin-input"
                  maxLength={1019}
                  value={tech}
                  onChange={(e) => {
                    setTech(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Terraform, AWS, Docker, Linux"
                />
              </label>
              <label className="admin-field">
                <span>GitHub repository (optional)</span>
                <input
                  className="admin-input"
                  type="url"
                  maxLength={2048}
                  value={project.github}
                  onChange={(e) => change("github", e.target.value)}
                  placeholder="https://github.com/username/repository"
                />
              </label>
              <label className="admin-field">
                <span>Project / demo URL (optional)</span>
                <input
                  className="admin-input"
                  type="url"
                  maxLength={2048}
                  value={project.demo}
                  onChange={(e) => change("demo", e.target.value)}
                  placeholder="https://example.com"
                />
              </label>
              <div className="project-upload">
                <label className="admin-field">
                  <span>Cover image (optional)</span>
                  <input
                    ref={input}
                    className="admin-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={chooseFile}
                  />
                  <small>
                    JPG, PNG, or WebP · up to 5 MB. A landscape image works
                    best.
                  </small>
                </label>
                {(file || project.image) && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setFile(null);
                      change("image", "");
                      if (input.current) input.current.value = "";
                    }}
                  >
                    Remove cover
                  </button>
                )}
              </div>
              <button className="admin-login-submit" type="submit">
                {busy
                  ? "Saving…"
                  : project._id
                    ? "Save changes"
                    : "Add project"}
              </button>
            </fieldset>
          </form>
          <aside className="project-preview">
            <p className="admin-kicker">Public preview</p>
            <p className="admin-page-copy">
              The same card appears on your homepage and projects page.
            </p>
            <ProjectCard
              project={{ ...project, tech: technologies }}
              previewImage={preview}
            />
          </aside>
        </div>
      )}
      <div className="admin-page-header project-library-heading">
        <div>
          <h2 className="project-form-title">Project library</h2>
          <p className="admin-page-copy">
            {projects.length} projects in your portfolio
          </p>
        </div>
        <label className="project-search">
          Find a project
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or category"
          />
        </label>
      </div>
      {loading ? (
        <p role="status">Loading projects…</p>
      ) : !visible.length ? (
        <div className="data-empty">
          {projects.length
            ? "No projects match your search."
            : "Add your first project to start building your portfolio."}
        </div>
      ) : (
        <div className="project-grid">
          {visible.map((item) => (
            <div className="project-library-item" key={item._id}>
              <ProjectCard project={item} />
              {canEdit && (
                <div className="project-library-actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => select(item)}
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    className="button project-delete"
                    disabled={busy}
                    onClick={() => remove(item)}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
