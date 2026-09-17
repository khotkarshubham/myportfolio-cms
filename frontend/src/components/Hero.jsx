import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

import TerminalIntro from "./TerminalIntro";

export default function Hero() {

  const [profile, setProfile] = useState(null);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    API.get("/public/profile")
      .then(res => setProfile(res.data))
      .catch(() => {});
  }, []);

  const BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api","")
    : "http://localhost:4000";

  const imageUrl = profile?.image
    ? `${BASE}${profile.image}`
    : "/Profile.png";

  const resumeUrl = profile?.resume
    ? `${BASE}${profile.resume}`
    : "/resume";

  return (

    <section className="min-h-[60vh] flex items-center px-3 sm:px-6">

      <div className="
        max-w-6xl mx-auto
        grid grid-cols-1 lg:grid-cols-2
        gap-6 sm:gap-8 lg:gap-12
        items-center w-full
      ">

        {/* LEFT */}

        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">

          {/* IMAGE */}

          <motion.img
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            src={imageUrl}
            className="
              w-24 h-24
              sm:w-32 sm:h-32
              lg:w-40 lg:h-40
              rounded-full object-cover
              border-4 border-tech-accent
              shadow-lg
            "
          />

          {/* NAME */}

          <motion.h1
            initial={{ opacity:0, y:-10 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.2 }}
            className="mt-3 text-xl sm:text-2xl lg:text-4xl font-bold"
          >
            {profile?.name || "Shubham Khotkar"}
          </motion.h1>

          {/* BADGE */}

          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ delay:0.3 }}
            className="
              mt-2 inline-flex items-center gap-2
              bg-green-500/10 text-green-400
              px-3 py-1 rounded-full
              text-xs sm:text-sm
              border border-green-500/30
            "
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Open to Work • Immediate Joiner
          </motion.div>

          {/* TITLE */}

          <p className="text-gray-400 mt-2 sm:mt-3 max-w-md text-sm sm:text-base">
            {profile?.title}
          </p>

          {/* BUTTONS */}

          <div className="
            flex flex-col sm:flex-row
            gap-3
            mt-4
            w-full sm:w-auto
          ">

            <button
              onClick={() => setShowResume(true)}
              className="
                w-full sm:w-auto
                bg-tech-accent text-black
                px-5 py-2 sm:py-3
                rounded-lg font-semibold
                text-sm sm:text-base
                hover:opacity-90 transition
              "
            >
              View Resume
            </button>

            <Link
              to="/projects"
              className="
                w-full sm:w-auto text-center
                border border-tech-accent
                px-5 py-2 sm:py-3
                rounded-lg text-tech-accent
                text-sm sm:text-base
                hover:bg-tech-accent hover:text-black
                transition
              "
            >
              View Projects
            </Link>

          </div>

        </div>

        {/* RIGHT */}

        <div className="flex justify-center w-full mt-6 lg:mt-0">
          <div className="w-full max-w-md lg:max-w-xl">
            <TerminalIntro />
          </div>
        </div>

      </div>

      {/* 🔥 RESUME MODAL */}

      {showResume && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3">

          <div className="w-full max-w-4xl h-[85vh] bg-tech-card rounded-xl overflow-hidden flex flex-col">

            <div className="flex justify-between items-center p-3 border-b border-gray-700">

              <span className="text-tech-accent font-semibold">
                Resume Preview
              </span>

              <button
                onClick={() => setShowResume(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>

            </div>

            <iframe
              src={resumeUrl}
              className="w-full flex-1"
            />

          </div>

        </div>
      )}

    </section>
  );
}