import { useEffect, useState } from "react";
export const passwordValid = (value) =>
  value.length >= 12 && new TextEncoder().encode(value).length <= 72;
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "new-password",
  disabled = false,
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!value) setShow(false);
  }, [value]);
  return (
    <label className="admin-field">
      <span>{label}</span>
      <div className="cms-password-field">
        <input
          required
          className="admin-input"
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={onChange}
        />
        <button
          type="button"
          aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
export function PasswordRequirements({ value }) {
  const length = value.length >= 12,
    bytes = new TextEncoder().encode(value).length <= 72;
  return (
    <div className="cms-password-rules">
      <p className={length ? "is-met" : ""}>
        {length ? "✓" : "○"} At least 12 characters
      </p>
      <p className={value && bytes ? "is-met" : ""}>
        {value && bytes ? "✓" : "○"} No more than 72 bytes (some symbols use
        multiple bytes)
      </p>
    </div>
  );
}
