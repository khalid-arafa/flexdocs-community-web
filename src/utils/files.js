import { API_URL } from "@/constants";

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "ico",
]);

/** True for files the API can serve inline as an image (and resize). */
export function isImageFile(file) {
  return IMAGE_EXTENSIONS.has(String(file?.ext || "").toLowerCase());
}

/**
 * Absolute download URL for a stored file.
 *
 * The name segment is percent-encoded — file names may hold non-ASCII
 * characters (Arabic), spaces, "#", "?" or "%", each of which makes a raw URL
 * broken or truncated once copied out of the dashboard.
 *
 * `size` requests a resized copy ("small" | "medium" | "large"), which the API
 * only honours for images.
 *
 * NO AUTH MATERIAL GOES IN THIS URL. It used to take a `token` and put the
 * long-lived PROJECT token in the query string, which leaked it into browser
 * history, the Referer of every outbound link and every proxy/access log in
 * between — and it was a reusable, project-wide credential, not a grant for the
 * one file. Public files need no credential at all; private ones are reached
 * through a short-lived, file-scoped SIGNED url the API mints (see
 * `getSignedDownloadUrl` in utils/api and `toAbsoluteApiUrl` below).
 */
export function getFileUrl({ file, size, projectCode }) {
  const filename = encodeURIComponent(`${file.name}.${file.ext}`);
  const base = `${API_URL}/projects/${encodeURIComponent(
    projectCode || file.projectCode
  )}/storage/${encodeURIComponent(String(file._id))}/${filename}`;
  const params = new URLSearchParams();
  if (size) params.set("size", size);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * The signed-url endpoint answers with a path relative to the API root
 * ("projects/<code>/storage/<id>/<name>?expires=…&signature=…"); make it
 * absolute without doubling or dropping the separating slash.
 */
export function toAbsoluteApiUrl(relativePath) {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${API_URL}/${String(relativePath).replace(/^\/+/, "")}`;
}

export function formatBytes(bytes, decimals = 0) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}