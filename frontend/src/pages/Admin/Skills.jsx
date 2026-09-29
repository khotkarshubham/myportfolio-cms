import { useEffect, useState } from "react";
import API from "../../services/api";

export default function Skills() {

  const [skills, setSkills] = useState([]);
  const [name, setName] = useState("");

  const token = localStorage.getItem("admin_token");

  const loadSkills = async () => {

    try {

      const res = await API.get("/public/skills");

      setSkills(Array.isArray(res.data) ? res.data : []);

    } catch (err) {

      console.error("Failed to load skills:", err);

    }

  };


  const createSkill = async (e) => {

    e.preventDefault();

    if (!name.trim()) return;

    try {

      await API.post(
        "/admin/skills",
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setName("");

      loadSkills();

    } catch (err) {

      console.error("Failed to create skill:", err);

    }

  };


  const deleteSkill = async (id) => {

    try {

      await API.delete(
        `/admin/skills/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      loadSkills();

    } catch (err) {

      console.error("Failed to delete skill:", err);

    }

  };


  useEffect(() => {

    loadSkills();

  }, []);


  return (

    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-tech-accent">
        Manage Skills
      </h1>


      {/* Add skill */}

      <form
        onSubmit={createSkill}
        className="bg-tech-card border border-gray-700 p-6 rounded-xl flex gap-4"
      >

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skill name (example: docker)"
          className="flex-1 bg-transparent border border-gray-700 p-3 rounded text-gray-200"
        />

        <button
          className="bg-tech-accent text-black px-6 py-2 rounded"
        >
          Add
        </button>

      </form>


      {/* Skill list */}

      <div className="grid md:grid-cols-3 gap-4">

        {skills.map((s) => (

          <div
            key={s._id}
            className="bg-tech-card border border-gray-700 p-4 rounded-lg flex justify-between items-center"
          >

            <span className="text-gray-200">
              {s.name}
            </span>

            <button
              onClick={() => deleteSkill(s._id)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>

          </div>

        ))}

      </div>

    </div>

  );

}