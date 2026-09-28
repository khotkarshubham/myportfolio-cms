export const SOCIAL_PROFILES = {
  email: "khotkarshubham@hotmail.com",
  github: "https://github.com/khotkarshubham",
  linkedin: "https://www.linkedin.com/in/shubhamkhotkar/",
  instagram: "https://www.instagram.com/khotkarshubham/",
  whatsapp: import.meta.env.VITE_WHATSAPP_E164 || "919270702964",
};

const toHttpUrl = (value = "") => {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "";
};

const toWhatsAppUrl = (value = "") => {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};

export const resolveSocials = (profile = {}) => {
  const github = toHttpUrl(profile.github ?? SOCIAL_PROFILES.github);
  const linkedin = toHttpUrl(profile.linkedin ?? SOCIAL_PROFILES.linkedin);
  const instagram = toHttpUrl(profile.instagram ?? SOCIAL_PROFILES.instagram);
  const whatsapp = toWhatsAppUrl(profile.whatsapp ?? SOCIAL_PROFILES.whatsapp);
  const email = String(profile.email ?? SOCIAL_PROFILES.email).trim();

  return {
    email,
    mailto: email ? `mailto:${email}` : "",
    github,
    linkedin,
    instagram,
    whatsapp,
  };
};
