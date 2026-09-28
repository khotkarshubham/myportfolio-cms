import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaUser,
  FaProjectDiagram,
  FaBlog,
  FaTools,
  FaEnvelope,
  FaKey,
  FaCertificate,
  FaBriefcase,
  FaUsers,
  FaClipboardList,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";
import { setToken } from "../services/api";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = localStorage.getItem("admin_role");
  const email = localStorage.getItem("admin_email");

  const menu = [
    { name: "Dashboard", path: "/admin", icon: <FaChartBar /> },
    { name: "Analytics", path: "/admin/analytics", icon: <FaChartBar /> },
    { name: "Profile", path: "/admin/profile", icon: <FaUser /> },
    { name: "Projects", path: "/admin/projects", icon: <FaProjectDiagram /> },
    { name: "Blogs", path: "/admin/blogs", icon: <FaBlog /> },
    { name: "Skills", path: "/admin/skills", icon: <FaTools /> },
    { name: "Certifications", path: "/admin/certifications", icon: <FaCertificate /> },
    { name: "Experience", path: "/admin/experience", icon: <FaBriefcase /> },
    { name: "Messages", path: "/admin/messages", icon: <FaEnvelope /> },
    { name: "Users", path: "/admin/users", icon: <FaUsers />, roles: ["superadmin"] },
    { name: "Activity Logs", path: "/admin/logs", icon: <FaClipboardList />, roles: ["superadmin"] },
    { name: "Password", path: "/admin/change-password", icon: <FaKey /> },
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const closeMobileMenu = () => setMobileOpen(false);

  const logout = () => {
    setToken(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_email");
    navigate("/admin/login");
  };

  const renderMenu = (mobile = false) => (
    <nav className="admin-nav" aria-label="Admin navigation">
      {menu
        .filter((item) => !item.roles || item.roles.includes(role))
        .map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={mobile ? closeMobileMenu : undefined}
              aria-current={active ? "page" : undefined}
              className={`admin-nav-link ${active ? "is-active" : ""}`}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
    </nav>
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <div>
            <p className="admin-kicker">CMS</p>
            <h2>Admin Panel</h2>
          </div>
          <ThemeToggle />
        </div>

        {renderMenu()}

        <div className="admin-sidebar-foot">
          <p className="admin-session">
            <strong>{role || "admin"}</strong>
            <span>{email || "Signed in"}</span>
          </p>
          <button type="button" className="admin-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <header className="admin-mobile-header">
        <h2>Admin Panel</h2>
        <div className="admin-mobile-actions">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
            aria-expanded={mobileOpen}
            className="admin-icon-button"
          >
            <FaBars />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={closeMobileMenu}
          className="admin-mobile-overlay"
        />
      )}

      <aside
        className={`admin-mobile-drawer ${mobileOpen ? "is-open" : ""}`}
        aria-label="Mobile admin navigation"
        aria-hidden={!mobileOpen}
        inert={mobileOpen ? undefined : ""}
      >
        <div className="admin-sidebar-heading">
          <h2>Admin Panel</h2>
          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close admin navigation"
            className="admin-icon-button"
          >
            <FaTimes />
          </button>
        </div>
        {renderMenu(true)}
        <div className="admin-sidebar-foot">
          <button type="button" className="admin-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}
