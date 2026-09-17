import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FiGitBranch, FiGitCommit, FiStar, FiUsers } from "react-icons/fi";

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 0.8, 0.25, 1] },
  },
};

export default function GitHubStats() {
  const username = "khotkarshubham";
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`https://api.github.com/users/${username}`).then(res => {
        if (!res.ok) throw new Error("GitHub profile unavailable");
        return res.json();
      }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`).then(res => {
        if (!res.ok) throw new Error("GitHub repositories unavailable");
        return res.json();
      }),
    ])
      .then(([profileData, repoData]) => {
        setProfile(profileData);
        setRepos(Array.isArray(repoData) ? repoData : []);
      })
      .catch(() => {
        setProfile(null);
        setRepos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const forks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);

    const languages = {};
    repos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { stars, forks, topLanguages };
  }, [repos]);

  if (loading) {
    return (
      <div className="github-stats-grid" aria-label="Loading GitHub stats">
        <div className="github-stat-card github-stat-skeleton" />
        <div className="github-stat-card github-stat-skeleton" />
        <div className="github-stat-card github-stat-skeleton" />
        <div className="github-stat-card github-stat-skeleton" />
      </div>
    );
  }

  if (!profile) {
    return <div className="data-empty">GitHub stats are temporarily unavailable.</div>;
  }

  const metrics = [
    { label: "Public repos", value: profile.public_repos ?? 0, icon: <FiGitBranch /> },
    { label: "Followers", value: profile.followers ?? 0, icon: <FiUsers /> },
    { label: "Stars earned", value: totals.stars, icon: <FiStar /> },
    { label: "Forks", value: totals.forks, icon: <FiGitCommit /> },
  ];

  return (
    <div className="github-stats-stack">
      <motion.div
        className="github-metrics-grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {metrics.map(metric => (
          <motion.div key={metric.label} className="github-metric" variants={reveal}>
            <span className="github-metric-icon">{metric.icon}</span>
            <span className="github-metric-value">{metric.value}</span>
            <span className="github-metric-label">{metric.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {!!totals.topLanguages.length && (
        <motion.div
          className="github-language-strip"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={reveal}
        >
          <span className="github-language-title">Most used languages</span>
          <div className="github-language-list">
            {totals.topLanguages.map(([language, count]) => (
              <span key={language}>
                {language}
                <small>{count}</small>
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
