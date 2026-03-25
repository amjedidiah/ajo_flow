import { describe, it, expect } from "bun:test";
import { ngn } from "@/lib/helpers";

describe("ngn", () => {
  it("formats a whole number as Nigerian Naira", () => {
    const result = ngn(5000);
    expect(result).toContain("5,000");
    // Should contain the Naira sign (₦ or NGN depending on locale)
    expect(result).toMatch(/₦|NGN/);
  });

  it("formats zero", () => {
    const result = ngn(0);
    expect(result).toContain("0");
  });

  it("formats decimal amounts", () => {
    const result = ngn(1234.56);
    expect(result).toContain("1,234");
  });

  it("formats large amounts", () => {
    const result = ngn(1000000);
    expect(result).toContain("1,000,000");
  });
});
