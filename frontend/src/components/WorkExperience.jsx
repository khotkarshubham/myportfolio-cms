import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiBriefcase } from "react-icons/fi";
import API from "../services/api";

const list = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

const row = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 0.8, 0.25, 1] },
  },
};

export default function WorkExperience() {
  const [exp, setExp] = useState([]);

  useEffect(() => {
    API.get("/public/experiences")
      .then(res => setExp(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExp([]));
  }, []);

  if (!exp.length) {
    return <div className="data-empty">No experience entries added yet.</div>;
  }

  return (
    <motion.div
      className="experience-list"
      variants={list}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.14 }}
    >
      {exp.map((item, i) => (
        <motion.article
          key={item._id}
          variants={row}
          className={`experience-row ${i === 0 ? "is-latest" : ""}`}
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="experience-mark" aria-hidden="true">
            <FiBriefcase />
            {i === 0 && <span className="experience-pulse" />}
          </div>

          <div className="experience-main">
            <div className="experience-topline">
              <div>
                <span className="experience-role">{item.role}</span>
                <span className="experience-company">{item.company}</span>
              </div>

              <span className="experience-date">
                {item.startDate} — {item.endDate || "Present"}
              </span>
            </div>

            <p>{item.description}</p>

            {!!item.technologies?.length && (
              <div className="experience-tags">
                {item.technologies.map(tag => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <FiArrowUpRight className="experience-arrow" aria-hidden="true" />
        </motion.article>
      ))}
    </motion.div>
  );
}
