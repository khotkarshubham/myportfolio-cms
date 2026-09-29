import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { dark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-pull ${dark ? "is-dark" : "is-light"} ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      aria-pressed={dark}
    >
      <span className="theme-track" aria-hidden="true">
        <span className="theme-icon theme-sun">
          <FiSun />
        </span>
        <span className="theme-icon theme-moon">
          <FiMoon />
        </span>
        <span className="theme-orb" />
      </span>
    </button>
  );
}
