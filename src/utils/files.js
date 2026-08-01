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
 */
export function getFileUrl({ file, token, size }) {
  const filename = encodeURIComponent(`${file.name}.${file.ext}`);
  const base = `${API_URL}/projects/${encodeURIComponent(
    file.projectCode
  )}/storage/${file._id}/${filename}`;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (size) params.set("size", size);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function formatBytes(bytes, decimals = 0) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}