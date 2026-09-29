const MONTHS = {
  january: "Jan", february: "Feb", march: "Mar", april: "Apr",
  may: "May", june: "Jun", july: "Jul", august: "Aug",
  september: "Sep", october: "Oct", november: "Nov", december: "Dec",
};

export const initials = (name = "") => {
  const words = String(name)
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^(pvt|ltd|inc|llc|and|the)$/i.test(word));

  if (!words.length) return "ORG";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
};

export const compactDate = (value) => {
  if (!value || /present|current|now/i.test(value)) return "Present";
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  const match = String(value).match(/([A-Za-z]+)\s+(\d{4})/);
  if (!match) return value;
  const month = MONTHS[match[1].toLowerCase()] || match[1].slice(0, 3);
  return `${month} ${match[2]}`;
};

export const yearOf = (value) => {
  if (!value || /present|current|now/i.test(value)) return "Now";
  const match = String(value).match(/(\d{4})/);
  return match ? match[1] : "";
};

export const roleKey = (organization, role, index = 0) =>
  `${organization._id}:${role._id || role.role || index}`;
