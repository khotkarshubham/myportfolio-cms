import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import { formatDateTime, humanize } from "../../utils/adminFormat";
import {
  FiUser,
  FiLayers,
  FiEdit3,
  FiCode,
  FiInbox,
  FiLock,
  FiAward,
  FiBriefcase,
  FiBarChart2,
  FiUsers,
  FiActivity,
  FiDownload,
} from "react-icons/fi";

export default function Dashboard() {
  const role = localStorage.getItem("admin_role");
  const email = localStorage.getItem("admin_email");
  const [stats, setStats] = useState({});
  const [messages, setMessages] = useState(null);
  const [blogs, setBlogs] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrors([]);
    const requests = [
      ["Analytics", "/admin/analytics", setStats],
      ["Inbox", "/admin/contacts", setMessages],
      ["Articles", "/admin/blogs", setBlogs],
      ...(role === "superadmin" ? [["Activity", "/admin/logs", setLogs]] : []),
    ];
    Promise.allSettled(
      requests.map(async ([label, path, setter]) => {
        try {
          const { data } = await API.get(path);
          if (active) setter(data);
        } catch {
          if (active) {
            setter(null);
            setErrors((current) => [...current, label]);
          }
        }
      }),
    ).then(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refresh, role]);

  const cards = [
    {
      title: "Analytics",
      desc: "Traffic, charts and visitor insights",
      icon: <FiBarChart2 />,
      link: "/admin/analytics",
    },
    {
      title: "Manage Profile",
      desc: "Name, photo, resume and socials",
      icon: <FiUser />,
      link: "/admin/profile",
    },
    {
      title: "Projects",
      desc: "Portfolio case studies",
      icon: <FiLayers />,
      link: "/admin/projects",
    },
    {
      title: "Blogs",
      desc: "Writing and announcements",
      icon: <FiEdit3 />,
      link: "/admin/blogs",
    },
    {
      title: "Skills",
      desc: "Tech stack chips",
      icon: <FiCode />,
      link: "/admin/skills",
    },
    {
      title: "Certifications",
      desc: "Credentials and badges",
      icon: <FiAward />,
      link: "/admin/certifications",
    },
    {
      title: "Work Experience",
      desc: "Companies, roles and promotions",
      icon: <FiBriefcase />,
      link: "/admin/experience",
    },
    {
      title: "Inbox",
      desc: "Contact form messages",
      icon: <FiInbox />,
      link: "/admin/messages",
    },
    ...(role === "superadmin"
      ? [
          {
            title: "Admin Users",
            desc: "Roles and access",
            icon: <FiUsers />,
            link: "/admin/users",
          },
          {
            title: "Activity Logs",
            desc: "Audit trail",
            icon: <FiActivity />,
            link: "/admin/logs",
          },
        ]
      : []),
    {
      title: "Change Password",
      desc: "Update sign-in credentials",
      icon: <FiLock />,
      link: "/admin/change-password",
    },
  ];

  const metrics = [
    {
      title: "Total visits",
      value: stats?.totalVisits,
      icon: <FiBarChart2 />,
      link: "/admin/analytics",
      note: "All recorded page visits",
    },
    {
      title: "Unique visitors",
      value: stats?.uniqueVisitors,
      icon: <FiUsers />,
      link: "/admin/analytics",
      note: "Distinct portfolio visitors",
    },
    {
      title: "Resume clicks",
      value: stats?.resumeClicks,
      icon: <FiDownload />,
      link: "/admin/analytics",
      note: "Interest in your experience",
    },
    {
      title: "Unread messages",
      value: messages?.filter((m) => !m.readAt && !m.archived).length,
      icon: <FiInbox />,
      link: "/admin/messages",
      note: "Conversations to catch up on",
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Overview</p>
          <h1>Your portfolio, at a glance.</h1>
          <p className="admin-page-copy">
            Welcome back{email ? `, ${email}` : ""}
            {role ? ` · ${role}` : ""}.
          </p>
        </div>
        <div className="cms-actions">
          <Link to="/" target="_blank" className="cms-button">
            View portfolio ↗
          </Link>
          <button
            className="cms-button"
            disabled={loading}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Refresh
          </button>
        </div>
      </div>
      {!!errors.length && (
        <p className="admin-form-error" role="alert">
          Couldn't load {errors.join(", ").toLowerCase()}. Use Refresh to try
          again.
        </p>
      )}

      <div className="admin-stat-grid cms-overview-stats" aria-busy={loading}>
        {metrics.map((item) => (
          <Link to={item.link} className="admin-stat-card" key={item.title}>
            <span className="admin-stat-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="admin-stat-label">{item.title}</span>
            <strong>
              {loading
                ? "…"
                : item.value == null
                  ? "—"
                  : item.value.toLocaleString()}
            </strong>
            <small className="cms-muted">{item.note}</small>
          </Link>
        ))}
      </div>

      <div className="admin-insight">
        <div>
          <p className="admin-kicker">Make something worth sharing</p>
          <h2>Your next idea starts here.</h2>
          <p>
            {blogs
              ? `${blogs.filter((b) => b.status === "draft").length} drafts in progress · ${blogs.filter((b) => b.status !== "draft").length} published articles`
              : "Write an article or revisit your latest work."}
          </p>
        </div>
        <Link to="/admin/blogs" className="admin-primary-link">
          Open writing studio →
        </Link>
      </div>
      <div className="cms-dashboard-panels">
        <section className="cms-panel">
          <div className="cms-panel-heading">
            <h2>Recent conversations</h2>
            <Link className="cms-text-link" to="/admin/messages">
              Open inbox →
            </Link>
          </div>
          {loading ? (
            <p className="cms-muted">Loading messages…</p>
          ) : messages === null ? (
            <p className="cms-muted">Inbox unavailable.</p>
          ) : !messages.length ? (
            <div className="cms-empty">
              New contact messages will appear here.
            </div>
          ) : (
            messages.slice(0, 4).map((m) => (
              <Link to="/admin/messages" key={m._id} className="cms-recent-row">
                <span className="cms-avatar">
                  {m.name?.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <p>{m.message}</p>
                  <time dateTime={m.createdAt}>
                    {formatDateTime(m.createdAt)}
                  </time>
                </span>
                {!m.readAt && (
                  <span className="cms-unread-dot" aria-label="Unread" />
                )}
              </Link>
            ))
          )}
        </section>
        <section className="cms-panel">
          <div className="cms-panel-heading">
            <h2>
              {role === "superadmin" ? "Latest activity" : "Your writing"}
            </h2>
            <Link
              className="cms-text-link"
              to={role === "superadmin" ? "/admin/logs" : "/admin/blogs"}
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <p className="cms-muted">Loading updates…</p>
          ) : role === "superadmin" ? (
            logs?.length ? (
              logs.slice(0, 4).map((log) => (
                <div className="cms-recent-row" key={log._id}>
                  <span className="cms-avatar">
                    <FiActivity />
                  </span>
                  <span>
                    <strong>{humanize(log.action)}</strong>
                    <p>{log.email || log.adminId?.email || "Administrator"}</p>
                    <time dateTime={log.createdAt}>
                      {formatDateTime(log.createdAt)}
                    </time>
                  </span>
                </div>
              ))
            ) : (
              <div className="cms-empty">
                {logs
                  ? "Your activity will appear here."
                  : "Activity unavailable."}
              </div>
            )
          ) : blogs?.length ? (
            blogs.slice(0, 4).map((b) => (
              <Link className="cms-recent-row" to="/admin/blogs" key={b._id}>
                <span>
                  <strong>{b.title}</strong>
                  <p>{b.status || "published"}</p>
                  <time>{formatDateTime(b.updatedAt)}</time>
                </span>
              </Link>
            ))
          ) : (
            <div className="cms-empty">
              {blogs
                ? "Start your first article in the writing studio."
                : "Articles unavailable."}
            </div>
          )}
        </section>
      </div>

      <h2 className="admin-section-title">Management</h2>
      <div className="admin-mgmt-grid">
        {cards.map((card) => (
          <Link to={card.link} className="admin-mgmt-card" key={card.link}>
            <span className="admin-mgmt-icon" aria-hidden="true">
              {card.icon}
            </span>
            <span>
              <strong>{card.title}</strong>
              <small>{card.desc}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
