import assetUrl from "../utils/assetUrl";
import { compactDate, initials, roleKey } from "../utils/experienceView";

export default function OrganizationJourney({ organization, selectedKey, onSelect }) {
  const roles = Array.isArray(organization.roles) ? organization.roles : [];
  const currentIndex = roles.findIndex((role) => role.isCurrent || role.current);
  const effectiveCurrentIndex =
    currentIndex >= 0 && organization.current ? currentIndex : organization.current ? roles.length - 1 : -1;

  return (
    <article className={`wj-chapter ${organization.current ? "is-current" : ""}`}>
      <header className="wj-chapter-head">
        <div className="wj-chapter-brand">
          {organization.companyLogo ? (
            <img src={assetUrl(organization.companyLogo)} alt="" />
          ) : (
            <span>{initials(organization.organization)}</span>
          )}
        </div>
        <div>
          <span className="wj-chapter-label">COMPANY</span>
          <h4>{organization.organization}</h4>
          <p>{compactDate(organization.startDate)} — {compactDate(organization.endDate)}</p>
        </div>
        {organization.current && <em>Current</em>}
      </header>

      <div className="wj-role-stack">
        {roles.map((role, index) => {
          const key = roleKey(organization, role, index);
          const selected = key === selectedKey;
          const isCurrent = Boolean(role.isCurrent || role.current || index === effectiveCurrentIndex);

          return (
            <div className="wj-stack-item" key={key}>
              {index > 0 && (
                <div className="wj-promotion-line">
                  <span>{role.promotionLabel || "PROMOTED"}</span>
                </div>
              )}
              <button
                type="button"
                className={`wj-stack-role ${selected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""}`}
                onClick={() => onSelect(key)}
              >
                <span className="wj-stack-index">0{index + 1}</span>
                <span className="wj-stack-copy">
                  <strong>{role.role}</strong>
                  <small>{compactDate(role.startDate)} — {compactDate(role.endDate)}</small>
                </span>
                {isCurrent && <span className="wj-role-status">CURRENT</span>}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
