import { useEffect, useState } from "react";
import API from "../../services/api";
import { FaTrash } from "react-icons/fa";

export default function AdminCertifications(){

  const [certs,setCerts]=useState([]);

  const [form,setForm]=useState({
    name:"",
    url:"",
    issuer:"",
    year:""
  });

  const load=async()=>{

    const res=await API.get("/public/certifications");

    setCerts(res.data);

  };

  useEffect(()=>{

    load();

  },[]);

  const add=async()=>{

    if(!form.name || !form.url) return;

    await API.post("/admin/certifications",form);

    setForm({
      name:"",
      url:"",
      issuer:"",
      year:""
    });

    load();

  };

  const del=async(id)=>{

    await API.delete("/admin/certifications/"+id);

    load();

  };

  return(

    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-tech-accent">
        Certifications Manager
      </h1>

      {/* ADD FORM */}

      <div className="bg-tech-card p-6 rounded-xl border border-gray-700 space-y-4 max-w-xl">

        <input
          value={form.name}
          placeholder="Certification Name"
          onChange={(e)=>setForm({...form,name:e.target.value})}
          className="w-full p-3 bg-slate-900 border border-gray-700 rounded"
        />

        <input
          value={form.url}
          placeholder="Credential Verification URL"
          onChange={(e)=>setForm({...form,url:e.target.value})}
          className="w-full p-3 bg-slate-900 border border-gray-700 rounded"
        />

        <input
          value={form.issuer}
          placeholder="Issuer (eg. AWS, CNCF)"
          onChange={(e)=>setForm({...form,issuer:e.target.value})}
          className="w-full p-3 bg-slate-900 border border-gray-700 rounded"
        />

        <input
          value={form.year}
          placeholder="Year (eg. 2024)"
          onChange={(e)=>setForm({...form,year:e.target.value})}
          className="w-full p-3 bg-slate-900 border border-gray-700 rounded"
        />

        <button
          onClick={add}
          className="
          bg-tech-accent
          text-black
          px-6 py-2
          rounded-lg
          font-semibold
          hover:scale-105
          transition
          "
        >
          Add Certification
        </button>

      </div>


      {/* LIST */}

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl">

        {certs.map(c=>(

          <div
            key={c._id}
            className="
            bg-tech-card
            border border-gray-700
            rounded-xl
            p-5
            flex justify-between items-center
            "
          >

            <div>

              <h3 className="text-tech-accent font-semibold">
                {c.name}
              </h3>

              <p className="text-gray-400 text-sm">
                {[c.issuer, c.year].filter(Boolean).join(" · ") || "Credential"}
              </p>
              <p className="text-gray-400 text-sm break-all">
                {c.url}
              </p>

            </div>

            <button
              onClick={()=>del(c._id)}
              className="text-red-400 hover:text-red-500"
            >
              <FaTrash/>
            </button>

          </div>

        ))}

      </div>

    </div>

  );

}