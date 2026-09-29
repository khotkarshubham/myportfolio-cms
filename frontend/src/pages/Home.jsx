import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowUpRight,
  FiAward,
  FiBriefcase,
  FiChevronDown,
  FiExternalLink,
  FiGithub,
  FiLayers,
  FiMail,
  FiTool,
} from "react-icons/fi";
import SkillList from "../components/SkillList";
import Certifications from "../components/Certifications";
import CareerJourney from "../components/CareerJourney";
import FeaturedProjects from "../components/FeaturedProjects";
import GitHubGraph from "../components/GitHubGraph";
import GitHubStats from "../components/GitHubStats";
import SectionHeading from "../components/SectionHeading";
import useSocials from "../hooks/useSocials";

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const HERO_HEADLINE = "I build and automate infrastructure that teams can actually rely on.";

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 0.8, 0.25, 1] },
  },
};

export default function Home() {
  const socials = useSocials();
  const [typedHeadline, setTypedHeadline] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setTypedHeadline(HERO_HEADLINE);
      setIsTyping(false);
      return undefined;
    }

    let index = 0;
    let timer;

    const typeNext = () => {
      index += 1;
      setTypedHeadline(HERO_HEADLINE.slice(0, index));

      if (index < HERO_HEADLINE.length) {
        timer = window.setTimeout(typeNext, 34);
      } else {
        setIsTyping(false);
      }
    };

    timer = window.setTimeout(typeNext, 550);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-shade" />
        <div className="home-hero-grid" />

        <div className="home-hero-content">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={reveal}
          >
            <p className="hero-eyebrow">Cloud · DevOps · Infrastructure</p>
            <p className="hero-name">SHUBHAM KHOTKAR</p>
            <p className="hero-role">Cloud &amp; DevOps Engineer</p>
            <h1
              className={`hero-headline ${isTyping ? "is-typing" : ""}`}
              aria-label={HERO_HEADLINE}
            >
              <span aria-hidden="true">{typedHeadline}</span>
              <span className="hero-type-caret" aria-hidden="true" />
            </h1>
            <p className="hero-tags">Cloud · Kubernetes · Terraform · CI/CD</p>

            <div className="hero-actions">
              <Link to="/projects" className="button button-primary">
                View my work <FiArrowUpRight />
              </Link>
              <Link to="/contact" className="button button-ghost">
                Let&apos;s talk <FiArrowUpRight />
              </Link>
            </div>
          </motion.div>
        </div>

        <a href="#tools" className="scroll-cue" aria-label="Scroll to explore">
          <span className="scroll-cue-mouse" aria-hidden="true">
            <span className="scroll-cue-wheel" />
          </span>
          <span className="scroll-cue-label">Scroll to explore</span>
          <FiChevronDown className="scroll-cue-chevron" aria-hidden="true" />
        </a>
      </section>

      <motion.section
        id="tools"
        className="home-section content-width home-panel-section"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.14 }}
      >
        <SectionHeading
          icon={<FiTool />}
          title="Tools I"
          accent="work with."
          aside={<span className="section-note">Curated from the portfolio CMS</span>}
        />
        <SkillList />
      </motion.section>

      <motion.section
        className="home-section content-width home-panel-section"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
      >
        <CareerJourney headingIcon={<FiBriefcase />} />
      </motion.section>

      <motion.section
        className="home-section content-width home-panel-section"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.14 }}
      >
        <Certifications headingIcon={<FiAward />} />
      </motion.section>

      <motion.section
        className="home-section content-width home-panel-section"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.14 }}
      >
        <SectionHeading
          icon={<FiLayers />}
          title="Selected"
          accent="engineering work."
          aside={
            <Link to="/projects" className="text-link">
              View all work <FiArrowUpRight />
            </Link>
          }
        />
        <FeaturedProjects />
      </motion.section>

      <motion.section
        className="home-section content-width home-panel-section github-section is-compact"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.12 }}
      >
        <SectionHeading
          icon={<FiGithub />}
          title="Open-source"
          accent="footprint."
          aside={
            socials.github && <a
              href={socials.github}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              GitHub profile <FiExternalLink />
            </a>
          }
        />

        <div className="github-dashboard">
          <div className="github-graph-panel">
            <GitHubGraph />
          </div>
          <div className="github-stats-panel">
            <GitHubStats />
          </div>
        </div>
      </motion.section>

      <motion.section
        className="home-cta content-width"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div>
          <span className="section-index is-icon" aria-hidden="true">
            <FiMail />
          </span>
          <h2>
            Have a system <span className="section-heading-accent">worth improving?</span>
          </h2>
          <p>
            Let&apos;s talk about the infrastructure, automation or platform
            problem you&apos;re solving.
          </p>
        </div>
        <Link to="/contact" className="button button-primary">
          Let&apos;s connect <FiArrowUpRight />
        </Link>
      </motion.section>
    </div>
  );
}
