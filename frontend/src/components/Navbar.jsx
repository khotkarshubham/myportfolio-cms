import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiArrowUpRight,
  FiGitPullRequest,
  FiHome,
  FiLayers,
  FiMoon,
  FiSend,
  FiSun,
  FiTerminal,
} from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import ProfileSection from "./ProfileSection";

function ThemePull() {
  const { dark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-pull ${dark ? "is-dark" : "is-light"}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      <span className="theme-track" aria-hidden="true">
        <span className="theme-icon theme-sun"><FiSun /></span>
        <span className="theme-icon theme-moon"><FiMoon /></span>
        <span className="theme-orb" />
      </span>
    </button>
  );
}

export default function Navbar() {
  const location = useLocation();
  const profileWrapRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { name: "Home", path: "/", icon: <FiHome /> },
    { name: "Work", path: "/projects", icon: <FiLayers /> },
    { name: "Resume", path: "/resume", icon: <FiTerminal /> },
    { name: "Writing", path: "/blog", icon: <FiGitPullRequest /> },
    { name: "Contact", path: "/contact", icon: <FiSend /> },
  ];

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileWrapRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="site-nav-wrap">
      <nav className="site-nav" aria-label="Primary navigation">
        <div
          ref={profileWrapRef}
          className={`nav-profile-wrap ${profileOpen ? "is-open" : ""}`}
          onMouseEnter={() => setProfileOpen(true)}
          onMouseLeave={() => setProfileOpen(false)}
        >
          <button
            type="button"
            className="brand-mark"
            aria-label="Open about profile"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="brand-dot" />
            <span>SK</span>
          </button>

          <ProfileSection open={profileOpen} />
        </div>

        <div className="nav-links">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-actions">
          <Link to="/contact" className="nav-availability">
            Available for work <FiArrowUpRight />
          </Link>
          <ThemePull />
        </div>
      </nav>
    </header>
  );
}
