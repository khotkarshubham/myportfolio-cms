import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { FaTrash, FaExternalLinkAlt } from "react-icons/fa";

function AdminBlogs() {

  const [blogs, setBlogs] = useState([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");

  /* ---------------- LOAD BLOGS ---------------- */

  const load = async () => {

    const res = await API.get("/public/blogs");

    setBlogs(Array.isArray(res.data) ? res.data : []);

  };

  useEffect(() => {
    load();
  }, []);


  /* ---------------- AUTO SLUG ---------------- */

  useEffect(() => {

    if (!title) return;

    const generated = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");

    setSlug(generated);

  }, [title]);


  /* ---------------- CREATE BLOG ---------------- */

  const create = async (e) => {

    e.preventDefault();

    try {

      await API.post(
        "/admin/blogs",
        { title, slug, content },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );

      setTitle("");
      setSlug("");
      setContent("");

      load();

    } catch (err) {

      console.error("Blog create failed", err);

    }

  };


  /* ---------------- DELETE BLOG ---------------- */

  const remove = async (id) => {

    try {

      await API.delete(`/admin/blogs/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });

      load();

    } catch (err) {

      console.error("Blog delete failed", err);

    }

  };


  return (

    <div className="space-y-10">

      {/* PAGE TITLE */}

      <h2 className="text-3xl font-bold text-tech-accent">
        Blogs Management
      </h2>


      {/* CREATE BLOG FORM */}

      <form
        onSubmit={create}
        className="
        space-y-5
        p-6
        bg-tech-card
        border border-gray-700
        rounded-xl
        shadow-xl
        "
      >

        {/* TITLE */}

        <input
          className="
          border border-gray-700
          bg-tech-bg
          text-gray-200
          p-3
          w-full
          rounded
          focus:outline-none
          focus:border-tech-accent
          transition
          "
          placeholder="Blog Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* SLUG */}

        <input
          className="
          border border-gray-700
          bg-tech-bg
          text-gray-400
          p-3
          w-full
          rounded
          "
          value={slug}
          readOnly
        />

        {/* CONTENT EDITOR */}

        <textarea
          className="
          border border-gray-700
          bg-tech-bg
          text-gray-200
          p-3
          w-full
          rounded
          min-h-64
          font-mono
          text-sm
          focus:outline-none
          focus:border-tech-accent
          transition
          "
          placeholder="Write blog HTML here"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* BUTTON */}

        <button
          className="
          bg-tech-accent
          hover:bg-cyan-500
          text-black
          font-semibold
          px-6
          py-3
          rounded-lg
          transition
          w-full
          "
        >
          Publish Blog
        </button>

      </form>



      {/* BLOG LIST */}

      <div>

        <h3 className="text-xl font-bold mb-4 text-gray-200">
          Existing Blogs
        </h3>

        <div className="space-y-4">

          {blogs.map((b) => (

            <div
              key={b._id}
              className="
              flex
              justify-between
              items-center
              bg-tech-card
              border border-gray-700
              p-5
              rounded-xl
              shadow-md
              "
            >

              {/* BLOG INFO */}

              <div>

                <h4 className="text-tech-accent font-semibold">
                  {b.title}
                </h4>

                <p className="text-gray-400 text-sm">
                  /blog/{b.slug}
                </p>

              </div>


              {/* ACTIONS */}

              <div className="flex gap-4 items-center">

                {/* VIEW BLOG */}

                <a
                  href={`/blog/${b.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-tech-accent hover:text-cyan-400"
                >
                  <FaExternalLinkAlt />
                </a>

                {/* DELETE */}

                <button
                  onClick={() => remove(b._id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <FaTrash />
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}

export default AdminBlogs;
