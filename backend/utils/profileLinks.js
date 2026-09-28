export const validateHttpUrl = (value) => {
  const input = String(value ?? "").trim();
  if (!input) return "";
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input))
    return "";
  try {
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    );
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return "";
    return url.toString().length <= 300 ? url.toString() : "";
  } catch {
    return "";
  }
};

export const validateWhatsapp = (value) => {
  let input = String(value ?? "").trim();
  if (!input) return "";
  if (
    /^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(
      input,
    )
  ) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(input) ? input : `https://${input}`,
      );
      if (
        !["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(
          url.hostname,
        ) ||
        url.username ||
        url.password
      )
        return null;
      input =
        url.hostname === "wa.me"
          ? url.pathname.slice(1)
          : url.searchParams.get("phone") || "";
    } catch {
      return null;
    }
  }
  const normalized = input.replace(/[\s().-]/g, "").replace(/^\+/, "");
  return /^[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
};
