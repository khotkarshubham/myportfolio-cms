import { useEffect, useRef, useState } from "react";
import API from "../../services/api";
import { formatDateTime } from "../../utils/adminFormat";

const empty = { title: "", content: "", tags: [], status: "draft" };
export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [article, setArticle] = useState(empty);
  const [tags, setTags] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editor = useRef(null);
  const canEdit = ["superadmin", "editor"].includes(
    localStorage.getItem("admin_role"),
  );
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/admin/blogs");
      setBlogs(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load articles.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const warnNavigation = (e) => {
      const link = e.target.closest?.("a[href]");
      if (
        dirty &&
        link &&
        link.target !== "_blank" &&
        link.origin === window.location.origin &&
        link.pathname !== window.location.pathname &&
        !window.confirm("Leave this page and discard unsaved article changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", warnNavigation, true);
    };
  }, [dirty]);
  const change = (key, value) => {
    setArticle((a) => ({ ...a, [key]: value }));
    setDirty(true);
    setNotice("");
  };
  const select = (a) => {
    if (dirty && !window.confirm("Discard unsaved changes to this article?"))
      return;
    setArticle(a);
    setTags((a.tags || []).join(", "));
    setDirty(false);
    setPreview(false);
    setNotice("");
    setError("");
  };
  const insert = (before, after, placeholder) => {
    const field = editor.current;
    if (!field) return;
    const start = field.selectionStart,
      end = field.selectionEnd;
    const text = article.content.slice(start, end) || placeholder;
    change(
      "content",
      article.content.slice(0, start) +
        before +
        text +
        after +
        article.content.slice(end),
    );
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(
        start + before.length,
        start + before.length + text.length,
      );
    });
  };
  const save = async (status) => {
    if (
      !article.title.trim() ||
      !article.content.replace(/<[^>]*>/g, "").trim()
    ) {
      setError("Add a title and some article content before saving.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const payload = {
      title: article.title,
      content: article.content,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status,
    };
    try {
      const { data } = article._id
        ? await API.put(`/admin/blogs/${article._id}`, payload)
        : await API.post("/admin/blogs", payload);
      setArticle(data);
      setDirty(false);
      setTags((data.tags || []).join(", "));
      setBlogs((items) => [
        data,
        ...items.filter((item) => item._id !== data._id),
      ]);
      setNotice(
        status === "draft"
          ? "Draft saved. Only administrators can see it."
          : "Article published successfully.",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save article. Your writing is still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async (a) => {
    if (!window.confirm(`Permanently delete “${a.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await API.delete(`/admin/blogs/${a._id}`);
      setBlogs((items) => items.filter((b) => b._id !== a._id));
      if (article._id === a._id) {
        setArticle(empty);
        setTags("");
        setDirty(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete article.");
    } finally {
      setBusy(false);
    }
  };
  const words = article.content
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const slug = article.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  return (
    <div className="admin-workspace">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Editorial studio</p>
          <h1>Your ideas, published.</h1>
          <p className="admin-page-copy">
            Shape a story, save a draft, and share it when it's ready.
          </p>
        </div>
        {canEdit && (
          <button
            className="cms-button"
            disabled={busy}
            onClick={() => select(empty)}
          >
            + New article
          </button>
        )}
      </div>
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-form-status" role="status">
          {notice}
        </p>
      )}
      <div className="cms-editor-layout">
        <section className="cms-panel cms-writing">
          <div className="cms-panel-heading">
            <h2>{article._id ? "Edit article" : "New article"}</h2>
            <span className="cms-badge">
              {dirty
                ? "Unsaved changes"
                : article._id
                  ? article.status || "published"
                  : "Not saved"}
            </span>
          </div>
          <fieldset disabled={busy || !canEdit} className="cms-editor-fields">
            <label className="admin-field">
              <span>Article title</span>
              <input
                className="admin-input cms-title-input"
                placeholder="Give your story a title…"
                maxLength={200}
                value={article.title}
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <p className="cms-muted">
              Public address: /blog/
              {article.slug || slug || "your-article-title"}
            </p>
            <label className="admin-field">
              <span>
                Tags <small>· separated by commas</small>
              </span>
              <input
                className="admin-input"
                value={tags}
                placeholder="DevOps, Engineering, Tutorials"
                onChange={(e) => {
                  setTags(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </fieldset>
          <div className="cms-toolbar">
            <div className="cms-tabs">
              <button aria-pressed={!preview} onClick={() => setPreview(false)}>
                Write HTML
              </button>
              <button aria-pressed={preview} onClick={() => setPreview(true)}>
                Preview
              </button>
            </div>
            <span className="cms-muted">
              {words} words · {Math.max(1, Math.ceil(words / 200))} min read
            </span>
          </div>
          {preview ? (
            <iframe
              className="cms-blog-preview"
              title="Article preview"
              sandbox=""
              srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font:16px/1.8 system-ui;padding:24px;color:#172033;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#f1f5f9;padding:16px}a{color:#1264ff}blockquote{border-left:3px solid #1264ff;margin-left:0;padding-left:20px}</style></head><body>${article.content}</body></html>`}
            />
          ) : (
            <>
              <div
                className="cms-format-toolbar"
                aria-label="Insert formatting"
              >
                {[
                  ["Heading", "<h2>", "</h2>", "Section heading"],
                  ["Bold", "<strong>", "</strong>", "bold text"],
                  ["Italic", "<em>", "</em>", "emphasis"],
                  ["Paragraph", "<p>", "</p>\n", "Your paragraph"],
                  ["List", "<ul>\n<li>", "</li>\n</ul>", "List item"],
                  ["Quote", "<blockquote>", "</blockquote>", "Quote"],
                  ["Code", "<pre><code>", "</code></pre>", "code here"],
                  [
                    "Link",
                    '<a href="https://example.com">',
                    "</a>",
                    "Link text",
                  ],
                ].map(([label, before, after, text]) => (
                  <button
                    key={label}
                    disabled={busy || !canEdit}
                    onClick={() => insert(before, after, text)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                ref={editor}
                aria-label="Article HTML content"
                className="admin-input cms-content-editor"
                disabled={busy || !canEdit}
                maxLength={50000}
                placeholder="Start with a paragraph, or use the formatting buttons above…"
                value={article.content}
                onChange={(e) => change("content", e.target.value)}
              />
              <p className="cms-muted">
                Select text, then add formatting. Preview shows how your article
                reads. Unsupported HTML is removed when saved.
              </p>
            </>
          )}
          {canEdit && (
            <div className="cms-actions">
              <button
                className="cms-button"
                disabled={busy}
                onClick={() => save("draft")}
              >
                {article.status === "published"
                  ? "Unpublish & save draft"
                  : "Save draft"}
              </button>
              <button
                className="cms-button is-primary"
                disabled={busy}
                onClick={() => save("published")}
              >
                {busy
                  ? "Saving…"
                  : article.status === "published"
                    ? "Update published article"
                    : "Publish article"}
              </button>
            </div>
          )}
        </section>
        <aside className="cms-panel cms-article-library">
          <div className="cms-panel-heading">
            <h2>Article library</h2>
            <span className="cms-badge">{blogs.length}</span>
          </div>
          <input
            type="search"
            aria-label="Search articles"
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find an article…"
          />
          {loading ? (
            <p role="status">Loading articles…</p>
          ) : (
            <>
              {blogs
                .filter((b) =>
                  `${b.title} ${(b.tags || []).join(" ")}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((b) => (
                  <div className="cms-library-item" key={b._id}>
                    <span className="cms-badge">{b.status || "published"}</span>
                    <button
                      className="cms-article-title"
                      disabled={busy}
                      onClick={() => select(b)}
                    >
                      {b.title}
                    </button>
                    <small className="cms-muted">
                      Updated {formatDateTime(b.updatedAt || b.createdAt)}
                    </small>
                    <div className="cms-actions">
                      {b.status !== "draft" && (
                        <a
                          className="cms-text-link"
                          href={`/blog/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View ↗
                        </a>
                      )}
                      {canEdit && (
                        <button
                          className="cms-text-link is-danger"
                          disabled={busy}
                          onClick={() => remove(b)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {!blogs.length && (
                <div className="cms-empty">Your first article starts here.</div>
              )}
              <button className="cms-button" disabled={busy} onClick={load}>
                Refresh library
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
