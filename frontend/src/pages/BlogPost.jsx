import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
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
          `/public/blog/${encodeURIComponent(slug)}`
        );

        if (!isMounted) return;

        /*
         * Support APIs that return either:
         * { ...blog }
         * or
         * { data: { ...blog } }
         */
        const blogData = response?.data?.data ?? response?.data;

        if (!blogData || typeof blogData !== "object") {
          setError("Article not found.");
          return;
        }

        setBlog(blogData);
      } catch (err) {
        if (!isMounted) return;

        const status = err?.response?.status;

        if (status === 404) {
          setError("Article not found.");
        } else if (status >= 500) {
          setError(
            "The article could not be loaded right now. Please try again later."
          );
        } else {
          setError("Unable to load this article. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
      <PublicPage innerClassName="public-page-compact">
        <div
          className="text-center"
          role="status"
          aria-live="polite"
        >
          <p className="public-lede">
            Loading article…
          </p>
        </div>
      </PublicPage>
    );
  }

  if (error || !blog) {
    return (
      <PublicPage innerClassName="public-page-compact">
          <h1 className="public-title">
            Article not found
          </h1>

          <p className="public-lede">
            {error ||
              "The article you're looking for doesn't exist or is no longer available."}
          </p>

          <Link
            to="/blog"
            className="button button-ghost"
          >
            <FiArrowLeft />
            Back to Blog
          </Link>
      </PublicPage>
    );
  }

  return (
    <PublicPage innerClassName="public-page-compact">
      <Link
        to="/blog"
        className="text-link"
      >
        <FiArrowLeft />
        Back to Blog
      </Link>

      {blog.image && (
        <img
          src={assetUrl(blog.image)}
          alt={blog.title || "Blog article"}
          className="w-full max-h-[500px] object-cover rounded-2xl mb-8 mt-6"
          loading="eager"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      <header className="mb-8">
        {blog.category && (
          <p className="section-index">
            {blog.category}
          </p>
        )}

        <h1 className="public-title">
          {blog.title}
        </h1>

        {blog.createdAt && (
          <time
            dateTime={blog.createdAt}
            className="resume-status"
          >
            {new Date(blog.createdAt).toLocaleDateString(
              undefined,
              {
                year: "numeric",
                month: "long",
                day: "numeric"
              }
            )}
          </time>
        )}
      </header>

      <div
        className="prose prose-lg dark:prose-invert max-w-none public-card"
        style={{ padding: "24px" }}
        dangerouslySetInnerHTML={{
          __html: blog.content || ""
        }}
      />
    </PublicPage>
  );
}
