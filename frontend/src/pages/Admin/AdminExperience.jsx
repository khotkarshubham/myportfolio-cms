import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";

const emptyRole = () => ({
  role: "",
  startDate: "",
  endDate: "",
  description: "",
  technologies: "",
  promotionLabel: "",
  isCurrent: false,
  order: 0,
});

const emptyOrg = () => ({
  organization: "",
  industry: "",
  location: "",
  website: "",
  isVisible: true,
  order: 0,
  roles: [emptyRole()],
});

const toForm = (org) => ({
  organization: org.organization || "",
  industry: org.organizationMeta?.industry || "",
  location: org.organizationMeta?.location || "",
  website: org.organizationMeta?.website || "",
  isVisible: org.isVisible !== false,
  order: org.order || 0,
  roles: (org.roles || []).map((role, index) => ({
    _id: role._id,
    role: role.role || "",
    startDate: role.startDate || "",
    endDate: role.endDate || "",
    description: role.description || "",
    technologies: (role.technologies || []).join(", "),
    promotionLabel: role.promotionLabel || "",
    isCurrent: Boolean(role.isCurrent) || !role.endDate,
    order: role.order ?? index,
  })),
});

const toPayload = (form) => ({
  organization: form.organization,
  organizationMeta: {
    industry: form.industry,
    location: form.location,
    website: form.website,
  },
  isVisible: form.isVisible,
  order: Number(form.order || 0),
  roles: form.roles.map((role, index) => ({
    _id: role._id,
    role: role.role,
    startDate: role.startDate,
    endDate: role.isCurrent ? "" : role.endDate,
    description: role.description,
    technologies: role.technologies,
    promotionLabel: role.promotionLabel,
    isCurrent: role.isCurrent,
    order: index,
  })),
});

export default function AdminExperience() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyOrg());
  const [editingId, setEditingId] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await API.get("/admin/experiences");
    setList(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    load().catch(() => setError("Unable to load organizations."));
  }, []);

  const updateRole = (index, patch) => {
    setForm((current) => ({
      ...current,
      roles: current.roles.map((role, roleIndex) =>
        roleIndex === index ? { ...role, ...patch } : role
      ),
    }));
  };

  const moveRole = (index, direction) => {
    setForm((current) => {
      const next = [...current.roles];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, roles: next };
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = toPayload(form);
      let body = payload;

      if (logoFile) {
        body = new FormData();
        body.append("organization", payload.organization);
        body.append("isVisible", String(payload.isVisible));
        body.append("order", String(payload.order));
        body.append("organizationMeta", JSON.stringify(payload.organizationMeta));
        body.append("roles", JSON.stringify(payload.roles));
        body.append("companyLogo", logoFile);
      }

      if (editingId) {
        await API.put(`/admin/experiences/${editingId}`, body);
      } else {
        await API.post("/admin/experiences", body);
      }

      setForm(emptyOrg());
      setEditingId("");
      setLogoFile(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save organization.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (org) => {
    setEditingId(org._id);
    setForm(toForm(org));
    setLogoFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const moveOrg = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    await API.put("/admin/experiences/reorder", {
      ids: next.map((org) => org._id),
    });
  };

  const removeOrg = async (id) => {
    await API.delete(`/admin/experiences/${id}`);
    if (editingId === id) {
      setEditingId("");
      setForm(emptyOrg());
    }
    load();
  };

  const heading = useMemo(
    () => (editingId ? "Edit organization" : "New organization"),
    [editingId]
  );

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-tech-accent">Experience</h1>
      <p className="text-sm text-gray-400 max-w-3xl">
        Organizations are the primary record. Add every promotion as a role
        inside the same company so the public career journey can show growth
        in one place.
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="bg-tech-card p-6 rounded-xl border border-gray-700 space-y-4">
        <h2 className="text-xl font-semibold">{heading}</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            value={form.organization}
            placeholder="Organization"
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />
          <input
            value={form.industry}
            placeholder="Industry"
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />
          <input
            value={form.location}
            placeholder="Location"
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />
          <input
            value={form.website}
            placeholder="Website"
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="p-3 rounded bg-slate-900 border border-gray-700"
          />
        </div>

        <label className="block text-sm text-gray-400">
          Company logo
          <input
            type="file"
            accept="image/*"
            className="block mt-2"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
          />
          Visible on the public site
        </label>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Roles</h3>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, roles: [...form.roles, emptyRole()] })
              }
              className="text-sm text-tech-accent"
            >
              + Add Role
            </button>
          </div>

          {form.roles.map((role, index) => (
            <div
              key={role._id || index}
              className="border border-gray-700 rounded-xl p-4 space-y-3"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  value={role.role}
                  placeholder="Role title"
                  onChange={(e) => updateRole(index, { role: e.target.value })}
                  className="p-3 rounded bg-slate-900 border border-gray-700"
                />
                <input
                  value={role.promotionLabel}
                  placeholder="Promotion label (eg. PROMOTED)"
                  onChange={(e) =>
                    updateRole(index, { promotionLabel: e.target.value })
                  }
                  className="p-3 rounded bg-slate-900 border border-gray-700"
                />
                <input
                  value={role.startDate}
                  placeholder="Start date"
                  onChange={(e) =>
                    updateRole(index, { startDate: e.target.value })
                  }
                  className="p-3 rounded bg-slate-900 border border-gray-700"
                />
                <input
                  value={role.endDate}
                  placeholder="End date"
                  disabled={role.isCurrent}
                  onChange={(e) =>
                    updateRole(index, { endDate: e.target.value })
                  }
                  className="p-3 rounded bg-slate-900 border border-gray-700 disabled:opacity-50"
                />
              </div>

              <textarea
                value={role.description}
                placeholder="Description"
                onChange={(e) =>
                  updateRole(index, { description: e.target.value })
                }
                className="w-full p-3 rounded bg-slate-900 border border-gray-700"
              />

              <input
                value={role.technologies}
                placeholder="Technologies (AWS, Kubernetes, Terraform)"
                onChange={(e) =>
                  updateRole(index, { technologies: e.target.value })
                }
                className="w-full p-3 rounded bg-slate-900 border border-gray-700"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={role.isCurrent}
                    onChange={(e) =>
                      updateRole(index, {
                        isCurrent: e.target.checked,
                        endDate: e.target.checked ? "" : role.endDate,
                      })
                    }
                  />
                  Current role
                </label>

                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => moveRole(index, -1)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveRole(index, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-red-400"
                    onClick={() =>
                      setForm({
                        ...form,
                        roles: form.roles.filter((_, roleIndex) => roleIndex !== index),
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-tech-accent text-black px-6 py-2 rounded-lg font-semibold"
          >
            {editingId ? "Save Organization" : "Create Organization"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId("");
                setForm(emptyOrg());
                setLogoFile(null);
              }}
              className="px-6 py-2 rounded-lg border border-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {list.map((org, index) => (
          <article
            key={org._id}
            className="bg-tech-card border border-gray-700 rounded-xl p-5"
          >
            <div className="flex justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-tech-accent">
                  {org.organization}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {org.roles?.length || 0} roles · {org.startDate} — {org.endDate || "Present"}
                  {org.isVisible === false ? " · Hidden" : ""}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {(org.roles || []).map((role) => role.role).join(" → ")}
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button" className="text-sm" onClick={() => moveOrg(index, -1)}>↑</button>
                <button type="button" className="text-sm" onClick={() => moveOrg(index, 1)}>↓</button>
                <button
                  type="button"
                  className="text-sm text-tech-accent"
                  onClick={() => startEdit(org)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm text-red-400"
                  onClick={() => removeOrg(org._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
