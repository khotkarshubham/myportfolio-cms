import { useMemo, useState } from "react";
import world from "@svg-maps/world";
import { FiGlobe } from "react-icons/fi";
import { countryVisits } from "../utils/countryVisits";

const locations = new Map(
  world.locations.map((location) => [location.id.toUpperCase(), location]),
);
const countryName = (code) => {
  if (code === "UNKNOWN") return "Unknown location";
  try {
    return (
      new Intl.DisplayNames(undefined, { type: "region" }).of(code) || code
    );
  } catch {
    return code;
  }
};
export default function CountryVisitsMap({ rows = [], total = 0 }) {
  const visits = useMemo(() => countryVisits(rows), [rows]);
  const counts = new Map(visits.map((row) => [row.code, row.count]));
  const [selected, setSelected] = useState(null);
  const active = counts.has(selected) ? selected : visits[0]?.code;
  const max = visits[0]?.count || 1;
  const unplotted = visits
    .filter((row) => !locations.has(row.code))
    .reduce((sum, row) => sum + row.count, 0);
  return (
    <section className="cms-panel country-visits">
      <div className="cms-panel-heading">
        <div>
          <h2>
            <FiGlobe aria-hidden="true" /> Visits around the world
          </h2>
          <p className="cms-muted">
            Country totals for your selected period. Select a country to
            explore.
          </p>
        </div>
        <span className="cms-badge">
          {visits.filter((row) => locations.has(row.code)).length} mapped
          countries
        </span>
      </div>
      <div className="country-map-layout">
        <div className="country-map-canvas">
          <svg
            viewBox={world.viewBox}
            role="img"
            aria-label="World map shaded by page visits. Country totals and controls are listed alongside the map."
          >
            {world.locations.map((location) => {
              const code = location.id.toUpperCase();
              const count = counts.get(code) || 0;
              return (
                <path
                  key={code}
                  d={location.path}
                  className={`${count ? "has-visits" : "no-visits"} ${active === code ? "is-selected" : ""}`}
                  style={
                    count
                      ? { fillOpacity: 0.25 + 0.75 * Math.sqrt(count / max) }
                      : undefined
                  }
                  onClick={() => count && setSelected(code)}
                >
                  <title>
                    {countryName(code)}: {count.toLocaleString()} visits
                  </title>
                </path>
              );
            })}
          </svg>
          <div className="map-legend">
            <span>No visits</span>
            <i aria-hidden="true" />
            <span>More visits</span>
          </div>
          {!visits.length && (
            <p className="cms-empty">No visits recorded in this period.</p>
          )}
        </div>
        <div className="country-map-details">
          <div className="country-map-summary" aria-live="polite">
            <span className="cms-muted">
              {active ? countryName(active) : "Awaiting visitors"}
            </span>
            <strong>
              {(counts.get(active) || 0).toLocaleString()} <small>visits</small>
            </strong>
            <span>
              {total
                ? (((counts.get(active) || 0) / total) * 100).toFixed(1)
                : 0}
              % of all page visits
            </span>
          </div>
          <div
            className="country-map-list"
            role="group"
            aria-label="Country visit totals"
          >
            {visits.map(({ code, count }) => (
              <button
                key={code}
                type="button"
                aria-pressed={active === code}
                onClick={() => setSelected(code)}
              >
                <span>{countryName(code)}</span>
                <strong>{count.toLocaleString()}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="cms-muted map-footnote">
        IP-based locations are approximate. {unplotted.toLocaleString()} visits
        have an unknown or unmapped location. Animation highlights the selected
        country’s period total; it does not represent live arrivals. Map:{" "}
        <a
          href="https://mapsvg.com/maps/world"
          target="_blank"
          rel="noreferrer"
        >
          MapSVG
        </a>{" "}
        /{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        , via SVG Maps.
      </p>
    </section>
  );
}
