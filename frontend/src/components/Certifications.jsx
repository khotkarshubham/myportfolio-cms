import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaAward, FaExternalLinkAlt } from "react-icons/fa";
import API from "../services/api";

const grid = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const card = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 0.8, 0.25, 1] },
  },
};

export default function Certifications() {
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    API.get("/public/certifications")
      .then(res => setCerts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCerts([]));
  }, []);

  if (!certs.length) return null;

  return (
    <motion.div
      className="cert-grid"
      variants={grid}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.14 }}
    >
      {certs.map(cert => (
        <motion.a
          key={cert._id}
          href={cert.url?.startsWith("http") ? cert.url : `https://${cert.url}`}
          target="_blank"
          rel="noreferrer"
          variants={card}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.18 }}
          className="cert-card"
        >
          <span className="cert-icon" aria-hidden="true">
            <FaAward />
          </span>

          <span className="cert-copy">
            <strong>{cert.name}</strong>
            <small>
              <span className="cert-live-dot" aria-hidden="true" />
              Verified credential
            </small>
          </span>

          <FaExternalLinkAlt className="cert-arrow" aria-hidden="true" />
        </motion.a>
      ))}
    </motion.div>
  );
}
