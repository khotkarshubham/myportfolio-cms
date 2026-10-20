export const projectTypes = {
  repository: "GitHub repository",
  application: "Website / application",
  network: "Network engineering",
  infrastructure: "Infrastructure",
  cloud: "Cloud platform",
};
export const projectStatuses = {
  completed: "Completed",
  live: "Live",
  "in-progress": "In progress",
};
export const safeProjectLink = (value) => {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
};
