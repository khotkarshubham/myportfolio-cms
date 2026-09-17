import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  FaTimes
} from "react-icons/fa";
import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = localStorage.getItem("admin_role");
  const { dark, toggleTheme } = useTheme();

  const menu = [
    { name: "Dashboard", path: "/admin", icon: <FaChartBar /> },
    { name: "Analytics", path: "/admin/analytics", icon: <FaChartBar /> },
    { name: "Profile", path: "/admin/profile", icon: <FaUser /> },
    { name: "Projects", path: "/admin/projects", icon: <FaProjectDiagram /> },
    { name: "Blogs", path: "/admin/blogs", icon: <FaBlog /> },
    { name: "Skills", path: "/admin/skills", icon: <FaTools /> },
    {
      name: "Certifications",
      path: "/admin/certifications",
      icon: <FaCertificate />
    },
    {
      name: "Experience",
      path: "/admin/experience",
      icon: <FaBriefcase />
    },
    { name: "Messages", path: "/admin/messages", icon: <FaEnvelope /> },
    { name: "Users", path: "/admin/users", icon: <FaUsers />, roles: ["superadmin"] },
    {
      name: "Activity Logs",
      path: "/admin/logs",
      icon: <FaClipboardList />,
      roles: ["superadmin"]
    },
    {
      name: "Password",
      path: "/admin/change-password",
      icon: <FaKey />
    }
  ];

  /* ---------------- MOBILE BEHAVIOR ---------------- */

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

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const renderMenu = (mobile = false) => (
    <nav
      className="space-y-1"
      aria-label="Admin navigation"
    >
      {menu.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={mobile ? closeMobileMenu : undefined}
            aria-current={active ? "page" : undefined}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-200
              admin-nav-link ${active ? "is-active" : ""}
            `}
          >
            <span
              className={`
                text-lg shrink-0
                ${active ? "scale-110" : ""}
                transition-transform
              `}
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span className="text-sm font-medium">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="admin-layout">
      {/* ---------------- DESKTOP SIDEBAR ---------------- */}

      <aside
        className="admin-sidebar"
      >
        <div className="admin-sidebar-heading">
          <h2>
          Admin Panel
          </h2>
          <button
            type="button"
            className="admin-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            title={`Switch to ${dark ? "light" : "dark"} mode`}
          >
            {dark ? <FiSun /> : <FiMoon />}
          </button>
        </div>

        {renderMenu()}
      </aside>

      {/* ---------------- MOBILE HEADER ---------------- */}

      <header
        className="admin-mobile-header"
      >
        <h2>
          Admin Panel
        </h2>
        <div className="admin-mobile-actions">
          <button type="button" className="admin-theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
            {dark ? <FiSun /> : <FiMoon />}
          </button>
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation" aria-expanded={mobileOpen} className="admin-icon-button">
            <FaBars />
          </button>
        </div>
      </header>

      {/* ---------------- MOBILE OVERLAY ---------------- */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={closeMobileMenu}
          className="admin-mobile-overlay"
        />
      )}

      {/* ---------------- MOBILE DRAWER ---------------- */}

      <aside
        className={`
          admin-mobile-drawer
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Mobile admin navigation"
      >
        <div className="admin-sidebar-heading">
          <h2>
            Admin Panel
          </h2>

          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close admin navigation"
            className="admin-icon-button"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {renderMenu(true)}
      </aside>

      {/* ---------------- CONTENT ---------------- */}

      <main
        className="admin-content"
      >
        {children}
      </main>
    </div>
  );
}
