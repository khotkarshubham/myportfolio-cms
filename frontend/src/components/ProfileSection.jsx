import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import API from "../services/api";

export default function ProfileSection({ open }) {
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    API.get("/public/profile")
      .then((res) => {
        setProfile(res.data?.data || res.data);
      })
      .catch(() => {
        setProfile(null);
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:4000";

  const imageUrl = profile?.image ? `${BASE}${profile.image}` : null;

  const decodeHtmlEntities = (value) => {
    if (!value) return value;

    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  };

  const profileTitle = decodeHtmlEntities(profile?.title);

  return (
    <AnimatePresence>
      {open && (
        <motion.article
          className="profile-popover"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.985 }}
          transition={{
            duration: 0.18,
            ease: [0.22, 0.8, 0.25, 1],
          }}
          role="dialog"
          aria-label="About Shubham Khotkar"
        >
          <div className="profile-popover-photo-wrap">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={profile?.name || "Profile"}
                className="profile-popover-photo"
              />
            ) : (
              <div className="profile-popover-photo-placeholder">
                {loaded ? "NO PHOTO" : ""}
              </div>
            )}
          </div>

          <div className="profile-popover-content">
            <span className="profile-popover-label">
              <span />
              About
            </span>

            <h2>{profile?.name || "—"}</h2>

            <p>
              {profileTitle ||
                "Professional profile information is not available yet."}
            </p>
          </div>
        </motion.article>
      )}
    </AnimatePresence>
  );
}