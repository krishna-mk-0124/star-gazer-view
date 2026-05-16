// Lightweight astronomy coordinate helper — RA(hours)/Dec(deg) → Az/El for an observer
// Reasonably accurate for display; not survey-grade.

export function raDecToAzAlt(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date
): { az: number; alt: number } {
  // Local sidereal time (in degrees) — Meeus approximation
  const JD = date.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;
  let GMST =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  GMST = ((GMST % 360) + 360) % 360;
  const LST = (GMST + lonDeg) % 360; // degrees

  const raDeg = raHours * 15;
  let HA = LST - raDeg; // hour angle in degrees
  HA = ((HA + 540) % 360) - 180; // normalize to [-180,180]

  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat = toRad(latDeg);
  const dec = toRad(decDeg);
  const haR = toRad(HA);

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(haR);
  const alt = Math.asin(sinAlt);
  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(haR) > 0) az = 2 * Math.PI - az;

  return { az, alt };
}

export function formatRA(raHours: number): string {
  const h = Math.floor(raHours);
  const m = Math.floor((raHours - h) * 60);
  const s = ((raHours - h) * 60 - m) * 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${s.toFixed(1)}s`;
}

export function formatDec(decDeg: number): string {
  const sign = decDeg >= 0 ? "+" : "-";
  const a = Math.abs(decDeg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = ((a - d) * 60 - m) * 60;
  return `${sign}${d}° ${String(m).padStart(2, "0")}' ${s.toFixed(1)}"`;
}

export function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}
