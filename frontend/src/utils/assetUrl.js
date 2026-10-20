const API_BASE = import.meta.env.VITE_API_URL || "/api";
const SERVER_BASE = API_BASE.replace(/\/api\/?$/, "");

export const assetUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  // Reject scheme-relative URLs and alternate schemes, including backslash normalization.
  if (value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return "";
  return `${SERVER_BASE}${value.startsWith("/") ? value : `/${value}`}`;
};

export default assetUrl;
