export function countryVisits(rows = []) {
  const counts = new Map();
  for (const row of rows) {
    const code = String(row?._id || "Unknown")
      .trim()
      .toUpperCase();
    const count = Number(row?.count);
    if (!Number.isFinite(count) || count <= 0) continue;
    counts.set(code, (counts.get(code) || 0) + count);
  }
  return [...counts]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}
