import path from "node:path";
import { randomUUID } from "node:crypto";

export const mediaSlug = value => String(value || "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
  .replace(/^-|-$/g, "").slice(0, 200).replace(/-$/, "");

export const mediaRelativePath = ({ field, originalname, mimetype, slug, token = randomUUID() }) => {
  const extension = path.extname(originalname || "").toLowerCase();
  const owner = mediaSlug(slug) || "untitled";
  const name = mediaSlug(path.parse(originalname || "image").name).slice(0, 80) || "image";
  const folders = {
    image: ["images/profile", "profilepic"],
    resume: ["document/resume", "resume"],
    blogImage: [`images/blog/${owner}`, name],
    projectImage: [`images/project/${owner}`, name],
    heroLight: ["images/hero", "home-light-mode"],
    heroDark: ["images/hero", "home-dark-mode"],
    companyLogo: [`images/experience/${owner}`, name],
    certificate: [`${mimetype === "application/pdf" ? "document" : "images"}/certification/${owner}`, name]
  };
  const target = folders[field];
  if (!target) throw new Error("Unsupported media field");
  return `${target[0]}/${target[1]}-${token}${extension}`;
};
