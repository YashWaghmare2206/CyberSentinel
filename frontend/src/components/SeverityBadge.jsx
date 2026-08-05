import "./SeverityBadge.css";

export default function SeverityBadge({ severity }) {
  if (!severity) return null;
  return (
    <span className={`severity-badge severity-badge--${severity.toLowerCase()}`}>
      {severity}
    </span>
  );
}
