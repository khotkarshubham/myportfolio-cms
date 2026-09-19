// frontend/src/pages/admin/projectss.jsx

import React, { useEffect, useState } from "react";
import API from "../../services/api";

export default function AdminProjects() {

  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [github, setGithub] = useState("");
  const [demo, setDemo] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");

  const load = async () => {

    try {

      const res = await API.get("/public/projects");

      setProjects(Array.isArray(res.data) ? res.data : []);

    } catch (err) {

      console.error("Failed to load projects:", err);

    }

    setLoading(false);

  };

  const create = async (e) => {

    e.preventDefault();

    try {

      await API.post(
        "/admin/projects",
        { title, description, github, demo },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setTitle("");
      setDescription("");
      setGithub("");
      setDemo("");

      load();

    } catch (err) {

      console.error("Failed to create project:", err);

    }

  };

  const remove = async (id) => {

    try {

      await API.delete(`/admin/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      load();

    } catch (err) {

      console.error("Failed to delete project:", err);

    }

  };

  useEffect(() => {

    load();

  }, []);

  return (
    <section>

      <h2 className="text-3xl font-bold mb-8 text-tech-accent">
        Projects Management
      </h2>

      {/* Create Project Form */}

      <form
        onSubmit={create}
        className="space-y-4 p-6 bg-tech-card rounded-xl shadow-lg border border-gray-700"
      >

        <input
          className="border border-gray-700 bg-tech-bg text-gray-200 p-3 w-full rounded focus:outline-none focus:border-tech-accent"
          placeholder="Project Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="border border-gray-700 bg-tech-bg text-gray-200 p-3 w-full rounded focus:outline-none focus:border-tech-accent"
          placeholder="Project Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="4"
          required
        />

        <input
          className="border border-gray-700 bg-tech-bg text-gray-200 p-3 w-full rounded focus:outline-none focus:border-tech-accent"
          placeholder="GitHub Link"
          value={github}
          onChange={(e) => setGithub(e.target.value)}
        />

        <input
          className="border border-gray-700 bg-tech-bg text-gray-200 p-3 w-full rounded focus:outline-none focus:border-tech-accent"
          placeholder="Live Demo Link"
          value={demo}
          onChange={(e) => setDemo(e.target.value)}
        />

        <button
          className="bg-tech-accent hover:bg-cyan-500 text-black font-semibold px-6 py-3 rounded transition duration-200 w-full"
        >
          Add Project
        </button>

      </form>


      {/* Projects List */}

      <h3 className="text-xl font-bold mt-10 mb-6 text-gray-200">
        Existing Projects
      </h3>

      {loading ? (

        <p className="text-gray-400">Loading projects...</p>

      ) : projects.length === 0 ? (

        <p className="text-gray-400">No projects yet.</p>

      ) : (

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {projects.map((p) => (

            <div
              key={p._id}
              className="bg-tech-card border border-gray-700 p-5 rounded-xl shadow hover:border-tech-accent transition"
            >

              <h4 className="text-lg font-semibold text-tech-accent">
                {p.title}
              </h4>

              <p className="text-gray-400 text-sm mt-2">
                {p.description}
              </p>

              <div className="flex gap-4 mt-4 text-sm">

                {p.github && (
                  <a
                    href={p.github}
                    target="_blank"
                    rel="noreferrer"
                    className="text-tech-accent hover:underline"
                  >
                    GitHub
                  </a>
                )}

                {p.demo && (
                  <a
                    href={p.demo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-tech-accent hover:underline"
                  >
                    Live
                  </a>
                )}

              </div>

              <button
                onClick={() => remove(p._id)}
                className="mt-4 text-red-400 hover:text-red-500 text-sm"
              >
                Delete
              </button>

            </div>

          ))}

        </div>

      )}

    </section>
  );
}