import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";

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
      <section className="min-h-[60vh] flex items-center justify-center px-6">
        <div
          className="text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-lg text-gray-500">
            Loading article…
          </p>
        </div>
      </section>
    );
  }

  if (error || !blog) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Article not found
          </h1>

          <p className="mt-3 text-gray-600 dark:text-gray-400">
            {error ||
              "The article you're looking for doesn't exist or is no longer available."}
          </p>

          <Link
            to="/blog"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition"
          >
            <FiArrowLeft />
            Back to Blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-12">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 mb-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <FiArrowLeft />
        Back to Blog
      </Link>

      {blog.image && (
        <img
          src={assetUrl(blog.image)}
          alt={blog.title || "Blog article"}
          className="w-full max-h-[500px] object-cover rounded-2xl mb-8"
          loading="eager"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      <header className="mb-8">
        {blog.category && (
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {blog.category}
          </p>
        )}

        <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
          {blog.title}
        </h1>

        {blog.createdAt && (
          <time
            dateTime={blog.createdAt}
            className="block mt-4 text-sm text-gray-500 dark:text-gray-400"
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
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{
          __html: blog.content || ""
        }}
      />
    </article>
  );
}
