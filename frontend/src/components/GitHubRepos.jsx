import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiGitBranch, FiStar } from "react-icons/fi";

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

export default function GitHubRepos() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/khotkarshubham/repos")
      .then(res => res.json())
      .then(data => setRepos(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="repo-grid repo-grid-loading" aria-label="Loading GitHub repositories">
        {[0, 1, 2].map(i => <div key={i} className="repo-skeleton" />)}
      </div>
    );
  }

  if (!repos.length) {
    return <div className="data-empty">Projects will appear here once GitHub responds.</div>;
  }

  return (
    <motion.div
      className="repo-grid"
      variants={grid}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      {repos.map(repo => (
        <motion.a
          key={repo.id}
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="repo-card"
          variants={card}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="repo-top">
            <span className="repo-label">
              <span className="repo-live-dot" />
              Repository
            </span>
            <FiArrowUpRight />
          </div>

          <h3>{repo.name}</h3>

          <p>
            {repo.description || "A project from the public engineering portfolio."}
          </p>

          <div className="repo-meta">
            <span><FiStar /> {repo.stargazers_count}</span>
            <span><FiGitBranch /> {repo.forks_count}</span>
            <span>{repo.language || "Code"}</span>
          </div>
        </motion.a>
      ))}
    </motion.div>
  );
}
