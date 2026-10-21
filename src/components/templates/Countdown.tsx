"use client";

import { useEffect, useState } from "react";

const UNITS = [
  ["Days", 86_400_000],
  ["Hours", 3_600_000],
  ["Mins", 60_000],
  ["Secs", 1_000],
] as const;

export function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const values = now === null ? null : splitDuration(Math.max(0, new Date(targetIso).getTime() - now));

  return (
    <div className="grid grid-cols-4 gap-3 @2xl:gap-6" role="timer" aria-label="Time until the event">
      {UNITS.map(([label], i) => (
        <div key={label} className="text-center">
          <div className="font-display text-4xl tabular-nums @2xl:text-6xl">
            {values ? String(values[i]).padStart(2, "0") : "--"}
          </div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.25em] opacity-60">{label}</div>
        </div>
      ))}
    </div>
  );
}

function splitDuration(total: number): number[] {
  return UNITS.map(([, ms], i) => {
    const larger = i === 0 ? Infinity : UNITS[i - 1][1];
    return Math.floor((total % larger) / ms);
  });
}
