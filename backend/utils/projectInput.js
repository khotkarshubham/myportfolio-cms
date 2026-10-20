import { sanitizeText } from "./sanitizeHtml.js";

export const PROJECT_TYPES = [
  "repository",
  "application",
  "network",
  "infrastructure",
  "cloud",
];
export const PROJECT_STATUSES = ["completed", "live", "in-progress"];
const invalid = (message) => {
  throw Object.assign(new Error(message), { statusCode: 400 });
};

// Only explicitly supported fields reach MongoDB. Never coerce objects into strings.
export function projectInput(body = {}, existing = {}) {
  const text = (key, max, required = false) => {
    const value = body[key] === undefined ? existing[key] || "" : body[key];
    if (typeof value !== "string" || value.length > max)
      invalid(`${key} must be text of at most ${max} characters`);
    const cleaned = sanitizeText(value, max).trim();
    if (required && !cleaned) invalid(`${key} is required`);
    return cleaned;
  };
  const choice = (key, choices, fallback) => {
    const value =
      body[key] === undefined ? (existing[key] ?? fallback) : body[key];
    if (!choices.includes(value)) invalid(`Invalid project ${key}`);
    return value;
  };
  const link = (key) => {
    const value = text(key, 2048);
    if (!value) return "";
    let url;
    try {
      url = new URL(value);
    } catch {
      invalid(`${key} must be a valid HTTP/HTTPS URL`);
    }
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      invalid(`${key} must be an HTTP/HTTPS URL without credentials`);
    if (key === "github" && url.hostname !== "github.com")
      invalid("Repository URL must use github.com");
    return url.href;
  };
  let tech = body.tech === undefined ? existing.tech || [] : body.tech;
  if (typeof tech === "string") {
    try {
      tech = JSON.parse(tech);
    } catch {
      invalid("Technologies must be an array");
    }
  }
  if (
    !Array.isArray(tech) ||
    tech.length > 20 ||
    tech.some((item) => typeof item !== "string" || item.length > 50)
  )
    invalid("Use up to 20 technologies, each at most 50 characters");
  return {
    title: text("title", 150, true),
    description: text("description", 1000, true),
    outcome: text("outcome", 300),
    type: choice("type", PROJECT_TYPES, "repository"),
    status: choice("status", PROJECT_STATUSES, "completed"),
    github: link("github"),
    demo: link("demo"),
    tech: [
      ...new Set(
        tech.map((item) => sanitizeText(item, 50).trim()).filter(Boolean),
      ),
    ],
  };
}
