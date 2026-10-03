import LoadingSkeleton from "../components/LoadingSkeleton";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowUpRight, FiGitPullRequest } from "react-icons/fi";
import API from "../services/api";
import PublicPage from "../components/PublicPage";
import SectionHeading from "../components/SectionHeading";

export default function PublicBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    const loadBlogs = async () => {
      try {
        setStatus("loading");

        const response = await API.get("/public/blogs");

        if (!mounted) return;

        const data = Array.isArray(response?.data)
          ? response.data.filter((item) => item && item.slug)
          : [];

        setBlogs(data);
        setStatus("ready");
      } catch {
        if (!mounted) return;

        setBlogs([]);
        setStatus("error");
      }
    };

    loadBlogs();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PublicPage>
      <SectionHeading
        icon={<FiGitPullRequest />}
        title="Writing for people who"
        accent="ship."
      />

      <p className="public-lede">
        Notes on DevOps, cloud infrastructure, delivery systems, networking and
        the small details that make production calmer.
      </p>

      {status === "loading" && (
        <LoadingSkeleton compact label="Loading writing" />
      )}

      {status === "error" && (
        <div className="data-empty" role="alert">
          Unable to load writing right now.
        </div>
      )}

      {status === "ready" && !blogs.length && (
        <div className="data-empty">
          Writing will appear here once it is published.
        </div>
      )}

      {status === "ready" && blogs.length > 0 && (
        <div className="repo-grid">
          {blogs.map((blog) => (
            <Link
              key={blog._id || blog.slug}
              to={`/blog/${blog.slug}`}
              className="repo-card"
            >
              <div className="repo-top">
                <span>Article</span>
                <FiArrowUpRight aria-hidden="true" />
              </div>

              <h3>{blog.title}</h3>

              <p>
                Read the article and explore the engineering decisions behind
                it.
              </p>

              <div className="repo-meta">
                <span>Article</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PublicPage>
  );
}
