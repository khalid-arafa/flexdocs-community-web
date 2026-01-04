export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const units = [
    { name: "year", value: 31536000 },
    { name: "month", value: 2592000 },
    { name: "day", value: 86400 },
    { name: "hour", value: 3600 },
    { name: "minute", value: 60 },
    { name: "second", value: 1 }
  ];

  for (let u of units) {
    const count = Math.floor(seconds / u.value);
    if (count > 0) return `${count} ${u.name}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export function formatDate(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds > 3600 * 24) return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const units = [
    { name: "year", value: 31536000 },
    { name: "month", value: 2592000 },
    { name: "day", value: 86400 },
    { name: "hour", value: 3600 },
    { name: "minute", value: 60 },
    { name: "second", value: 1 }
  ];

  for (let u of units) {
    const count = Math.floor(seconds / u.value);
    if (count > 0) return `${count} ${u.name}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}