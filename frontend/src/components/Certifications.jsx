import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import API from "../services/api";
import assetUrl from "../utils/assetUrl";

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
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
};

export default function Certifications() {
  const [certs, setCerts] = useState([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    API.get("/public/certifications")
      .then((res) => setCerts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCerts([]));
  }, []);

  if (!certs.length) return null;

  return (
    <section className="credential-block" aria-labelledby="credentials-heading">
      <div className="section-heading compact journey-heading">
        <div>
          <span className="section-index">03 / CREDENTIALS</span>
          <h2 id="credentials-heading">Verified Credentials</h2>
          <p className="section-lede">Certifications that validate the work.</p>
        </div>
        <p className="section-aside">
          Continuously learning, continuously building. These certifications
          represent a commitment to staying current.
        </p>
      </div>

      <motion.div
        className="credential-rail"
        variants={reduceMotion ? undefined : grid}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.16 }}
      >
        {certs.map((cert) => (
          <motion.a
            key={cert._id}
            href={cert.url?.startsWith("http") ? cert.url : `https://${cert.url}`}
            target="_blank"
            rel="noreferrer"
            variants={reduceMotion ? undefined : card}
            className="credential-card"
          >
            <div className="credential-card-top">
              {cert.file ? (
                <img src={assetUrl(cert.file)} alt="" className="credential-mark" />
              ) : (
                <span className="credential-mark is-fallback" aria-hidden="true">
                  {mark(cert)}
                </span>
              )}
              <span className="credential-badge">Certified</span>
            </div>
            <strong>{cert.name}</strong>
            <span className="credential-org">{cert.issuer || "Verified credential"}</span>
            {cert.year && <span className="credential-issued">Issued {cert.year}</span>}
            <span className="credential-link">
              View credential <FiArrowUpRight />
            </span>
          </motion.a>
        ))}
      </motion.div>
    </section>
  );
}
