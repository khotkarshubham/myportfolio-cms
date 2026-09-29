import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "portfolio-theme";
const ThemeContext = createContext(null);

const getPreferredDark = () => {
  if (typeof window === "undefined") return true;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;

  return true;
};

const applyTheme = (dark) => {
  const theme = dark ? "dark" : "light";
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", dark ? "#06111c" : "#eef1ec");
  }
};

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(getPreferredDark);

  useEffect(() => {
    applyTheme(dark);
    window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  const value = useMemo(
    () => ({
      dark,
      setDark,
      toggleTheme: () => setDark((current) => !current),
    }),
    [dark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
