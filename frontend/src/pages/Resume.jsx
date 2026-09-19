import { useEffect, useState } from "react";
import { FiArrowDown, FiFileText } from "react-icons/fi";
import API from "../services/api";
import PublicPage from "../components/PublicPage";
import SectionHeading from "../components/SectionHeading";
import assetUrl from "../utils/assetUrl";

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

        setResumeUrl(
          typeof resumePath === "string" ? assetUrl(resumePath) : ""
        );
      } catch {
        if (mounted) {
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
    } catch {
      // Analytics failure must never prevent the resume from opening.
    }
  };

  return (
    <PublicPage>
      <SectionHeading
        icon={<FiFileText />}
        title="A concise view of the"
        accent="work."
      />

      <p className="public-lede">
        Experience, infrastructure skills and the engineering path behind this
        portfolio.
      </p>

      <div className="public-card resume-card">
        <div className="resume-card-info">
          <span className="skill-icon" aria-hidden="true">
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
    </PublicPage>
  );
}