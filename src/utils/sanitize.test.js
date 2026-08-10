import { describe, it, expect } from "vitest";
import { escapeHtml, stripHtml, sanitizeUrl } from "./sanitize";

describe("escapeHtml", () => {
  it("escapes all five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#x27;");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("neutralizes a script-tag XSS payload", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("returns an empty string for non-string input", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes tags but keeps their text content", () => {
    expect(stripHtml("<b>bold</b> and <i>italic</i>")).toBe("bold and italic");
  });

  it("removes a script tag along with its content markers, leaving the inner text", () => {
    expect(stripHtml('<script>alert("x")</script>')).toBe('alert("x")');
  });

  it("returns an empty string for non-string input", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(123)).toBe("");
  });
});

describe("sanitizeUrl", () => {
  it("allows an http(s) URL", () => {
    expect(sanitizeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("allows a same-origin relative path", () => {
    expect(sanitizeUrl("/dashboard")).toBe("/dashboard");
  });

  it("blocks a javascript: URL", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks a data: URL", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("blocks a protocol-relative URL (//host/path)", () => {
    expect(sanitizeUrl("//evil.example.com/x")).toBe("");
  });

  it("trims surrounding whitespace before validating", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeUrl(null)).toBe("");
    expect(sanitizeUrl(undefined)).toBe("");
  });
});
