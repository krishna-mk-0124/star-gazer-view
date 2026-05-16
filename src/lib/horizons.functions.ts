import { createServerFn } from "@tanstack/react-start";

// NASA api.nasa.gov key — DEMO_KEY is the public default
const NASA_API_KEY = "DEMO_KEY";

type Body = { id: string; name: string };
type Position = { name: string; ra: number; dec: number; range?: number };

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

function fmtDate(d: Date): string {
  // YYYY-MM-DD HH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

async function fetchBody(body: Body, isoTime: string): Promise<Position | null> {
  const start = new Date(isoTime);
  const stop = new Date(start.getTime() + 60 * 1000); // +1 minute window

  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${body.id}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'", // geocentric
    START_TIME: `'${fmtDate(start)}'`,
    STOP_TIME: `'${fmtDate(stop)}'`,
    STEP_SIZE: "'1m'",
    QUANTITIES: "'1,20'", // astrometric RA/DEC, range
    ANG_FORMAT: "'DEG'",
    CSV_FORMAT: "'YES'",
    api_key: NASA_API_KEY,
  });

  try {
    const res = await fetch(`${HORIZONS_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    const text = json.result || "";
    const soe = text.indexOf("$$SOE");
    const eoe = text.indexOf("$$EOE");
    if (soe < 0 || eoe < 0) return null;
    const block = text.slice(soe + 5, eoe).trim();
    const firstLine = block.split("\n")[0]?.trim();
    if (!firstLine) return null;
    // CSV: date, , RA, DEC, range, range-rate (when QUANTITIES 1,20)
    const cols = firstLine.split(",").map((c) => c.trim());
    // After date column(s), numeric values follow. Find first two numbers as RA/DEC.
    const nums = cols
      .map((c) => parseFloat(c))
      .filter((n) => Number.isFinite(n));
    if (nums.length < 2) return null;
    const [ra, dec, range] = nums;
    return { name: body.name, ra, dec, range };
  } catch {
    return null;
  }
}

export const getPlanetPositions = createServerFn({ method: "POST" })
  .inputValidator((input: { time: string; bodies: Body[] }) => input)
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.bodies.map((b) => fetchBody(b, data.time))
    );
    return {
      time: data.time,
      positions: results.filter((p): p is Position => p !== null),
    };
  });
