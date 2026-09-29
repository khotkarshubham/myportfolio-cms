import { useEffect, useMemo, useState } from "react";
import { FiArrowUpRight, FiAward, FiBriefcase, FiCpu } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";
import { compactDate, initials, roleKey, yearOf } from "../utils/experienceView";
import SectionHeading from "./SectionHeading";

const parseYear = (value) => {
  if (!value || /present|current|now/i.test(String(value))) return new Date().getFullYear();
  const match = String(value).match(/(\d{4})/);
  return match ? Number(match[1]) : null;
};

const flattenRoles = (organizations) =>
  organizations.flatMap((organization) => {
    const roles = Array.isArray(organization.roles) ? organization.roles : [];
    const visible = roles.filter((role) => role && (role.role || role.startDate));
    return visible.map((role, index) => ({
      ...role,
      organization: organization.organization,
      organizationId: organization._id,
      companyLogo: role.companyLogo || organization.companyLogo || "",
      orgIndex: index,
      isPromotion: index > 0,
      isCompanyStart: index === 0,
      isCurrent:
        Boolean(role.isCurrent || role.current) ||
        Boolean(organization.current && index === visible.length - 1),
      key: roleKey(organization, role, index),
    }));
  });

const sortOrganizations = (organizations) =>
  [...organizations].sort((a, b) => {
    const ao = Number.isFinite(Number(a.order)) ? Number(a.order) : 0;
    const bo = Number.isFinite(Number(b.order)) ? Number(b.order) : 0;
    if (ao !== bo) return ao - bo;
    return (parseYear(a.startDate) || 0) - (parseYear(b.startDate) || 0);
  });

