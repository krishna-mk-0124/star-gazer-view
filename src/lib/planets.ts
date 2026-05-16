// Planet config — Horizons body IDs + open-source textures from threex.planets
export type PlanetConfig = {
  id: string; // JPL Horizons COMMAND id
  name: string;
  texture: string;
  radius: number; // mesh radius on the celestial sphere (visual only)
  rotationPeriodHours: number; // negative = retrograde
  color: number; // fallback tint
};

const TEX =
  "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/";

export const PLANETS: PlanetConfig[] = [
  {
    id: "301",
    name: "Moon",
    texture: TEX + "moonmap1k.jpg",
    radius: 22,
    rotationPeriodHours: 655.7,
    color: 0xdddddd,
  },
  {
    id: "499",
    name: "Mars",
    texture: TEX + "marsmap1k.jpg",
    radius: 12,
    rotationPeriodHours: 24.6,
    color: 0xc1440e,
  },
  {
    id: "299",
    name: "Venus",
    texture: TEX + "venusmap.jpg",
    radius: 14,
    rotationPeriodHours: -5832.5,
    color: 0xe8c87a,
  },
  {
    id: "599",
    name: "Jupiter",
    texture: TEX + "jupitermap.jpg",
    radius: 20,
    rotationPeriodHours: 9.9,
    color: 0xd8b58a,
  },
  {
    id: "699",
    name: "Saturn",
    texture: TEX + "saturnmap.jpg",
    radius: 18,
    rotationPeriodHours: 10.7,
    color: 0xe3c98a,
  },
];
