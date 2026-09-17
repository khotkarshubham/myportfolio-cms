import { useEffect, useState } from "react";
import API from "../../services/api";

export default function AdminUsers() {

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "editor" // ✅ FIXED
  });

  /* ---------------- LOAD ---------------- */

  const load = async () => {
    try {
      const res = await API.get("/admin/admins");
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ---------------- CREATE ---------------- */

  const createAdmin = async () => {
    if (!form.email || !form.password) {
      return alert("Email & Password required");
    }

    try {
      await API.post("/admin/admins", form);
      setForm({ email: "", password: "", role: "editor" }); // ✅ FIXED
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating admin");
    }
  };

  /* ---------------- DELETE ---------------- */

  const deleteAdmin = async (id) => {

    if (!confirm("Are you sure you want to delete this admin?")) return;

    try {
      await API.delete(`/admin/admins/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  /* ---------------- UPDATE ROLE ---------------- */

  const updateRole = async (id, role) => {
    try {
      await API.put(`/admin/admins/${id}`, { role });
      load();
    } catch (err) {
      alert("Update failed");
    }
  };

  /* ---------------- TOGGLE ACTIVE ---------------- */

  const toggleActive = async (admin) => {
    try {
      await API.put(`/admin/admins/${admin._id}`, {
        isActive: !admin.isActive
      });
      load();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 mt-10 animate-pulse">
        Loading admins...
      </div>
    );
  }

  return (

    <div className="space-y-6">

      <h2 className="text-2xl sm:text-3xl text-tech-accent font-bold">
        Admin Management 👑
      </h2>

      {/* 🔥 CREATE FORM */}

      <div className="bg-tech-card p-4 sm:p-6 rounded-xl space-y-3">

        <h3 className="text-tech-accent font-semibold">
          Create Admin
        </h3>

        <input
          placeholder="Email"
          className="w-full p-2 bg-slate-900 rounded"
          value={form.email}
          onChange={(e)=>setForm({...form,email:e.target.value})}
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full p-2 bg-slate-900 rounded"
          value={form.password}
          onChange={(e)=>setForm({...form,password:e.target.value})}
        />

        {/* ✅ FIXED ROLES */}

        <select
          className="w-full p-2 bg-slate-900 rounded"
          value={form.role}
          onChange={(e)=>setForm({...form,role:e.target.value})}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Admin</option> {/* label Admin but value editor */}
          <option value="superadmin">Super Admin</option>
        </select>

        <button
          onClick={createAdmin}
          className="bg-tech-accent px-4 py-2 rounded text-black w-full sm:w-auto"
        >
          Add Admin
        </button>

      </div>

      {/* 🔥 ADMIN LIST */}

      <div className="space-y-3">

        {admins.map(a => (

          <div
            key={a._id}
            className="
              bg-tech-card p-4 rounded-xl
              flex flex-col sm:flex-row
              sm:items-center sm:justify-between
              gap-3
            "
          >

            {/* INFO */}

            <div>
              <p className="font-semibold">{a.email}</p>
              <p className="text-sm text-gray-400">
                Role: {a.role}
              </p>
            </div>

            {/* ACTIONS */}

            <div className="flex flex-wrap gap-2 items-center">

              {/* ✅ FIXED ROLE SELECT */}

              <select
                value={a.role}
                onChange={(e)=>updateRole(a._id, e.target.value)}
                className="bg-slate-900 px-2 py-1 rounded text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>

              {/* ACTIVE */}

              <button
                onClick={()=>toggleActive(a)}
                className={`
                  px-3 py-1 rounded text-xs
                  ${a.isActive
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white"}
                `}
              >
                {a.isActive ? "Active" : "Disabled"}
              </button>

              {/* DELETE */}

              <button
                onClick={()=>deleteAdmin(a._id)}
                className="text-red-400 text-sm"
              >
                Delete
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}