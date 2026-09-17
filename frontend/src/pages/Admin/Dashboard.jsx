import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { motion } from "framer-motion";

import {
  FaUser,
  FaProjectDiagram,
  FaBlog,
  FaTools,
  FaEnvelope,
  FaKey,
  FaCertificate,
  FaBriefcase,
  FaChartBar,
  FaUsers,
  FaFileAlt
} from "react-icons/fa";

export default function Dashboard() {

  const navigate = useNavigate();

  const role = localStorage.getItem("admin_role"); // ✅ SAFE ADD

  const [stats, setStats] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    resumeClicks: 0
  });

  useEffect(() => {
    API.get("/admin/analytics")
      .then(res => setStats(res.data))
      .catch(() => {});
  }, []);

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role"); // ✅ SAFE ADD
    navigate("/admin/login");
  };

  /* 🔥 CARDS (UNCHANGED + NEW ADDED BELOW) */

  const cards = [
    {
      title: "Analytics",
      desc: "Traffic, charts & user insights",
      icon: <FaChartBar />,
      link: "/admin/analytics"
    },
    {
      title: "Manage Profile",
      desc: "Update profile info",
      icon: <FaUser />,
      link: "/admin/profile"
    },
    {
      title: "Projects",
      desc: "Manage portfolio projects",
      icon: <FaProjectDiagram />,
      link: "/admin/projects"
    },
    {
      title: "Blogs",
      desc: "Manage blog content",
      icon: <FaBlog />,
      link: "/admin/blogs"
    },
    {
      title: "Skills",
      desc: "Manage tech stack",
      icon: <FaTools />,
      link: "/admin/skills"
    },
    {
      title: "Certifications",
      desc: "Manage certifications",
      icon: <FaCertificate />,
      link: "/admin/certifications"
    },
    {
      title: "Work Experience",
      desc: "Manage experience",
      icon: <FaBriefcase />,
      link: "/admin/experience"
    },
    {
      title: "Inbox",
      desc: "View messages",
      icon: <FaEnvelope />,
      link: "/admin/messages"
    },

    /* 🔥 NEW FEATURES (SAFE ADD) */

    ...(role === "superadmin" ? [
      {
        title: "Admin Users",
        desc: "Manage admins & roles",
        icon: <FaUsers />,
        link: "/admin/users"
      },
      {
        title: "Activity Logs",
        desc: "Track admin actions",
        icon: <FaFileAlt />,
        link: "/admin/logs"
      }
    ] : []),

    {
      title: "Change Password",
      desc: "Update password",
      icon: <FaKey />,
      link: "/admin/change-password"
    }
  ];

  return (

    <div className="space-y-6 sm:space-y-8">

      {/* 🔥 HEADER */}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-tech-accent">
            Admin Dashboard
          </h2>

          <p className="text-gray-400 text-sm mt-1">
            Welcome back 👋 {role && `(${role})`}
          </p>
        </div>

        <button
          onClick={logout}
          className="
            w-full sm:w-auto
            bg-red-600 hover:bg-red-700
            text-white px-5 py-2 rounded-lg font-semibold
            transition shadow-md
          "
        >
          Logout
        </button>

      </div>

      {/* 🔥 STATS (UNCHANGED) */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {[{
          title: "Visitors",
          value: stats.totalVisits,
          icon: <FaChartBar />,
          color: "text-cyan-400"
        },
        {
          title: "Users",
          value: stats.uniqueVisitors,
          icon: <FaUsers />,
          color: "text-green-400"
        },
        {
          title: "Resume Clicks",
          value: stats.resumeClicks,
          icon: <FaFileAlt />,
          color: "text-yellow-400"
        }].map((item, i) => (

          <motion.div
            key={i}
            onClick={() => navigate("/admin/analytics")}
            whileHover={{ scale: 1.04 }}
            className="
              cursor-pointer
              bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800
              border border-gray-700
              p-4 sm:p-5
              rounded-xl
              shadow-lg
              hover:shadow-cyan-500/20
              transition-all
            "
          >

            <div className={`text-2xl mb-2 ${item.color}`}>
              {item.icon}
            </div>

            <h3 className="text-sm sm:text-base font-semibold">
              {item.title}
            </h3>

            <p className="text-xl sm:text-2xl font-bold mt-1 text-tech-accent">
              {item.value}
            </p>

          </motion.div>

        ))}

      </div>

      {/* 🔥 ANALYTICS CTA (UNCHANGED) */}

      <div className="
        bg-gradient-to-r from-cyan-500/10 to-blue-500/10
        border border-cyan-500/20
        rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4
      ">

        <div>
          <h3 className="text-tech-accent font-semibold">
            Want deeper insights?
          </h3>
          <p className="text-gray-400 text-sm">
            View charts, traffic trends & user behavior
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/analytics")}
          className="
            bg-tech-accent text-black
            px-5 py-2 rounded-lg font-semibold
            hover:opacity-90 transition
          "
        >
          Open Analytics →
        </button>

      </div>

      {/* 🔥 MANAGEMENT */}

      <h3 className="text-lg sm:text-xl font-semibold text-gray-300">
        Management
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {cards.map((card, i) => (

          <motion.div key={i} whileHover={{ scale: 1.03 }}>

            <Link
              to={card.link}
              className="
                group block
                bg-tech-card
                p-4 sm:p-5
                rounded-xl
                border border-gray-700
                hover:border-tech-accent
                transition
                shadow-md hover:shadow-tech-accent/20
              "
            >

              <div className="flex items-center gap-3">

                <div className="text-xl sm:text-2xl text-tech-accent">
                  {card.icon}
                </div>

                <div>

                  <h3 className="text-sm sm:text-base font-semibold text-tech-accent">
                    {card.title}
                  </h3>

                  <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    {card.desc}
                  </p>

                </div>

              </div>

            </Link>

          </motion.div>

        ))}

      </div>

    </div>

  );

}