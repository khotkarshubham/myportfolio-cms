import LoadingSkeleton from "./LoadingSkeleton";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";

const grid = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const card = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 0.8, 0.25, 1] },
  },
};

export default function FeaturedProjects({ limit = 4 }) {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    API.get("/public/projects")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data)
          ? res.data.filter((project) => project && project.title)
          : [];
        setProjects(list.slice(0, limit));
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setProjects([]);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [limit]);

  if (status === "loading") {
    return <LoadingSkeleton compact label="Loading projects" />;
  }

  if (status === "error") {
    return <div className="data-empty">Unable to load projects right now.</div>;
  }

  if (!projects.length) {
    return (
      <div className="data-empty">
        Projects will appear here once they are published.
      </div>
    );
  }

  return (
    <motion.div
      className="repo-grid"
      variants={grid}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      {projects.map((project) => (
        <motion.article
          key={project._id}
          className="repo-card"
          variants={card}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {project.image && (
            <img
              src={assetUrl(project.image)}
              alt={project.title}
              className="repo-image"
            />
          )}
          <div className="repo-top">
            <span>Project</span>
            <FiArrowUpRight />
          </div>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <div className="repo-meta">
            {project.demo && (
              <a href={project.demo} target="_blank" rel="noreferrer">
                Live demo ↗
              </a>
            )}
            {project.github && (
              <a href={project.github} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            )}
          </div>
        </motion.article>
      ))}
    </motion.div>
  );
}
