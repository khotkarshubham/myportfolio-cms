import { useState } from "react";
import {
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaWhatsapp,
} from "react-icons/fa";
import { FiArrowUpRight, FiMail, FiMapPin } from "react-icons/fi";
import API from "../services/api";
import PublicPage from "../components/PublicPage";
import useSocials from "../hooks/useSocials";

const CHANNELS = [
  { key: "github", label: "GitHub", hint: "Code and open source", icon: FaGithub },
  { key: "linkedin", label: "LinkedIn", hint: "Career and professional work", icon: FaLinkedin },
  { key: "instagram", label: "Instagram", hint: "Behind the work", icon: FaInstagram },
  { key: "whatsapp", label: "WhatsApp", hint: "Start a conversation", icon: FaWhatsapp },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const socials = useSocials();
  const [status, setStatus] = useState("idle");
  const [feedback, setFeedback] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");

    try {
      await API.post("/contact", form);
      setForm({ name: "", email: "", message: "" });
      setStatus("sent");
      setFeedback("Message sent. I'll get back to you shortly.");
    } catch {
      setStatus("error");
      setFeedback("Could not send the message. Please try again or email me directly.");
    }
  };

  const visibleChannels = CHANNELS.filter((channel) => socials[channel.key]);

  return (
    <PublicPage>
      <div className="contact-layout">
        <div className="contact-intro">
          <span className="section-index is-icon" aria-hidden="true">
            <FiMail />
          </span>
          <h1 className="public-title">
            Let’s build something <span className="section-heading-accent">dependable.</span>
          </h1>
          <p className="public-lede">
            Have an infrastructure problem, a platform idea, or a deployment
            that needs less drama? Send a note or reach me on any of these channels.
          </p>

          <div className="contact-direct">
            {socials.mailto && (
              <a className="contact-direct-link" href={socials.mailto}>
                <FiMail aria-hidden="true" />
                <span>
                  <strong>Email</strong>
                  <small>{socials.email}</small>
                </span>
              </a>
            )}
            <p className="contact-direct-link is-static">
              <FiMapPin aria-hidden="true" />
              <span>
                <strong>Based in</strong>
                <small>Pune, Maharashtra · Open to remote</small>
              </span>
            </p>
          </div>

          <ul className="contact-socials" aria-label="Social profiles">
            {visibleChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <li key={channel.key}>
                  <a
                    href={socials[channel.key]}
                    target="_blank"
                    rel="noreferrer"
                    className={`contact-social is-${channel.key}`}
                  >
                    <span className="contact-social-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span>
                      <strong>{channel.label}</strong>
                      <small>{channel.hint}</small>
                    </span>
                    <FiArrowUpRight aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <form onSubmit={submit} className="public-card contact-form">
          <div className="contact-form-head">
            <h2>Send a message</h2>
            <p>I usually reply within one or two working days.</p>
          </div>
          <div className="form-stack">
            <label className="contact-field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                className="public-input"
              />
            </label>
            <label className="contact-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                className="public-input"
              />
            </label>
            <label className="contact-field">
              <span>Message</span>
              <textarea
                name="message"
                placeholder="What are you working on?"
                rows="7"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                required
                className="public-input"
              />
            </label>
            {feedback && (
              <p className={`contact-feedback is-${status}`} role="status">
                {feedback}
              </p>
            )}
            <button
              className="button button-primary form-submit"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Send message"} <FiArrowUpRight />
            </button>
          </div>
        </form>
      </div>
    </PublicPage>
  );
}
