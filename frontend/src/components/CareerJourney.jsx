import { useEffect, useMemo, useRef, useState } from "react";
import { FiBriefcase, FiChevronLeft, FiChevronRight, FiHome, FiTrendingUp } from "react-icons/fi";
import API from "../services/api";
import OrganizationJourney from "./OrganizationJourney";

const parseYear = (value) => {
  if (!value || /present|current|now/i.test(value)) return new Date().getFullYear();
  const match = String(value).match(/(\d{4})/);
  return match ? Number(match[1]) : null;
};

const summaryFrom = (organizations) => {
  const roles = organizations.flatMap((org) => org.roles || []);
  const years = organizations.flatMap((org) => [
    parseYear(org.startDate),
    parseYear(org.endDate),
  ]).filter(Number.isFinite);
  const span = years.length ? Math.max(...years) - Math.min(...years) : 0;

  return [
    {
      label: "Years of Experience",
      value: span ? `${Math.max(span, 1)}+` : "—",
      icon: FiBriefcase,
    },
    {
      label: organizations.length === 1 ? "Company" : "Companies",
      value: String(organizations.length),
      icon: FiHome,
    },
    {
      label: "Roles & Promotions",
      value: String(roles.length),
      icon: FiTrendingUp,
    },
  ];
};

export default function CareerJourney() {
  const [organizations, setOrganizations] = useState([]);
  const [status, setStatus] = useState("loading");
  const [canScroll, setCanScroll] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    API.get("/public/experiences")
      .then((res) => {
        if (!mounted) return;
        setOrganizations(Array.isArray(res.data) ? res.data : []);
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

  const stats = useMemo(() => summaryFrom(organizations), [organizations]);
  const timeline = useMemo(() => {
    return [...organizations].sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) {
        return (a.order || 0) - (b.order || 0);
      }
      return (parseYear(a.startDate) || 0) - (parseYear(b.startDate) || 0);
    });
  }, [organizations]);
  const highlightId = useMemo(() => {
    const current = timeline.filter((organization) => organization.current);
    return (current.at(-1) || timeline.at(-1))?._id;
  }, [timeline]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const updateOverflow = () => {
      setCanScroll(track.scrollWidth > track.clientWidth + 12);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(track);
    track.addEventListener("scroll", updateOverflow, { passive: true });
    window.addEventListener("resize", updateOverflow);

    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateOverflow);
      window.removeEventListener("resize", updateOverflow);
    };
  }, [timeline]);

  const scrollBoard = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const distance = Math.min(360, Math.max(track.clientWidth * 0.8, 240));
    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  if (status === "loading") {
    return <div className="data-empty">Loading journey…</div>;
  }

  if (status === "error") {
    return <div className="data-empty">Unable to load experience right now.</div>;
  }

  if (!organizations.length) {
    return <div className="data-empty">Experience details will appear here soon.</div>;
  }

  return (
    <div className={`career-timeline ${timeline.length === 1 ? "is-single" : ""}`}>
      <div className="career-timeline-frame">
        {canScroll && (
          <button
            type="button"
            className="timeline-nav is-prev"
            aria-label="Scroll timeline backward"
            onClick={() => scrollBoard(-1)}
          >
            <FiChevronLeft />
          </button>
        )}

        <div ref={trackRef} className="career-timeline-scroll">
          {timeline.map((organization, index) => (
            <OrganizationJourney
              key={organization._id}
              organization={organization}
              continues={index < timeline.length - 1}
              highlight={organization._id === highlightId}
            />
          ))}
        </div>

        {canScroll && (
          <button
            type="button"
            className="timeline-nav is-next"
            aria-label="Scroll timeline forward"
            onClick={() => scrollBoard(1)}
          >
            <FiChevronRight />
          </button>
        )}
      </div>

      <ul className="timeline-stats" aria-label="Experience summary">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <li key={stat.label}>
              <span className="timeline-stat-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="timeline-stat-copy">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
