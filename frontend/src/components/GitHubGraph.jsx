import { motion } from "framer-motion";
import { GitHubCalendar } from "react-github-calendar";

export default function GitHubGraph() {
  return (
    <motion.div
      className="github-graph-card"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, ease: [0.22, 0.8, 0.25, 1] }}
    >
      <div className="github-graph-head">
        <span>Contribution activity</span>
        <span className="github-live-label">
          <span className="github-live-dot" />
          GitHub
        </span>
      </div>

      <div className="github-graph-inner">
        <GitHubCalendar
          username="khotkarshubham"
          blockSize={12}
          blockMargin={4}
          fontSize={12}
        />
      </div>
    </motion.div>
  );
}
