import { describe, expect, it } from "vitest";
import { invitationTitle, publishSlug, titleParts } from "../invitations";
import { getTemplate } from "../templates/registry";

const template = getTemplate("wedding-classic")!;

describe("titles and slugs", () => {
  it("uses the template's title fields, not the first text fields", () => {
    expect(titleParts(template, template.sample)).toEqual(["Ruqiya", "Arshakh"]);
    expect(invitationTitle(template, template.sample)).toBe("Ruqiya & Arshakh");
  });

  it("falls back when nothing is filled in", () => {
    expect(invitationTitle(template, {})).toBe("Untitled invitation");
  });

  it("builds a valid readable slug", () => {
    const slug = publishSlug(template, template.sample);
    expect(slug).toMatch(/^[a-z0-9-]{4,40}$/);
    expect(slug.startsWith("ruqiy-arsha-")).toBe(true);
  });

  it("strips accents and symbols, and still produces a valid slug for non-Latin names", () => {
    expect(publishSlug(template, { partnerOne: "José!", partnerTwo: "Zoë" })).toMatch(/^jose-zoe-[a-z0-9]{6}$/);
    expect(publishSlug(template, { partnerOne: "ഫാത്തിമ", partnerTwo: "عائشة" })).toMatch(/^invite-[a-z0-9]{6}$/);
  });
});
