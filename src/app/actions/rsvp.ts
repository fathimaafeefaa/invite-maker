"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type RsvpState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const SLUG = /^[a-z0-9-]{4,40}$/;

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email"),
  phone: z.string().trim().max(30).regex(/^[0-9+()\-\s]*$/, "Use digits only"),
  attending: z.enum(["yes", "no"]),
  guests: z.coerce.number().int().min(1, "At least 1").max(20, "20 at most"),
  message: z.string().trim().max(500, "Please keep it under 500 characters"),
});

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/**
 * Guest RSVP. Guests have no account, so this runs on the server: it validates
 * input, rate-limits by IP and by invitation, then calls submit_rsvp with the
 * service role (the only role allowed to).
 */
export async function submitRsvp(slug: string, _prev: RsvpState, formData: FormData): Promise<RsvpState> {
  if (!SLUG.test(slug)) return { status: "error", message: "This invitation is not available." };

  // Honeypot: real people never fill the hidden "website" field. Pretend success.
  if (field(formData, "website") !== "") return { status: "ok" };

  const parsed = schema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    attending: field(formData, "attending"),
    guests: field(formData, "attending") === "yes" ? field(formData, "guests") || "1" : "1",
    message: field(formData, "message"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }
  const v = parsed.data;

  const admin = createAdminClient();
  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Scoped per invitation so guests sharing an IP (venue Wi-Fi, mobile carriers) at different events do not share a limit.
  const ipKey = `rsvp:ip:${createHash("sha256").update(forwarded).digest("hex").slice(0, 32)}:${slug}`;

  const [byIp, bySlug] = await Promise.all([
    admin.rpc("check_rate_limit", { p_key: ipKey, p_max: 15, p_window: "1 hour" }),
    admin.rpc("check_rate_limit", { p_key: `rsvp:slug:${slug}`, p_max: 300, p_window: "1 hour" }),
  ]);
  if (byIp.data === false || bySlug.data === false) {
    return { status: "error", message: "Too many replies right now. Please try again in a little while." };
  }

  const { error } = await admin.rpc("submit_rsvp", {
    p_slug: slug,
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_attending: v.attending === "yes",
    p_guest_count: v.guests,
    p_message: v.message,
  });
  if (error) {
    const closed = error.code === "P0002";
    return {
      status: "error",
      message: closed ? "This invitation is no longer accepting replies." : "Something went wrong. Please try again.",
    };
  }
  return { status: "ok" };
}
