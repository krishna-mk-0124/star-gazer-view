import { createServerFn } from "@tanstack/react-start";

// CelesTrak catalog numbers
const SATS = [
  { id: "iss", name: "ISS (ZARYA)", catnr: "25544" },
  { id: "hubble", name: "Hubble (HST)", catnr: "20580" },
];

type TLE = {
  id: string;
  name: string;
  line1: string;
  line2: string;
};

async function fetchTLE(catnr: string): Promise<{ line1: string; line2: string } | null> {
  // CelesTrak TLE plain-text endpoint — three lines: name, line1, line2
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=TLE`;
  try {
    const res = await fetch(url, { headers: { Accept: "text/plain" } });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;
    return { line1: lines[1], line2: lines[2] };
  } catch {
    return null;
  }
}

export const getSatelliteTLEs = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ satellites: TLE[] }> => {
    const results = await Promise.all(
      SATS.map(async (s) => {
        const tle = await fetchTLE(s.catnr);
        if (!tle) return null;
        return { id: s.id, name: s.name, line1: tle.line1, line2: tle.line2 };
      })
    );
    return { satellites: results.filter((r): r is TLE => r !== null) };
  }
);
