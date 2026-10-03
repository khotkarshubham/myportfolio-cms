import LoadingSkeleton from "./LoadingSkeleton";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiAward } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";
import SectionHeading from "./SectionHeading";

const grid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const card = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 0.8, 0.25, 1] },
  },
};

const mark = (cert) => {
  const source = cert.issuer || cert.name || "C";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const credentialHref = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
};

export default function Certifications({ headingIcon = <FiAward /> }) {
  const [certs, setCerts] = useState([]);
  const [status, setStatus] = useState("loading");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let mounted = true;

    API.get("/public/certifications")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data)
          ? res.data.filter((item) => item && item.name)
          : [];
        setCerts(list);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setCerts([]);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const heading = (
    <SectionHeading
      icon={headingIcon}
      title="Verified"
      accent="Credentials"
      headingId="credentials-heading"
      lede="Certifications that validate the work."
      aside={
        <p className="section-aside">
          Continuously learning, continuously building. These certifications
          represent a commitment to staying current.
        </p>
      }
    />
  );

  if (status === "loading") {
    return (
      <section
        className="credential-block"
        aria-labelledby="credentials-heading"
      >
        {heading}
        <LoadingSkeleton compact label="Loading credentials" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section
        className="credential-block"
        aria-labelledby="credentials-heading"
      >
        {heading}
        <div className="data-empty">Unable to load credentials right now.</div>
      </section>
    );
  }

  if (!certs.length) {
    return (
      <section
        className="credential-block"
        aria-labelledby="credentials-heading"
      >
        {heading}
        <div className="data-empty">
          Credentials will appear here once they are published.
        </div>
      </section>
    );
  }

  return (
    <section className="credential-block" aria-labelledby="credentials-heading">
      {heading}

      <motion.div
        className="credential-rail"
        variants={reduceMotion ? undefined : grid}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.16 }}
      >
        {certs.map((cert) => {
          const href = credentialHref(cert.url);
          const CardTag = href ? motion.a : motion.article;
          const linkProps = href
            ? { href, target: "_blank", rel: "noreferrer" }
            : {};

          return (
            <CardTag
              key={cert._id || cert.name}
              {...linkProps}
              variants={reduceMotion ? undefined : card}
              className="credential-card"
            >
              <div className="credential-card-top">
                {cert.file ? (
                  <img
                    src={assetUrl(cert.file)}
                    alt=""
                    className="credential-mark"
                  />
                ) : (
                  <span
                    className="credential-mark is-fallback"
                    aria-hidden="true"
                  >
                    {mark(cert)}
                  </span>
                )}
                <span className="credential-badge">Certified</span>
              </div>
              <strong>{cert.name}</strong>
              <span className="credential-org">
                {cert.issuer || "Verified credential"}
              </span>
              {cert.year && (
                <span className="credential-issued">Issued {cert.year}</span>
              )}
              {href ? (
                <span className="credential-link">
                  View credential <FiArrowUpRight />
                </span>
              ) : null}
            </CardTag>
          );
        })}
      </motion.div>
    </section>
  );
}
