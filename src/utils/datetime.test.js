import { describe, it, expect } from "vitest";
import { timeAgo, formatDate } from "./datetime";

// Relative offsets from "now" rather than frozen fake-timer dates — the
// function's own `new Date()` calls stay real, so a few ms of test runtime
// between building the fixture and the assertion can't flip a boundary.
function secondsAgo(n) {
  return new Date(Date.now() - n * 1000);
}

describe("timeAgo", () => {
  it("reports a few seconds as seconds", () => {
    expect(timeAgo(secondsAgo(5))).toBe("5 seconds ago");
  });

  it("singularizes a count of exactly 1", () => {
    expect(timeAgo(secondsAgo(1))).toBe("1 second ago");
  });

  it("reports minutes once past 60 seconds", () => {
    expect(timeAgo(secondsAgo(90))).toBe("1 minute ago");
  });

  it("reports hours once past 60 minutes", () => {
    expect(timeAgo(secondsAgo(3 * 3600))).toBe("3 hours ago");
  });

  it("reports days once past 24 hours", () => {
    expect(timeAgo(secondsAgo(2 * 86400))).toBe("2 days ago");
  });

  it("returns 'just now' for the current instant", () => {
    expect(timeAgo(new Date())).toBe("just now");
  });
});

describe("formatDate", () => {
  it("renders a relative string within the last 24 hours", () => {
    expect(formatDate(secondsAgo(3600))).toBe("1 hour ago");
  });

  it("renders an absolute short date once past 24 hours", () => {
    const twoDaysAgo = secondsAgo(2 * 86400);
    const result = formatDate(twoDaysAgo);
    // "Jan 1, 2024"-style output — assert it's no longer a relative string
    // rather than pinning exact locale formatting.
    expect(result).not.toMatch(/ago$/);
    expect(result).toBe(
      twoDaysAgo.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    );
  });
});
