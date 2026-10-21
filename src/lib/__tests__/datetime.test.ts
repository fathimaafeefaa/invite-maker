import { describe, expect, it } from "vitest";
import { formatLocal, localToInstant } from "../datetime";

describe("localToInstant", () => {
  it("converts IST wall-clock time to UTC", () => {
    expect(localToInstant("2026-12-24T11:00", "Asia/Kolkata").toISOString()).toBe("2026-12-24T05:30:00.000Z");
  });

  it("handles zones with DST", () => {
    expect(localToInstant("2026-07-01T12:00", "America/New_York").toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(localToInstant("2026-01-01T12:00", "America/New_York").toISOString()).toBe("2026-01-01T17:00:00.000Z");
  });
});

describe("formatLocal", () => {
  it("formats the date as written, regardless of the server timezone", () => {
    const { date, time } = formatLocal("2026-10-24T11:00", "en");
    expect(date).toBe("Saturday, October 24, 2026");
    expect(time).toBe("11:00 AM");
  });
});
