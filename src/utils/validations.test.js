import { describe, it, expect } from "vitest";
import { isValidEmail, isValidPhone } from "./validations";

describe("isValidEmail", () => {
  it("accepts an ordinary email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts a subdomain and plus-tag", () => {
    expect(isValidEmail("user+tag@mail.example.co.uk")).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects a string with no domain dot", () => {
    expect(isValidEmail("user@example")).toBe(false);
  });

  it("rejects a string containing whitespace", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts a 10-digit number", () => {
    expect(isValidPhone("1234567890")).toBe(true);
  });

  it("accepts a number with a leading +", () => {
    expect(isValidPhone("+11234567890")).toBe(true);
  });

  it("accepts the 15-digit upper bound", () => {
    expect(isValidPhone("123456789012345")).toBe(true);
  });

  it("rejects fewer than 10 digits", () => {
    expect(isValidPhone("123456789")).toBe(false);
  });

  it("rejects more than 15 digits", () => {
    expect(isValidPhone("1234567890123456")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(isValidPhone("123-456-7890")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });
});
