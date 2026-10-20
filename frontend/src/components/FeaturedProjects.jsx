import { useEffect, useState } from "react";
import LoadingSkeleton from "./LoadingSkeleton";
import ProjectCard from "./ProjectCard";
import API from "../services/api";

export default function FeaturedProjects({ limit = 4 }) {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    API.get("/public/projects")
      .then(({ data }) => {
        if (!active) return;
        setProjects(
          Array.isArray(data)
            ? data.filter((p) => p?.title).slice(0, limit)
            : [],
        );
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [limit]);
  if (status === "loading")
    return <LoadingSkeleton compact label="Loading projects" />;
  if (status === "error")
    return <div className="data-empty">Unable to load projects right now.</div>;
  if (!projects.length)
    return (
      <div className="data-empty">
        Projects will appear here once they are added.
      </div>
    );
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <ProjectCard key={project._id} project={project} />
      ))}
    </div>
  );
}
