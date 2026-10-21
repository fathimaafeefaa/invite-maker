import { ImageResponse } from "next/og";
import { formatLocal } from "@/lib/datetime";
import { titleParts } from "@/lib/invitations";
import { getPublished } from "@/lib/published";
import { photoUrl } from "@/lib/storage";
import { getTemplate } from "@/lib/templates/registry";

export const alt = "You're invited";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Fetches the cover photo and inlines it; returns undefined if anything goes wrong. */
async function coverDataUrl(path: string): Promise<string | undefined> {
  try {
    const res = await fetch(photoUrl(path));
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/jpeg")) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getPublished(slug);
  const template = row && !row.expired ? getTemplate(row.template_id) : undefined;

  const names = row && template ? titleParts(template, row.data).join(" & ") : "";
  const when = row && typeof row.data.eventAt === "string" ? formatLocal(row.data.eventAt, row.locale) : null;
  const cover = row && typeof row.data.coverImage === "string" && row.data.coverImage ? await coverDataUrl(row.data.coverImage) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf5ea",
          color: "#2c2a24",
          position: "relative",
        }}
      >
        {cover && (
          <img src={cover} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {cover && <div style={{ position: "absolute", inset: 0, background: "rgba(250,245,234,0.86)", display: "flex" }} />}
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 10, textTransform: "uppercase", color: "#8a6d2f" }}>You&apos;re invited</div>
        <div style={{ display: "flex", marginTop: 36, fontSize: names.length > 22 ? 78 : 104, fontStyle: "italic", fontFamily: "serif", textAlign: "center", padding: "0 80px" }}>
          {names || "A celebration"}
        </div>
        {when && <div style={{ display: "flex", marginTop: 40, fontSize: 32, letterSpacing: 4, textTransform: "uppercase" }}>{when.date}</div>}
      </div>
    ),
    size,
  );
}
