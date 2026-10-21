/** Offset (ms) of `timeZone` from UTC at the instant `ts`. */
function tzOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

function parseLocal(local: string) {
  const [date, time] = local.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return { y, mo, d, h, mi };
}

/** Converts a wall-clock "YYYY-MM-DDTHH:mm" in `timeZone` to the real instant. */
export function localToInstant(local: string, timeZone: string): Date {
  const { y, mo, d, h, mi } = parseLocal(local);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = tzOffsetMs(guess, timeZone);
  let result = guess - first;
  const second = tzOffsetMs(result, timeZone);
  if (second !== first) result = guess - second;
  return new Date(result);
}

/** Formats the wall-clock date/time as written, with no timezone shifting. */
export function formatLocal(local: string, locale: string) {
  const { y, mo, d, h, mi } = parseLocal(local);
  const when = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return {
    date: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(when),
    time: new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(when),
  };
}
