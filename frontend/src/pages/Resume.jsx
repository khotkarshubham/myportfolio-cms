import { useEffect, useState } from "react";
import { FiArrowDown, FiFileText } from "react-icons/fi";
import API from "../services/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const SERVER_BASE = API_BASE.replace(/\/api\/?$/, "");

export default function Resume() {
  const [resumeUrl, setResumeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadResume = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await API.get("/public/profile");

        if (!mounted) return;

        const resumePath = response?.data?.resume;

        if (typeof resumePath === "string" && resumePath) {
          const url = resumePath.startsWith("http")
            ? resumePath
            : `${SERVER_BASE}${resumePath}`;

          setResumeUrl(url);
        } else {
          setResumeUrl("");
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to load resume:", err);
          setError(true);
          setResumeUrl("");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadResume();

    return () => {
      mounted = false;
    };
  }, []);

  const handleResumeClick = async () => {
    try {
      await API.post("/analytics/resume");
    } catch (err) {
      // Analytics failure must never prevent the resume from opening.
      console.warn("Resume analytics failed:", err);
    }
  };

  return (
    <section className="public-page">
      <div className="public-page-inner public-page-compact">
        <span className="section-index">PROFILE</span>

        <h1 className="public-title">A concise view of the work.</h1>

        <p className="public-lede">
          Experience, infrastructure skills and the engineering path behind
          this portfolio.
        </p>

        <div className="public-card resume-card">
          <div className="resume-card-info">
            <span className="skill-icon">
              <FiFileText />
            </span>

            <div>
              <strong>Resume PDF</strong>

              <span className="resume-status">
                {loading
                  ? "Loading the current resume…"
                  : resumeUrl
                    ? "Open the current resume document."
                    : error
                      ? "Unable to load the resume right now."
                      : "No resume has been uploaded yet."}
              </span>
            </div>
          </div>

          {resumeUrl && !loading && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary"
              onClick={handleResumeClick}
              aria-label="Open resume PDF"
            >
              Open <FiArrowDown />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
