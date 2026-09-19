import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
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
  FaFileAlt,
} from "react-icons/fa";

export default function Dashboard() {
  const role = localStorage.getItem("admin_role");
  const email = localStorage.getItem("admin_email");
  const [stats, setStats] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    resumeClicks: 0,
  });

  useEffect(() => {
    API.get("/admin/analytics")
      .then((res) => setStats(res.data || {}))
      .catch(() => {});
  }, []);

  const cards = [
    { title: "Analytics", desc: "Traffic, charts and visitor insights", icon: <FaChartBar />, link: "/admin/analytics" },
    { title: "Manage Profile", desc: "Name, photo, resume and socials", icon: <FaUser />, link: "/admin/profile" },
    { title: "Projects", desc: "Portfolio case studies", icon: <FaProjectDiagram />, link: "/admin/projects" },
    { title: "Blogs", desc: "Writing and announcements", icon: <FaBlog />, link: "/admin/blogs" },
    { title: "Skills", desc: "Tech stack chips", icon: <FaTools />, link: "/admin/skills" },
    { title: "Certifications", desc: "Credentials and badges", icon: <FaCertificate />, link: "/admin/certifications" },
    { title: "Work Experience", desc: "Companies, roles and promotions", icon: <FaBriefcase />, link: "/admin/experience" },
    { title: "Inbox", desc: "Contact form messages", icon: <FaEnvelope />, link: "/admin/messages" },
    ...(role === "superadmin"
      ? [
          { title: "Admin Users", desc: "Roles and access", icon: <FaUsers />, link: "/admin/users" },
          { title: "Activity Logs", desc: "Audit trail", icon: <FaFileAlt />, link: "/admin/logs" },
        ]
      : []),
    { title: "Change Password", desc: "Update sign-in credentials", icon: <FaKey />, link: "/admin/change-password" },
  ];

  const metrics = [
    { title: "Visitors", value: stats.totalVisits ?? 0, icon: <FaChartBar /> },
    { title: "Unique users", value: stats.uniqueVisitors ?? 0, icon: <FaUsers /> },
    { title: "Resume clicks", value: stats.resumeClicks ?? 0, icon: <FaFileAlt /> },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Overview</p>
          <h1>Dashboard</h1>
          <p className="admin-page-copy">
            Welcome back{email ? `, ${email}` : ""}{role ? ` · ${role}` : ""}.
          </p>
        </div>
      </div>

      <div className="admin-stat-grid">
        {metrics.map((item) => (
          <Link to="/admin/analytics" className="admin-stat-card" key={item.title}>
            <span className="admin-stat-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="admin-stat-label">{item.title}</span>
            <strong>{item.value}</strong>
          </Link>
        ))}
      </div>

      <div className="admin-insight">
        <div>
          <h2>Traffic and behaviour</h2>
          <p>Open analytics for trends, countries and top pages.</p>
        </div>
        <Link to="/admin/analytics" className="admin-primary-link">
          Open analytics
        </Link>
      </div>

      <h2 className="admin-section-title">Management</h2>
      <div className="admin-mgmt-grid">
        {cards.map((card) => (
          <Link to={card.link} className="admin-mgmt-card" key={card.link}>
            <span className="admin-mgmt-icon" aria-hidden="true">
              {card.icon}
            </span>
            <span>
              <strong>{card.title}</strong>
              <small>{card.desc}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
