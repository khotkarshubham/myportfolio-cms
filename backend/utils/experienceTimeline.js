const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

export const slugifyOrgKey = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const isPresentDate = (value) => {
  const text = String(value || "").trim();
  return !text || /^(present|current|now|ongoing)$/i.test(text);
};

export const parseLooseDate = (value, { end = false } = {}) => {
  if (isPresentDate(value)) {
    return end ? new Date() : new Date(0);
  }

  const text = String(value).trim();
  const parsed = Date.parse(text);

  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  const monthYear = text.match(/^([A-Za-z]+)\s+(\d{4})$/);

  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    const year = Number(monthYear[2]);

    if (month !== undefined) {
      return new Date(year, month, end ? 28 : 1);
    }
  }

  const yearOnly = text.match(/(\d{4})/);

  if (yearOnly) {
    return new Date(Number(yearOnly[1]), end ? 11 : 0, end ? 31 : 1);
  }

  return new Date(end ? Date.now() : 0);
};

export const yearOf = (value) => {
  if (isPresentDate(value)) return "Now";
  const match = String(value || "").match(/(\d{4})/);
  return match ? match[1] : "";
};

export const sortRoles = (roles = []) =>
  [...roles].sort((a, b) => {
    const orderDiff = (Number(a.order) || 0) - (Number(b.order) || 0);
    if (orderDiff !== 0) return orderDiff;
    return parseLooseDate(a.startDate).getTime() - parseLooseDate(b.startDate).getTime();
  });

export const isCurrentRole = (role) => isPresentDate(role?.endDate);

export const tenureLabel = (startDate, endDate) => {
  const start = parseLooseDate(startDate);
  const end = parseLooseDate(endDate, { end: true });
  const months = Math.max(1, Math.round((end - start) / (30.44 * 24 * 60 * 60 * 1000)));
  const years = Math.floor(months / 12);
  const remainder = months % 12;

  if (years && remainder) {
    return `${years} yr${years === 1 ? "" : "s"} ${remainder} mo${remainder === 1 ? "" : "s"}`;
  }

  if (years) {
    return `${years} yr${years === 1 ? "" : "s"}`;
  }

  return `${months} mo${months === 1 ? "" : "s"}`;
};

export const organizationWindow = (roles = []) => {
  const sorted = sortRoles(roles);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return {
    startDate: first?.startDate || "",
    endDate: last?.endDate || "",
    current: sorted.some(isCurrentRole),
    tenure: first ? tenureLabel(first.startDate, last?.endDate) : ""
  };
};

export const axisYears = (roles = []) => {
  const years = new Set();

  sortRoles(roles).forEach((role) => {
    const start = yearOf(role.startDate);
    const end = yearOf(role.endDate);
    if (start && start !== "Now") years.add(start);
    if (end && end !== "Now") years.add(end);
  });

  const list = Array.from(years).sort();
  if (sortRoles(roles).some(isCurrentRole)) list.push("NOW");
  return list;
};

export const sentencesFrom = (text = "") =>
  String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 18)
    .slice(0, 5);

export const toPublicOrganization = (doc) => {
  const roles = sortRoles(doc.roles || []).map((role, index) => {
    const isCurrent = isCurrentRole(role);
    const technologies = (role.technologies || []).filter(Boolean);
    const achievements = (role.achievements || []).map((item) => String(item).trim()).filter(Boolean);
    const impact = (role.impact || [])
      .map((item) => ({
        value: String(item?.value || "").trim(),
        label: String(item?.label || "").trim()
      }))
      .filter((item) => item.value && item.label);
    const tenure = tenureLabel(role.startDate, role.endDate);

    return {
      _id: role._id,
      role: role.role,
      startDate: role.startDate,
      endDate: role.endDate || "",
      description: role.description || "",
      technologies,
      promotionLabel:
        role.promotionLabel ||
        (index > 0 ? "PROMOTED" : ""),
      achievements: achievements.length ? achievements : sentencesFrom(role.description),
      impact: impact.length
        ? impact
        : [
            tenure ? { value: tenure, label: "Tenure" } : null,
            technologies.length
              ? { value: String(technologies.length), label: "Core tools" }
              : null,
            isCurrent ? { value: "Live", label: "Status" } : null,
            index > 0 ? { value: "Yes", label: "Promotion" } : null
          ].filter(Boolean).slice(0, 4),
      order: Number.isFinite(Number(role.order)) ? Number(role.order) : index,
      isCurrent,
      tenure
    };
  });

  const window = organizationWindow(roles);

  return {
    _id: doc._id,
    organization: doc.organization,
    companyLogo: doc.companyLogo || "",
    organizationMeta: {
      industry: doc.organizationMeta?.industry || "",
      location: doc.organizationMeta?.location || "",
      website: doc.organizationMeta?.website || ""
    },
    roles,
    order: doc.order || 0,
    isVisible: doc.isVisible !== false,
    startDate: window.startDate,
    endDate: window.endDate,
    current: window.current,
    tenure: window.tenure,
    axisYears: axisYears(roles)
  };
};

export const latestActivityStamp = (doc) => {
  const roles = sortRoles(doc.roles || []);
  const last = roles[roles.length - 1];
  if (!last) return 0;
  return parseLooseDate(last.endDate || last.startDate, { end: true }).getTime();
};

export const earliestActivityStamp = (doc) => {
  const roles = sortRoles(doc.roles || []);
  const first = roles[0];
  if (!first) return 0;
  return parseLooseDate(first.startDate).getTime();
};
