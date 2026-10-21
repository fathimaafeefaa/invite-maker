import { describe, expect, it } from "vitest";
import { buildDataSchema } from "../templates/schema";
import { getTemplate } from "../templates/registry";

const template = getTemplate("wedding-classic")!;
const schema = buildDataSchema(template);

describe("buildDataSchema", () => {
  it("accepts the template's own sample data", () => {
    expect(schema.safeParse(template.sample).success).toBe(true);
  });

  it("requires required fields", () => {
    const { partnerOne: _omit, ...rest } = template.sample;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(schema.safeParse({ ...template.sample, evil: "x" }).success).toBe(false);
  });

  it("rejects non-https map links", () => {
    for (const mapUrl of ["javascript:alert(1)", "http://maps.example.com", "data:text/html,hi"]) {
      expect(schema.safeParse({ ...template.sample, mapUrl }).success).toBe(false);
    }
  });

  it("rejects image values that are not storage paths", () => {
    expect(schema.safeParse({ ...template.sample, coverImage: "https://evil.example/x.png" }).success).toBe(false);
    expect(schema.safeParse({ ...template.sample, coverImage: "../../etc/passwd" }).success).toBe(false);
    expect(schema.safeParse({ ...template.sample, coverImage: "uid-1/inv-1/photo.webp" }).success).toBe(true);
  });

  it("caps text length", () => {
    expect(schema.safeParse({ ...template.sample, partnerOne: "a".repeat(61) }).success).toBe(false);
  });
});
