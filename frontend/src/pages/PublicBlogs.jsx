import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import API from "../services/api";

export default function PublicBlogs() {
  const [blogs, setBlogs] = useState([]);
  useEffect(() => {
    API.get("/public/blogs").then(res => setBlogs(Array.isArray(res.data) ? res.data : [])).catch(() => setBlogs([]));
  }, []);

  return (
    <section className="public-page">
      <div className="public-page-inner">
        <span className="section-index">FIELD NOTES</span>
        <h1 className="public-title">Writing for people who ship.</h1>
        <p className="public-lede">Notes on DevOps, cloud infrastructure, delivery systems, networking and the small details that make production calmer.</p>
        <div className="repo-grid">
          {blogs.map((blog, i) => (
            <Link key={blog._id} to={`/blog/${blog.slug}`} className="repo-card">
              <div className="repo-top"><span>0{i + 1}</span><FiArrowUpRight /></div>
              <h3>{blog.title}</h3>
              <p>Read the article and explore the engineering decisions behind it.</p>
              <div className="repo-meta"><span>Article</span></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
