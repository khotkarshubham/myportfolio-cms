import { useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import API from "../services/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const submit = async e => {
    e.preventDefault();
    try {
      await API.post("/contact", form);
      alert("Message sent successfully.");
      setForm({ name: "", email: "", message: "" });
    } catch { alert("Failed to send message."); }
  };

  return (
    <section className="public-page">
      <div className="public-page-inner public-page-narrow">
        <span className="section-index">CONTACT</span>
        <h1 className="public-title">Let’s build something dependable.</h1>
        <p className="public-lede">Have an infrastructure problem, a platform idea, or a deployment that needs less drama? Send a note.</p>
        <form onSubmit={submit} className="public-card contact-form">
          <div className="form-stack">
            {[["name", "Your name", "text"], ["email", "Your email", "email"]].map(([key, placeholder, type]) => (
              <input key={key} type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required className="public-input" />
            ))}
            <textarea placeholder="What are you working on?" rows="7" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required className="public-input" />
            <button className="button button-primary form-submit" type="submit">Send message <FiArrowUpRight /></button>
          </div>
        </form>
      </div>
    </section>
  );
}
