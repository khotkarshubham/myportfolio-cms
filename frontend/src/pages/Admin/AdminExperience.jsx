import { useEffect, useState } from "react";
import API from "../../services/api";
import { motion } from "framer-motion";
import { FaBriefcase, FaTrash } from "react-icons/fa";

export default function AdminExperience() {

  const [list, setList] = useState([]);

  const [form, setForm] = useState({
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    description: "",
    technologies: ""
  });

  const load = async () => {

    const res = await API.get("/public/experiences");

    setList(res.data);

  };

  useEffect(() => {

    load();

  }, []);

  const add = async () => {

    const payload = {
      ...form,
      technologies: form.technologies.split(",").map(t => t.trim())
    };

    await API.post("/admin/experiences", payload);

    setForm({
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      description: "",
      technologies: ""
    });

    load();

  };

  const del = async (id) => {

    await API.delete("/admin/experiences/" + id);

    load();

  };

  return (

    <div className="space-y-12">

      <h1 className="text-3xl font-bold text-tech-accent">
        Work Experience Manager
      </h1>


      {/* EXPERIENCE FORM */}

      <div className="bg-tech-card p-6 rounded-xl border border-gray-700 space-y-4">

        <div className="grid md:grid-cols-2 gap-4">

          <input
            value={form.company}
            placeholder="Company"
            onChange={(e)=>setForm({...form,company:e.target.value})}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />

          <input
            value={form.role}
            placeholder="Role"
            onChange={(e)=>setForm({...form,role:e.target.value})}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />

          <input
            value={form.startDate}
            placeholder="Start Date (eg. Jan 2023)"
            onChange={(e)=>setForm({...form,startDate:e.target.value})}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />

          <input
            value={form.endDate}
            placeholder="End Date (eg. Present)"
            onChange={(e)=>setForm({...form,endDate:e.target.value})}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />

        </div>

        <textarea
          value={form.description}
          placeholder="Description"
          onChange={(e)=>setForm({...form,description:e.target.value})}
          className="w-full p-3 rounded bg-slate-900 border border-gray-700"
        />

        <input
          value={form.technologies}
          placeholder="Technologies (AWS, Kubernetes, Terraform)"
          onChange={(e)=>setForm({...form,technologies:e.target.value})}
          className="w-full p-3 rounded bg-slate-900 border border-gray-700"
        />

        <button
          onClick={add}
          className="
          bg-tech-accent
          text-black
          px-6
          py-2
          rounded-lg
          font-semibold
          hover:scale-105
          transition
          "
        >
          Add Experience
        </button>

      </div>


      {/* EXPERIENCE TIMELINE PREVIEW */}

      <div className="space-y-8">

        {list.map((exp,i)=>(

          <motion.div
            key={exp._id}
            initial={{opacity:0,y:20}}
            animate={{opacity:1,y:0}}
            transition={{delay:i*0.1}}
            className="
            relative
            bg-tech-card
            border border-gray-700
            p-6
            rounded-xl
            shadow-lg
            "
          >

            {/* Timeline dot */}

            <div className="
            absolute
            left-[-10px]
            top-8
            w-5
            h-5
            bg-tech-accent
            rounded-full
            shadow-lg
            "></div>


            <div className="flex justify-between items-start">

              <div>

                <h3 className="text-xl font-semibold text-tech-accent flex items-center gap-2">

                  <FaBriefcase/>

                  {exp.role}

                </h3>

                <p className="text-gray-300 mt-1">

                  {exp.company}

                </p>

                <p className="text-gray-500 text-sm mt-1">

                  {exp.startDate} — {exp.endDate}

                </p>

              </div>

              <button
                onClick={()=>del(exp._id)}
                className="
                text-red-400
                hover:text-red-500
                transition
                "
              >
                <FaTrash/>
              </button>

            </div>


            <p className="text-gray-400 mt-4">
              {exp.description}
            </p>


            {/* TECHNOLOGY BADGES */}

            <div className="flex flex-wrap gap-2 mt-4">

              {exp.technologies?.map((tech,i)=>(
                <span
                  key={i}
                  className="
                  bg-slate-800
                  text-tech-accent
                  text-xs
                  px-3
                  py-1
                  rounded-full
                  border border-gray-700
                  "
                >
                  {tech}
                </span>
              ))}

            </div>

          </motion.div>

        ))}

      </div>

    </div>

  );

}