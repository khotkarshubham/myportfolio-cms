const DAY = 86400000;
export function analyticsWindow(range = 'all', now = new Date()) {
  if (!['7', '30', '90', 'all'].includes(String(range))) throw new Error('Choose a 7, 30, 90 day or all-time range');
  const days = range === 'all' ? 30 : Number(range);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today.getTime() - (days - 1) * DAY);
  return { start, end: now, days, previousStart: new Date(start.getTime() - days * DAY), previousEnd: new Date(now.getTime() - days * DAY) };
}
export function fillAnalyticsDays(rows, start, days) {
  const byDate = new Map(rows.map(row => [row._id, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY).toISOString().slice(0, 10);
    return { _id: date, visits: 0, resumeClicks: 0, ...byDate.get(date) };
  });
}
export function normalizePublicPage(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) return null;
  try {
    const path = decodeURIComponent(new URL(value, 'https://portfolio.invalid').pathname);
    if (/^\/admin(?:\/|$)/i.test(path) || path.startsWith('//') || /[\\\x00-\x1f]/.test(path)) return null;
    return path.slice(0, 200);
  } catch { return null; }
}
