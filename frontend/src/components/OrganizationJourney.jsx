import { useReducedMotion } from "framer-motion";
import assetUrl from "../utils/assetUrl";

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

function RoleCard({ role, promotedFrom }) {
  const techs = (role.technologies || []).filter(Boolean).slice(0, 6);

  return (
    <article className={`timeline-card ${role.isCurrent ? "is-current" : ""}`}>
      <div className="timeline-card-meta">
        <p className="timeline-card-dates">
          {compactDate(role.startDate)} – {compactDate(role.endDate)}
        </p>
        {role.isCurrent && <span className="timeline-current">Current</span>}
      </div>
      <h4>{role.role}</h4>
      {promotedFrom && (
        <p className="timeline-promoted-label">{promotedFrom}</p>
      )}
      {role.description && (
        <p className="timeline-card-copy">{role.description}</p>
      )}
      {!!techs.length && (
        <div className="timeline-tech">
          {techs.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function OrganizationJourney({
  organization,
  continues = false,
  highlight = false,
}) {
  const roles = organization.roles || [];
  const reduceMotion = useReducedMotion();
  const tagline = [
    organization.organizationMeta?.industry,
    organization.organizationMeta?.location,
  ]
    .filter(Boolean)
    .join(" · ");
  const tenure = `${compactDate(organization.startDate)} – ${compactDate(organization.endDate)}`;

  return (
    <section
      className={`timeline-company ${highlight ? "is-current" : ""} ${
        continues ? "continues" : "is-end"
      }`}
      aria-label={organization.organization}
    >
      <header className="timeline-company-head">
        {organization.companyLogo ? (
          <img
            src={assetUrl(organization.companyLogo)}
            alt=""
            className="timeline-logo"
          />
        ) : (
          <span className="timeline-logo is-fallback" aria-hidden="true">
            {initials(organization.organization)}
          </span>
        )}
        <div className="timeline-company-copy">
          <strong>{organization.organization}</strong>
          <p>{tagline ? `${tagline} · ${tenure}` : tenure}</p>
        </div>
      </header>

      <ol className="timeline-roles">
        {roles.map((role, index) => (
          <li
            className={`timeline-role-row ${role.isCurrent ? "is-current" : ""}`}
            key={role._id || `${role.role}-${index}`}
          >
            <span
              className={`timeline-dot ${reduceMotion ? "is-static" : ""}`}
              aria-hidden="true"
            />
            <RoleCard
              role={role}
              promotedFrom={index > 0 ? role.promotionLabel : ""}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
