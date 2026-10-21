import { cache } from "react";
import { createPublicClient } from "./supabase/public";
import type { InvitationData } from "./templates/types";

export interface PublishedInvitation {
  template_id: string;
  locale: string;
  timezone: string;
  event_at: string | null;
  expired: boolean;
  data: InvitationData;
}

export const SLUG_PATTERN = /^[a-z0-9-]{4,40}$/;

/**
 * One published invitation by slug, via the anon-safe database function.
 * Wrapped in React `cache` so the page, its metadata and its preview image
 * share a single lookup per request.
 */
export const getPublished = cache(async (slug: string): Promise<PublishedInvitation | null> => {
  if (!SLUG_PATTERN.test(slug)) return null;
  const { data } = await createPublicClient().rpc("get_published_invitation", { p_slug: slug });
  return ((data as PublishedInvitation[] | null) ?? [])[0] ?? null;
});
