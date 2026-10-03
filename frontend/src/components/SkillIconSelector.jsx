import { useId } from "react";
import { skillIcons } from "../utils/skillIcons";
import SkillIcon from "./SkillIcon";

const labels = {
  aws: "AWS",
  gcp: "Google Cloud",
  nodejs: "Node.js",
  githubactions: "GitHub Actions",
  azuredevops: "Azure DevOps",
  redhatopenshift: "OpenShift",
  dotnet: ".NET",
  hyperv: "Hyper-V",
  "generic-code": "Code (generic)",
  "generic-cloud": "Cloud (generic)",
  "generic-server": "Server (generic)",
  "generic-database": "Database (generic)",
  "generic-tool": "Tool (generic)",
};
export default function SkillIconSelector({
  name,
  value,
  onChange,
  disabled = false,
}) {
  const id = useId();
  return (
    <div className="skill-icon-selector">
      <label htmlFor={id}>Icon for {name.trim() || "new skill"}</label>
      <div className="skill-editor-input">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">Automatic (match skill name)</option>
          {Object.keys(skillIcons)
            .sort()
            .map((key) => (
              <option key={key} value={key}>
                {labels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
        </select>
        <span className="skill-icon">
          <SkillIcon name={name} iconKey={value} />
        </span>
      </div>
      <p className="cms-muted">
        Choose a brand or generic icon if automatic matching is unavailable.
        Select Automatic to reset.
      </p>
    </div>
  );
}
