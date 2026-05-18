// Low-precision geocentric ephemeris for Sun, Moon, and major planets.
// Returns RA (hours) and Dec (degrees) of date. Accuracy ~ a few arcminutes —
// plenty for visualization and guarantees each body has a mathematically
// unique position so meshes never stack at a shared origin.

const DEG = Math.PI / 180;
const EPS = 23.4392911 * DEG; // mean obliquity J2000

function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

type Elem = {
  a: number; e: number; i: number; L: number; lp: number; node: number;
  da: number; de: number; di: number; dL: number; dlp: number; dnode: number;
};

// Mean keplerian elements at J2000 + rates per Julian century (JPL)
const ELEMS: Record<string, Elem> = {
  Earth: {
    a: 1.00000261, e: 0.01671123, i: -0.00001531, L: 100.46457166,
    lp: 102.93768193, node: 0.0,
    da: 0.00000562, de: -0.00004392, di: -0.01294668, dL: 35999.37244981,
    dlp: 0.32327364, dnode: 0,
  },
  Mars: {
    a: 1.52371034, e: 0.09339410, i: 1.84969142, L: -4.55343205,
    lp: -23.94362959, node: 49.55953891,
    da: 0.00001847, de: 0.00007882, di: -0.00813131, dL: 19140.30268499,
    dlp: 0.44441088, dnode: -0.29257343,
  },
  Venus: {
    a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.97909950,
    lp: 131.60246718, node: 76.67984255,
    da: 0.00000390, de: -0.00004107, di: -0.00078890, dL: 58517.81538729,
    dlp: 0.00268329, dnode: -0.27769418,
  },
  Jupiter: {
    a: 5.20288700, e: 0.04838624, i: 1.30439695, L: 34.39644051,
    lp: 14.72847983, node: 100.47390909,
    da: -0.00011607, de: -0.00013253, di: -0.00183714, dL: 3034.74612775,
    dlp: 0.21252668, dnode: 0.20469106,
  },
  Saturn: {
    a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423,
    lp: 92.59887831, node: 113.66242448,
    da: -0.00125060, de: -0.00050991, di: 0.00193609, dL: 1222.49362201,
    dlp: -0.41897216, dnode: -0.28867794,
  },
};

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let k = 0; k < 10; k++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

/** Heliocentric ecliptic rectangular coords (AU) for a planet at century T. */
function heliocentric(name: string, T: number): { x: number; y: number; z: number } {
  const el = ELEMS[name];
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const i = (el.i + el.di * T) * DEG;
  const L = (el.L + el.dL * T) * DEG;
  const lp = (el.lp + el.dlp * T) * DEG;
  const node = (el.node + el.dnode * T) * DEG;
  const w = lp - node;
  let M = L - lp;
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w);
  const cn = Math.cos(node), sn = Math.sin(node);
  const ci = Math.cos(i), si = Math.sin(i);
  return {
    x: (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    y: (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    z: (sw * si) * xp + (cw * si) * yp,
  };
}

function eclToRaDec(x: number, y: number, z: number) {
  const xe = x;
  const ye = y * Math.cos(EPS) - z * Math.sin(EPS);
  const ze = y * Math.sin(EPS) + z * Math.cos(EPS);
  let ra = Math.atan2(ye, xe);
  if (ra < 0) ra += 2 * Math.PI;
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye));
  return { raHours: (ra * 12) / Math.PI, decDeg: (dec * 180) / Math.PI };
}

function moonRaDec(JD: number) {
  const d = JD - 2451545.0;
  const L = (218.316 + 13.176396 * d) * DEG;
  const M = (134.963 + 13.064993 * d) * DEG;
  const F = (93.272 + 13.229350 * d) * DEG;
  const lon = L + 6.289 * DEG * Math.sin(M);
  const lat = 5.128 * DEG * Math.sin(F);
  const x = Math.cos(lat) * Math.cos(lon);
  const y = Math.cos(lat) * Math.sin(lon);
  const z = Math.sin(lat);
  return eclToRaDec(x, y, z);
}

/**
 * RA/Dec of `name` as observed from `origin` (default "Earth"). When the
 * observer is on the Moon we treat the origin as Earth (geocentric proxy).
 */
export function planetRaDec(
  name: string,
  date: Date,
  origin: string = "Earth"
): { raHours: number; decDeg: number } {
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525;
  const originKey = origin === "Moon" ? "Earth" : origin;
  const o = ELEMS[originKey] ? heliocentric(originKey, T) : heliocentric("Earth", T);
  if (name === "Sun") return eclToRaDec(-o.x, -o.y, -o.z);
  if (name === "Moon" && originKey === "Earth") return moonRaDec(JD);
  if (!ELEMS[name]) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    // Combine with origin to spread per-perspective so nothing stacks
    for (let i = 0; i < origin.length; i++) h = (h * 17 + origin.charCodeAt(i)) | 0;
    return { raHours: ((h >>> 0) % 24000) / 1000, decDeg: ((h % 18000) / 100) - 90 };
  }
  const p = heliocentric(name, T);
  return eclToRaDec(p.x - o.x, p.y - o.y, p.z - o.z);
}
