export const normalizeOrigin = (value, production = false) => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      (production && url.protocol !== "https:")
    )
      return null;
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
};
export const originAllowed = (origin, allowedOrigins) =>
  !origin ||
  (typeof origin === "string" &&
    allowedOrigins.includes(normalizeOrigin(origin)));
