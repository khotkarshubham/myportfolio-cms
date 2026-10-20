export function contentSecurityPolicy(apiUrl = "/api") {
  let apiOrigin = "";
  if (!apiUrl.startsWith("/") || apiUrl.startsWith("//")) {
    const url = new URL(apiUrl);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("Invalid VITE_API_URL");
    apiOrigin = url.origin;
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' https: data: blob:",
    `connect-src 'self' ${apiOrigin} https://api.github.com https://github-contributions-api.jogruber.de`.replace(
      /\s+/g,
      " ",
    ),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
