import { useState } from "react";
import {
  FiGithub,
  FiGlobe,
  FiServer,
  FiCloud,
  FiShare2,
  FiArrowUpRight,
} from "react-icons/fi";
import assetUrl from "../utils/assetUrl";
import {
  projectTypes,
  projectStatuses,
  safeProjectLink,
} from "../utils/projects";

const icons = {
  repository: FiGithub,
  application: FiGlobe,
  network: FiShare2,
  infrastructure: FiServer,
  cloud: FiCloud,
};
export default function ProjectCard({ project, previewImage }) {
  const [failedImage, setFailedImage] = useState("");
  const type = Object.hasOwn(projectTypes, project.type)
    ? project.type
    : "repository";
  const Icon = icons[type];
  const image = previewImage || assetUrl(project.image);
  const github = safeProjectLink(project.github);
  const demo = safeProjectLink(project.demo);
  return (
    <article className="project-card">
      <div className={`project-cover project-cover-${type}`}>
        {image && failedImage !== image ? (
          <img
            src={image}
            alt={`${project.title || "Project"} cover`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedImage(image)}
          />
        ) : (
          <div className="project-cover-art" aria-hidden="true">
            <Icon />
            <span>{projectTypes[type]}</span>
          </div>
        )}
        <span className="project-status">
          {Object.hasOwn(projectStatuses, project.status)
            ? projectStatuses[project.status]
            : "Completed"}
        </span>
      </div>
      <div className="project-card-body">
        <div className="project-category">
          <Icon aria-hidden="true" /> {projectTypes[type]}
        </div>
        <h3>{project.title || "Your next project"}</h3>
        <p className="project-description">
          {project.description ||
            "Explain what you built, the problem it solves, and your contribution."}
        </p>
        {project.outcome && (
          <p className="project-outcome">
            <strong>Outcome</strong>
            {project.outcome}
          </p>
        )}
        {!!project.tech?.length && (
          <ul className="project-tags" aria-label="Technologies">
            {project.tech.map((tech, index) => (
              <li key={`${tech}-${index}`}>{tech}</li>
            ))}
          </ul>
        )}
        {(github || demo) && (
          <div className="project-links">
            {demo && (
              <a href={demo} target="_blank" rel="noopener noreferrer">
                {" "}
                {type === "application" ? "Visit project" : "View project"}{" "}
                <FiArrowUpRight aria-hidden="true" />
              </a>
            )}
            {github && (
              <a href={github} target="_blank" rel="noopener noreferrer">
                <FiGithub aria-hidden="true" /> Repository{" "}
                <FiArrowUpRight aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
