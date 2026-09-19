import { FaEnvelope, FaGithub, FaInstagram, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";
import useSocials from "../hooks/useSocials";

export default function Footer() {
  const socials = useSocials();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand-block">
          <div className="footer-brand">Shubham Khotkar</div>
          <p className="footer-meta">
            Cloud &amp; DevOps · reliable infrastructure and delivery systems.
          </p>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/resume">Resume</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="footer-links">
          {socials.github && (
            <a href={socials.github} target="_blank" rel="noreferrer" aria-label="GitHub">
              <FaGithub />
            </a>
          )}
          {socials.linkedin && (
            <a href={socials.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <FaLinkedin />
            </a>
          )}
          {socials.instagram && (
            <a href={socials.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
          )}
          {socials.whatsapp && (
            <a href={socials.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <FaWhatsapp />
            </a>
          )}
          {socials.mailto && (
            <a href={socials.mailto} aria-label="Email">
              <FaEnvelope />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
