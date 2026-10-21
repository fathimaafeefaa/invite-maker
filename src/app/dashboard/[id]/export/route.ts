import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

// Host-only CSV of RSVPs. RLS limits rows to the signed-in owner's invitations.
export async function GET(_req: NextRequest, ctx: RouteContext<"/dashboard/[id]/export">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: inv } = await supabase.from("invitations").select("id, slug").eq("id", id).maybeSingle();
  if (!inv) return new NextResponse("Not found", { status: 404 });

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("name, attending, guest_count, phone, email, message, created_at")
    .eq("invitation_id", id)
    .order("created_at", { ascending: true });

  const csv = toCsv([
    ["Name", "Attending", "Guests", "Phone", "Email", "Message", "Received (UTC)"],
    ...(rsvps ?? []).map((r) => [r.name, r.attending ? "Yes" : "No", r.guest_count, r.phone, r.email, r.message, r.created_at]),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvps-${inv.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
