import { useEffect, useState } from "react";
import API from "../../services/api";

export default function Profile() {

  const [profile, setProfile] = useState({
    name: "",
    title: "",
    image: "",
    resume: ""
  });

  const [image, setImage] = useState(null);
  const [resume, setResume] = useState(null);

  const [preview, setPreview] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:4000";

  const loadProfile = async () => {

    try {

      const res = await API.get("/public/profile");

      setProfile(res.data);

      if (res.data.image) {
        setPreview(`${API_BASE}${res.data.image}`);
      } else {
        setPreview("/Profile.png");
      }

    } catch (err) {
      console.error("Failed to load profile:", err);
    }

  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleResume = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setResume(file);
  };

  const submit = async (e) => {

    e.preventDefault();

    const form = new FormData();

    form.append("name", profile.name);
    form.append("title", profile.title);

    if (image) form.append("image", image);
    if (resume) form.append("resume", resume);

    try {

      await API.put("/admin/profile", form);

      alert("Profile Updated 🚀");
      loadProfile();

    } catch (err) {
      console.error("Profile update failed:", err);
    }

  };

  return (

    <div className="flex justify-center">

      <div className="w-full max-w-xl space-y-6">

        <h1 className="text-3xl font-bold text-tech-accent text-center">
          Manage Profile
        </h1>

        {/* PROFILE IMAGE */}

        <div className="flex justify-center">
          <img
            src={preview || "/Profile.png"}
            className="w-32 h-32 rounded-full object-cover border-4 border-tech-accent shadow-lg"
          />
        </div>

        {/* FORM */}

        <form onSubmit={submit} className="space-y-5">

          {/* NAME */}

          <div>
            <label className="text-sm text-gray-400">Full Name</label>
            <input
              className="w-full mt-1 p-3 bg-tech-card border border-gray-700 rounded"
              value={profile.name}
              onChange={(e) =>
                setProfile({ ...profile, name: e.target.value })
              }
            />
          </div>

          {/* TITLE */}

          <div>
            <label className="text-sm text-gray-400">Professional Title</label>
            <textarea
              className="w-full mt-1 p-3 bg-tech-card border border-gray-700 rounded"
              value={profile.title}
              onChange={(e) =>
                setProfile({ ...profile, title: e.target.value })
              }
            />
          </div>

          {/* IMAGE UPLOAD */}

          <div>
            <label className="text-sm text-gray-400">
              Upload Profile Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="
              w-full mt-2 text-sm text-gray-300
              file:bg-tech-accent file:text-black
              file:px-4 file:py-2 file:rounded file:border-0
              "
            />
          </div>

          {/* RESUME UPLOAD */}

          <div>
            <label className="text-sm text-gray-400">
              Upload Resume (PDF)
            </label>

            <input
              type="file"
              accept=".pdf"
              onChange={handleResume}
              className="
              w-full mt-2 text-sm text-gray-300
              file:bg-green-400 file:text-black
              file:px-4 file:py-2 file:rounded file:border-0
              "
            />
          </div>

          {/* CURRENT RESUME */}

          {profile.resume && (
            <div className="text-sm">
              <span className="text-gray-400">Current Resume: </span>
              <a
                href={`${API_BASE}${profile.resume}`}
                target="_blank"
                rel="noreferrer"
                className="text-tech-accent underline"
              >
                View Resume
              </a>
            </div>
          )}

          {/* BUTTON */}

          <button
            className="
            w-full
            bg-tech-accent
            text-black
            py-3
            rounded-lg
            font-semibold
            hover:opacity-90
            transition
            "
          >
            Save Profile
          </button>

        </form>

      </div>

    </div>

  );

}