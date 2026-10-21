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
    const missing: Record<string, unknown> = { ...template.sample };
    delete missing.partnerOne;
    expect(schema.safeParse(missing).success).toBe(false);
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

describe("draft mode", () => {
  const draft = buildDataSchema(template, { draft: true });

  it("allows incomplete data while editing", () => {
    expect(draft.safeParse({ partnerOne: "Ruqiya" }).success).toBe(true);
    expect(draft.safeParse({}).success).toBe(true);
  });

  it("still enforces safety rules", () => {
    expect(draft.safeParse({ mapUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(draft.safeParse({ unknown: "x" }).success).toBe(false);
  });

  it("publish mode still requires required fields", () => {
    expect(schema.safeParse({ partnerOne: "Ruqiya" }).success).toBe(false);
  });
});
