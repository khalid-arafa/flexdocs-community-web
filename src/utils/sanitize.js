const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ESCAPE_RE = /[&<>"']/g;

/**
 * Escapes HTML entities in a string to prevent XSS.
 * Use when rendering user-provided text in non-React contexts
 * (e.g., innerHTML, tooltips, or third-party libraries).
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Strips all HTML tags from a string.
 */
export function stripHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitizes a string for safe use in URLs.
 * Only allows http/https protocols.
 */
export function sanitizeUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/[^/]/.test(trimmed)) return trimmed; // relative paths
  return "";
}
