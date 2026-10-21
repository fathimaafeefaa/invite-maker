import { describe, expect, it } from "vitest";
import { httpsUrlOrEmpty } from "../safe-url";

describe("httpsUrlOrEmpty", () => {
  it("accepts https links", () => {
    expect(httpsUrlOrEmpty("https://maps.app.goo.gl/abc")).toBe("https://maps.app.goo.gl/abc");
  });

  it("rejects everything else", () => {
    for (const v of ["javascript:alert(1)", "http://example.com", "data:text/html,hi", "//evil.com", "not a url", ""]) {
      expect(httpsUrlOrEmpty(v)).toBe("");
    }
  });
});