export default function CareerJourney({ headingIcon = <FiBriefcase /> }) {
  const [organizations, setOrganizations] = useState([]);
  const [status, setStatus] = useState("loading");
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    let mounted = true;
    API.get("/public/experiences")
      .then(({ data }) => {
        if (!mounted) return;
        setOrganizations(Array.isArray(data) ? data : []);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setOrganizations([]);
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const companies = useMemo(() => sortOrganizations(organizations), [organizations]);
  const roles = useMemo(() => flattenRoles(companies), [companies]);
  const currentRole = useMemo(() => {
    const live = roles.filter((role) => role.isCurrent);
    if (!live.length) return roles.at(-1);
    return live.sort(
      (a, b) => (parseYear(a.startDate) || 0) - (parseYear(b.startDate) || 0)
    ).at(-1);
  }, [roles]);

  useEffect(() => {
    if (!roles.length) {
      setSelectedKey("");
      return;
    }
    setSelectedKey((current) => {
      if (current && roles.some((role) => role.key === current)) return current;
      return currentRole?.key || roles.at(-1).key;
    });
  }, [roles, currentRole]);

  const selected = roles.find((role) => role.key === selectedKey) || roles[0];

  const firstYear = Math.min(
    ...roles.map((role) => parseYear(role.startDate)).filter(Number.isFinite)
  );
  const lastYear = Math.max(
    ...roles.map((role) => parseYear(role.endDate)).filter(Number.isFinite)
  );
  const years = Number.isFinite(firstYear)
    ? `${Math.max((Number.isFinite(lastYear) ? lastYear : new Date().getFullYear()) - firstYear, 1)}+`
    : "—";

  const heading = (
    <SectionHeading
      icon={headingIcon}
      title="Work"
      accent="Experience"
      headingId="career-journey-title"
      lede="Building, scaling and automating systems across infrastructure, cloud and security."
    />
  );

  if (status === "loading") {
    return (
      <section className="wj" aria-labelledby="career-journey-title">
        {heading}
        <div className="data-empty">Loading journey…</div>
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="wj" aria-labelledby="career-journey-title">
        {heading}
        <div className="data-empty">Unable to load experience right now.</div>
      </section>
    );
  }
  if (!companies.length) {
    return (
      <section className="wj" aria-labelledby="career-journey-title">
        {heading}
        <div className="data-empty">Experience details will appear here soon.</div>
      </section>
    );
  }

  return (
    <section className="wj" aria-labelledby="career-journey-title">
      <div className="wj-hero">
        <div className="wj-hero-grid">
          <div className="wj-title-wrap">
            {heading}
          </div>

          <div className="wj-current-spotlight">
            <span className="wj-live"><i /> CURRENT ROLE</span>
            <strong>{currentRole?.role || "—"}</strong>
            <span>{currentRole?.organization || "—"}</span>
            <button type="button" onClick={() => setSelectedKey(currentRole?.key)}>
              Explore role <FiArrowUpRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="wj-stats" aria-label="Career summary">
          <div><strong>{years}</strong><span>Years experience</span></div>
          <div><strong>{companies.length}</strong><span>{companies.length === 1 ? "Company" : "Companies"}</span></div>
          <div><strong>{roles.length}</strong><span>Roles</span></div>
          <div><strong>{currentRole?.role || "—"}</strong><span>Current focus</span></div>
        </div>
      </div>

      <section className="wj-journey" aria-label="Career timeline">
        <div className="wj-section-heading">
          <div>
            <span>THE JOURNEY</span>
            <h3>One path. Multiple chapters.</h3>
          </div>
          <p>From first engineering role to current focus.</p>
        </div>

        <div className="wj-timeline-scroll">
          <div className="wj-timeline" style={{ "--wj-nodes": Math.max(roles.length, 1) }}>
            <div className="wj-company-strip">
              {companies.map((company) => (
                <div
                  className={`wj-company-label ${company.current ? "is-current" : ""}`}
                  key={`company-${company._id}`}
                  style={{ gridColumn: `span ${Math.max(company.roles?.length || 1, 1)}` }}
                >
                  {company.companyLogo ? (
                    <img src={assetUrl(company.companyLogo)} alt="" />
                  ) : (
                    <span>{initials(company.organization)}</span>
                  )}
                  <div>
                    <strong>{company.organization}</strong>
                    <small>{compactDate(company.startDate)} — {compactDate(company.endDate)}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="wj-track">
              {roles.map((role) => (
                <div
                  className={`wj-milestone ${role.isCurrent ? "is-current" : ""} ${selected?.key === role.key ? "is-selected" : ""} ${role.isCompanyStart ? "is-company-start" : ""}`}
                  key={role.key}
                >
                  {role.isPromotion && (
                    <span className="wj-promotion">{role.promotionLabel || "PROMOTED"}</span>
                  )}
                  <button type="button" onClick={() => setSelectedKey(role.key)}>
                    <span className="wj-year">{yearOf(role.startDate)}</span>
                    <span className="wj-dot" />
                    <strong>{role.role}</strong>
                    <small>{role.isCurrent ? "Current" : compactDate(role.endDate)}</small>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      {selected && (
        <section className="wj-detail" aria-label="Selected role details">
          <aside className="wj-role-list">
            <div className="wj-detail-label">SELECT A ROLE</div>
            {roles.map((role) => (
              <button
                type="button"
                key={role.key}
                className={selected.key === role.key ? "is-active" : ""}
                onClick={() => setSelectedKey(role.key)}
              >
                <span className={`wj-list-dot ${role.isCurrent ? "is-current" : ""}`} />
                <span>
                  <strong>{role.role}</strong>
                  <small>{role.organization} · {compactDate(role.startDate)}</small>
                </span>
              </button>
            ))}
          </aside>

          <article className="wj-detail-main">
            <div className="wj-detail-top">
              <div>
                <span className="wj-detail-company">{selected.organization}</span>
                <h3>{selected.role}</h3>
                <p>{compactDate(selected.startDate)} — {compactDate(selected.endDate)}</p>
              </div>
              {selected.isCurrent && <span className="wj-current-pill">CURRENT</span>}
            </div>

            {selected.description && <p className="wj-description">{selected.description}</p>}

            {!!selected.technologies?.length && (
              <div className="wj-detail-block">
                <span><FiCpu /> Technologies</span>
                <div className="wj-tags">
                  {selected.technologies.map((tag) => <b key={tag}>{tag}</b>)}
                </div>
              </div>
            )}

            {!!selected.achievements?.length && (
              <div className="wj-detail-block">
                <span><FiAward /> Key achievements</span>
                <ul>{selected.achievements.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}

            {!!selected.impact?.length && (
              <div className="wj-impact">
                {selected.impact.map((item) => (
                  <div key={`${item.value}-${item.label}`}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      )}
      </section>
    </section>
  );
}
