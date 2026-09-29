const DAY = 86400000;
export function analyticsWindow(range = "all", now = new Date(), custom = {}) {
  if (range === "custom") {
    const parseDay = (value) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new Error("Choose valid start and end dates");
      const date = new Date(`${value}T00:00:00.000Z`);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      )
        throw new Error("Choose valid start and end dates");
      return date;
    };
    const start = parseDay(custom.from),
      last = parseDay(custom.to);
    const days = Math.round((last - start) / DAY) + 1;
    if (
      days < 1 ||
      days > 366 ||
      last.toISOString().slice(0, 10) > now.toISOString().slice(0, 10)
    )
      throw new Error("Choose up to 366 days, ending today or earlier");
    const end = new Date(Math.min(last.getTime() + DAY - 1, now.getTime()));
    return {
      start,
      end,
      days,
      previousStart: new Date(start.getTime() - days * DAY),
      previousEnd: new Date(end.getTime() - days * DAY),
    };
  }
  if (!["7", "30", "90", "all"].includes(String(range)))
    throw new Error("Choose a 7, 30, 90 day, custom or all-time range");
  const days = range === "all" ? 30 : Number(range);
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(today.getTime() - (days - 1) * DAY);
  return {
    start,
    end: now,
    days,
    previousStart: new Date(start.getTime() - days * DAY),
    previousEnd: new Date(now.getTime() - days * DAY),
  };
}
export function fillAnalyticsDays(rows, start, days) {
  const byDate = new Map(rows.map((row) => [row._id, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY)
      .toISOString()
      .slice(0, 10);
    return {
      _id: date,
      visits: 0,
      visitors: 0,
      resumeClicks: 0,
      ...byDate.get(date),
    };
  });
}
export function normalizePublicPage(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x1f]/.test(value)
  )
    return null;
  try {
    const path = decodeURIComponent(
      new URL(value, "https://portfolio.invalid").pathname,
    );
    if (
      /^\/admin(?:\/|$)/i.test(path) ||
      path.startsWith("//") ||
      /[\\\x00-\x1f]/.test(path)
    )
      return null;
    return path.slice(0, 200);
  } catch {
    return null;
  }
}
