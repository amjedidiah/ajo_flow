/**
 * queueService unit tests — cycleDueDate calculations.
 *
 * The evaluateAndReorderQueue function depends on the AI trust agent
 * (external API), so we only test the pure logic here: due date math.
 */

import { describe, it, expect } from "bun:test";
import { cycleDueDate } from "../services/queueService";

describe("cycleDueDate", () => {
  const base = new Date("2026-03-01T10:00:00Z");

  // ─── Daily ─────────────────────────────────────────────────────────────

  it("daily: cycle 1 is due on creation day at 23:59:59", () => {
    const due = cycleDueDate("daily", base, 1);
    expect(due.getUTCFullYear()).toBe(2026);
    expect(due.getUTCMonth()).toBe(2); // March
    expect(due.getUTCDate()).toBe(1);
    expect(due.getUTCHours()).toBe(23);
    expect(due.getUTCMinutes()).toBe(59);
    expect(due.getUTCSeconds()).toBe(59);
  });

  it("daily: cycle 2 is due the next day", () => {
    const due = cycleDueDate("daily", base, 2);
    expect(due.getUTCDate()).toBe(2);
  });

  it("daily: cycle 7 is due 6 days after creation", () => {
    const due = cycleDueDate("daily", base, 7);
    expect(due.getUTCDate()).toBe(7);
  });

  // ─── Weekly ────────────────────────────────────────────────────────────

  it("weekly: cycle 1 is due on creation day", () => {
    const due = cycleDueDate("weekly", base, 1);
    expect(due.getUTCDate()).toBe(1);
  });

  it("weekly: cycle 2 is due 7 days after creation", () => {
    const due = cycleDueDate("weekly", base, 2);
    expect(due.getUTCDate()).toBe(8);
  });

  it("weekly: cycle 4 is due 21 days after creation", () => {
    const due = cycleDueDate("weekly", base, 4);
    expect(due.getUTCDate()).toBe(22);
  });

  // ─── Monthly ───────────────────────────────────────────────────────────

  it("monthly: cycle 1 is due on creation day", () => {
    const due = cycleDueDate("monthly", base, 1);
    expect(due.getUTCMonth()).toBe(2); // March
    expect(due.getUTCDate()).toBe(1);
  });

  it("monthly: cycle 2 is due 1 month after creation", () => {
    const due = cycleDueDate("monthly", base, 2);
    expect(due.getUTCMonth()).toBe(3);  // April
  });

  it("monthly: cycle 4 is due 3 months after creation", () => {
    const due = cycleDueDate("monthly", base, 4);
    expect(due.getUTCMonth()).toBe(5); // June
  });

  // ─── Edge cases ────────────────────────────────────────────────────────
  it("daily: wraps across month boundary", () => {
    const jan30 = new Date("2026-01-30T12:00:00Z");
    const due = cycleDueDate("daily", jan30, 3);
    // Jan 30 + 2 days = Feb 1
    expect(due.getUTCMonth()).toBe(1); // February
    expect(due.getUTCDate()).toBe(1);
  });

  it("monthly: wraps across year boundary", () => {
    const nov = new Date("2026-11-15T12:00:00Z");
    const due = cycleDueDate("monthly", nov, 3);
    // Nov + 2 months = Jan 2027
    expect(due.getUTCFullYear()).toBe(2027);
    expect(due.getUTCMonth()).toBe(0); // January
  });
});
