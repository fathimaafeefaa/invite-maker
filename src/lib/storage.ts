/** Public URL for an object in the invitation-photos bucket. */
export function photoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/invitation-photos/${path}`;
}
