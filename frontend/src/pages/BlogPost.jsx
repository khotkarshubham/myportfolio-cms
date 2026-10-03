import LoadingSkeleton from "../components/LoadingSkeleton";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiGitPullRequest } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";
import PublicPage from "../components/PublicPage";

export default function BlogPost() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchBlog = async () => {
      setLoading(true);
      setError("");
      setBlog(null);

      try {
        const response = await API.get(
          `/public/blog/${encodeURIComponent(slug)}`,
        );
        if (!isMounted) return;

        const blogData = response?.data;

        if (
          !blogData ||
          typeof blogData !== "object" ||
          Array.isArray(blogData) ||
          !blogData.title
        ) {
          setError("Article not found.");
          return;
        }

        setBlog(blogData);
      } catch (err) {
        if (!isMounted) return;
        const status = err?.response?.status;
        if (status === 404) {
          setError("Article not found.");
        } else {
          setError("Unable to load this article. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (!slug) {
      setLoading(false);
      setError("Article not found.");
      return () => {
        isMounted = false;
      };
    }

    fetchBlog();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <PublicPage>
        <LoadingSkeleton compact label="Loading article" />
      </PublicPage>
    );
  }

  if (error || !blog) {
    return (
      <PublicPage>
        <span className="section-index is-icon" aria-hidden="true">
          <FiGitPullRequest />
        </span>
        <h1 className="public-title">Article not found</h1>
        <p className="public-lede">
          {error ||
            "The article you're looking for doesn't exist or is no longer available."}
        </p>
        <Link to="/blog" className="button button-ghost">
          <FiArrowLeft />
          Back to writing
        </Link>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <Link to="/blog" className="text-link">
        <FiArrowLeft />
        Back to writing
      </Link>

      {blog.image && (
        <img
          src={assetUrl(blog.image)}
          alt={blog.title || "Blog article"}
          className="article-hero"
          loading="eager"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      <header className="article-head">
        <span className="section-index is-icon" aria-hidden="true">
          <FiGitPullRequest />
        </span>
        <h1 className="public-title">{blog.title}</h1>
        {blog.createdAt && (
          <time dateTime={blog.createdAt} className="resume-status">
            {new Date(blog.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}
      </header>

      <div
        className="public-card article-body"
        dangerouslySetInnerHTML={{ __html: blog.content || "" }}
      />
    </PublicPage>
  );
}
