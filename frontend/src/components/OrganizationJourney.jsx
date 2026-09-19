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

const shortCopy = (text = "", limit = 140) => {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trim()}…`;
};

function PromotionArc({ label }) {
  if (!label) return null;

  return (
    <div className="timeline-promoted" aria-hidden="true">
      <svg viewBox="0 0 120 36" preserveAspectRatio="none">
        <path d="M2 34 C 28 4, 92 4, 118 34" />
      </svg>
      <small>{label.replace(/promoted/i, "Promoted")}</small>
    </div>
  );
}

function RoleCard({ role }) {
  const techs = (role.technologies || []).filter(Boolean).slice(0, 4);

  return (
    <article className={`timeline-card ${role.isCurrent ? "is-current" : ""}`}>
      <p className="timeline-card-dates">
        {compactDate(role.startDate)} – {compactDate(role.endDate)}
      </p>
      <div className="timeline-card-top">
        <h4>{role.role}</h4>
        {role.isCurrent && <span className="timeline-current">Current</span>}
      </div>
      {role.description && (
        <p className="timeline-card-copy">{shortCopy(role.description, 132)}</p>
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

  return (
    <section
      className={`timeline-company ${highlight ? "is-current" : ""} ${
        continues ? "continues" : "is-end"
      }`}
      style={{ "--role-count": Math.max(roles.length, 1) }}
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
        <div>
          <strong>{organization.organization}</strong>
          {tagline && <p>{tagline}</p>}
        </div>
      </header>

      <div className="timeline-track">
        {roles.map((role, index) => (
          <div
            className={`timeline-node ${role.isCurrent ? "is-current" : ""}`}
            key={`node-${role._id || role.role}-${index}`}
          >
            {index > 0 && <PromotionArc label={role.promotionLabel} />}
            <span
              className={`timeline-dot ${reduceMotion ? "is-static" : ""}`}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      <div className="timeline-cards">
        {roles.map((role, index) => (
          <RoleCard key={role._id || `${role.role}-${index}`} role={role} />
        ))}
      </div>
    </section>
  );
}
