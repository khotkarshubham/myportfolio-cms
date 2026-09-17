import { motion } from "framer-motion";

export default function ProjectModal({ project, close }) {

  if (!project) return null;

  return (

    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <motion.div
        initial={{ scale:0.8 }}
        animate={{ scale:1 }}
        className="bg-tech-card p-6 rounded-xl max-w-lg"
      >

        <h3 className="text-tech-accent text-xl font-semibold">
          {project.title}
        </h3>

        <p className="text-gray-400 mt-3">
          {project.description}
        </p>

        <div className="mt-6 flex gap-4">

          <a
            href={project.github}
            target="_blank"
            className="text-tech-accent"
          >
            GitHub
          </a>

          <a
            href={project.demo}
            target="_blank"
            className="text-tech-accent"
          >
            Live Demo
          </a>

        </div>

        <button
          onClick={close}
          className="mt-6 text-sm text-gray-400"
        >
          Close
        </button>

      </motion.div>

    </div>

  );
}