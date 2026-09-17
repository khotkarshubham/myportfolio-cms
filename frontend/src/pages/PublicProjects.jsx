import { useEffect, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";

export default function PublicProjects() {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    API.get("/public/projects").then(res => setProjects(Array.isArray(res.data) ? res.data : [])).catch(() => setProjects([]));
  }, []);

  return (
    <section className="public-page">
      <div className="public-page-inner">
        <span className="section-index">SELECTED WORK</span>
        <h1 className="public-title">Systems with a job to do.</h1>
        <p className="public-lede">A focused collection of projects spanning cloud infrastructure, automation, delivery and practical engineering.</p>
        <div className="repo-grid">
          {projects.map(project => (
            <article key={project._id} className="repo-card">
              {project.image && <img src={assetUrl(project.image)} alt={project.title} className="repo-image" />}
              <div className="repo-top"><span>Project</span><FiArrowUpRight /></div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="repo-meta">
                {project.github && <a href={project.github} target="_blank" rel="noreferrer">GitHub ↗</a>}
                {project.demo && <a href={project.demo} target="_blank" rel="noreferrer">Live demo ↗</a>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
