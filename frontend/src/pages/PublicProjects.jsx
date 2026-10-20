import { useEffect, useState } from "react";
import { FiLayers } from "react-icons/fi";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ProjectCard from "../components/ProjectCard";
import PublicPage from "../components/PublicPage";
import { projectTypes } from "../utils/projects";
import API from "../services/api";

export default function PublicProjects() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    API.get("/public/projects")
      .then(({ data }) => {
        if (!active) return;
        setProjects(Array.isArray(data) ? data.filter((p) => p?.title) : []);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);
  const visible = projects.filter(
    (p) =>
      (filter === "all" || (p.type || "repository") === filter) &&
      `${p.title} ${p.description} ${(p.tech || []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <PublicPage>
      <span className="section-index is-icon" aria-hidden="true">
        <FiLayers />
      </span>
      <h1 className="public-title">
        Built with <span className="section-heading-accent">purpose.</span>
      </h1>
      <p className="public-lede">
        Code, applications, and the systems behind them. A selection of hands-on
        work across software, networks, infrastructure, and cloud.
      </p>
      <div className="project-toolbar">
        <div
          className="project-filters"
          role="group"
          aria-label="Filter projects by type"
        >
          {Object.entries({ all: "All work", ...projectTypes }).map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <label className="project-search">
          Search projects
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or technology"
            maxLength={150}
          />
        </label>
      </div>
      {status === "loading" && (
        <LoadingSkeleton compact label="Loading projects" />
      )}
      {status === "error" && (
        <div className="data-empty" role="alert">
          Unable to load projects right now. Please reload to retry.
        </div>
      )}
      {status === "ready" && (
        <>
          <p className="project-count" role="status">
            {visible.length} {visible.length === 1 ? "project" : "projects"}
          </p>
          {!visible.length && (
            <div className="data-empty">
              {projects.length
                ? "No projects match your search. Try another category or keyword."
                : "New projects are on their way."}
            </div>
          )}
          <div className="project-grid">
            {visible.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        </>
      )}
    </PublicPage>
  );
}
