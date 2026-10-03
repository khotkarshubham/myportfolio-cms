import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import API from "../services/api";
import SkillIcon from "./SkillIcon";
import LoadingSkeleton from "./LoadingSkeleton";

const grid = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 0.8, 0.25, 1] },
  },
};

export default function SkillList() {
  const [skills, setSkills] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    API.get("/public/skills")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data)
          ? res.data.filter((skill) => skill && skill.name)
          : [];
        setSkills(list);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setSkills([]);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    return <LoadingSkeleton compact label="Loading tools" />;
  }

  if (status === "error") {
    return <div className="data-empty">Unable to load tools right now.</div>;
  }

  if (!skills.length) {
    return <div className="data-empty">No tools added yet.</div>;
  }

  return (
    <motion.div
      className="skills-grid"
      variants={grid}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
    >
      {skills.map((skill) => {
        return (
          <motion.div
            key={skill._id || skill.name}
            variants={item}
            className="skill-chip"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
          >
            <span className="skill-icon" aria-hidden="true">
              <SkillIcon name={skill.name} iconKey={skill.iconKey} />
            </span>

            <span className="skill-name">{skill.name}</span>
            <span className="skill-status" aria-hidden="true" />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
