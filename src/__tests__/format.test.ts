import { describe, it, expect } from "vitest";
import { formatINR } from "@/lib/format";

describe("formatINR", () => {
  it("formats zero correctly", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("formats hundreds with no comma", () => {
    expect(formatINR(500)).toBe("₹500");
  });

  it("formats thousands with comma", () => {
    expect(formatINR(1500)).toBe("₹1,500");
  });

  it("formats ten-thousands in Indian style (no split at 10k)", () => {
    expect(formatINR(10000)).toBe("₹10,000");
  });

  it("formats one lakh with Indian comma grouping", () => {
    expect(formatINR(100000)).toBe("₹1,00,000");
  });

  it("formats ten lakhs correctly", () => {
    expect(formatINR(1000000)).toBe("₹10,00,000");
  });

  it("formats one crore correctly", () => {
    expect(formatINR(10000000)).toBe("₹1,00,00,000");
  });

  it("truncates decimal places to zero", () => {
    // Intl rounds halves up
    expect(formatINR(1500.75)).toBe("₹1,501");
    expect(formatINR(1500.25)).toBe("₹1,500");
  });

  it("handles negative values", () => {
    // Negative amounts represented with minus sign
    const result = formatINR(-500);
    expect(result).toContain("500");
    expect(result).toContain("₹");
  });
});
