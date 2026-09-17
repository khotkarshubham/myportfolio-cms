const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const SERVER_BASE = API_BASE.replace(/\/api\/?$/, "");

export const assetUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SERVER_BASE}${value.startsWith("/") ? value : `/${value}`}`;
};

export default assetUrl;
