import { formatLocal } from "@/lib/datetime";
import { photoUrl } from "@/lib/storage";
import type { InvitationData } from "@/lib/templates/types";
import { Countdown } from "./Countdown";

export interface TemplateProps {
  data: InvitationData;
  locale: string;
  /** The real UTC instant of the event, for the countdown. */
  eventIso: string;
}

const str = (v: InvitationData[string]) => (typeof v === "string" ? v : "");

export function WeddingClassic({ data, locale, eventIso }: TemplateProps) {
  const eventAt = str(data.eventAt);
  const when = eventAt ? formatLocal(eventAt, locale) : null;
  const cover = str(data.coverImage);
  const gallery = Array.isArray(data.gallery) ? data.gallery : [];
  const mapUrl = str(data.mapUrl);

  return (
    <main className="wedding-classic min-h-dvh bg-[#faf5ea] text-[#2c2a24]">
      <section
        className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-24 text-center"
        style={cover ? { backgroundImage: `linear-gradient(rgba(250,245,234,.82), rgba(250,245,234,.95)), url(${photoUrl(cover)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <p className="reveal text-xs uppercase tracking-[0.5em] text-[#8a6d2f]">With love</p>
        <h1 className="reveal font-display mt-8 text-6xl leading-[1.05] italic sm:text-8xl" style={{ animationDelay: ".15s" }}>
          {str(data.partnerOne)}
          <span className="block text-3xl not-italic text-[#8a6d2f] sm:text-5xl">&amp;</span>
          {str(data.partnerTwo)}
        </h1>
        {when && (
          <p className="reveal mt-10 text-sm uppercase tracking-[0.35em]" style={{ animationDelay: ".3s" }}>
            {when.date}
          </p>
        )}
        <div className="absolute bottom-8 text-[0.65rem] uppercase tracking-[0.4em] opacity-50">Scroll</div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl italic">{str(data.partnerOne)}</h2>
            <p className="mt-3 text-sm leading-relaxed opacity-75">{str(data.partnerOneParents)}</p>
          </div>
          <div>
            <h2 className="font-display text-3xl italic">{str(data.partnerTwo)}</h2>
            <p className="mt-3 text-sm leading-relaxed opacity-75">{str(data.partnerTwoParents)}</p>
          </div>
        </div>
        {str(data.message) && (
          <p className="font-display mx-auto mt-16 max-w-xl text-xl leading-relaxed italic">{str(data.message)}</p>
        )}
      </section>

      <section className="bg-[#2c2a24] px-6 py-24 text-center text-[#faf5ea]">
        <p className="text-xs uppercase tracking-[0.5em] text-[#d6b86a]">Counting down</p>
        <div className="mx-auto mt-10 max-w-xl">
          <Countdown targetIso={eventIso} />
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-[#8a6d2f]">The venue</p>
        <h2 className="font-display mt-6 text-4xl italic">{str(data.venueName)}</h2>
        {str(data.venueAddress) && <p className="mt-3 opacity-75">{str(data.venueAddress)}</p>}
        {when && (
          <p className="mt-6 text-sm uppercase tracking-[0.25em]">
            {when.date} · {when.time}
          </p>
        )}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block border border-[#2c2a24] px-8 py-3 text-xs uppercase tracking-[0.3em] transition hover:bg-[#2c2a24] hover:text-[#faf5ea]"
          >
            Directions →
          </a>
        )}
      </section>

      {gallery.length > 0 && (
        <section className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-6 pb-24 sm:grid-cols-3">
          {gallery.map((path) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={path} src={photoUrl(path)} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
          ))}
        </section>
      )}
    </main>
  );
}
