import sanitizeHtmlLib from "sanitize-html";

/**
 * Allowed HTML tags for CMS rich-text content.
 *
 * Keep this intentionally small. Anything not explicitly
 * allowed will be removed by sanitize-html.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
  "code",
  "pre"
];

/**
 * Allowed attributes.
 *
 * class is intentionally allowed because the frontend may
 * use utility/classes around rich text.
 */
const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  "*": ["class"]
};

/**
 * Only permit safe URL schemes for links.
 */
const ALLOWED_SCHEMES = [
  "http",
  "https",
  "mailto",
  "tel"
];

/**
 * Sanitize HTML intended for trusted CMS-rendered content.
 *
 * This uses a real HTML parser instead of regex-based
 * tag/attribute manipulation.
 */
export const sanitizeHtml = (value, maxLength = 50000) => {
  if (value === undefined || value === null) {
    return "";
  }

  const input = String(value);

  const sanitized = sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,

    allowedSchemes: ALLOWED_SCHEMES,

    /**
     * Prevent protocol-relative URLs such as:
     * //attacker.example
     */
    allowProtocolRelative: false,

    /**
     * Remove dangerous content instead of attempting to
     * transform it into something executable.
     */
    disallowedTagsMode: "discard",

    /**
     * Only allow normal links.
     */
    exclusiveFilter: (frame) => {
      if (frame.tag === "a") {
        const href = frame.attribs?.href;

        if (!href) {
          return true;
        }

        const trimmedHref = href.trim();

        if (
          trimmedHref.startsWith("//") ||
          trimmedHref.startsWith("\\\\")
        ) {
          return true;
        }
      }

      return false;
    },

    /**
     * Keep output from becoming unreasonably large.
     */
    textFilter: (text) => text
  });

  return sanitized.slice(0, maxLength);
};

/**
 * Escape plain text for contexts where HTML is NOT intended.
 *
 * IMPORTANT:
 * Do not use this for URLs. URLs should remain valid strings
 * and should be validated separately.
 */
export const escapeHtml = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Sanitize normal text input.
 *
 * This should be used for titles, names, descriptions,
 * identifiers, etc. — NOT for rich HTML content.
 */
export const sanitizeText = (value, maxLength = 500) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
};