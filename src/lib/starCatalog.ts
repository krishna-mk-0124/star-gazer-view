// Major stars with RA (hours), Dec (degrees), apparent magnitude
export type Star = { name: string; ra: number; dec: number; mag: number };

export const STARS: Record<string, Star> = {
  // Ursa Major (Big Dipper)
  Dubhe: { name: "Dubhe", ra: 11.062, dec: 61.751, mag: 1.79 },
  Merak: { name: "Merak", ra: 11.031, dec: 56.382, mag: 2.37 },
  Phecda: { name: "Phecda", ra: 11.897, dec: 53.695, mag: 2.44 },
  Megrez: { name: "Megrez", ra: 12.257, dec: 57.033, mag: 3.31 },
  Alioth: { name: "Alioth", ra: 12.9, dec: 55.96, mag: 1.77 },
  Mizar: { name: "Mizar", ra: 13.399, dec: 54.926, mag: 2.27 },
  Alkaid: { name: "Alkaid", ra: 13.792, dec: 49.313, mag: 1.85 },

  // Orion
  Betelgeuse: { name: "Betelgeuse", ra: 5.919, dec: 7.407, mag: 0.42 },
  Bellatrix: { name: "Bellatrix", ra: 5.418, dec: 6.35, mag: 1.64 },
  Mintaka: { name: "Mintaka", ra: 5.533, dec: -0.299, mag: 2.23 },
  Alnilam: { name: "Alnilam", ra: 5.604, dec: -1.202, mag: 1.69 },
  Alnitak: { name: "Alnitak", ra: 5.679, dec: -1.943, mag: 1.74 },
  Saiph: { name: "Saiph", ra: 5.796, dec: -9.67, mag: 2.07 },
  Rigel: { name: "Rigel", ra: 5.242, dec: -8.202, mag: 0.18 },

  // Cassiopeia (W)
  Segin: { name: "Segin", ra: 1.907, dec: 63.67, mag: 3.35 },
  Ruchbah: { name: "Ruchbah", ra: 1.43, dec: 60.235, mag: 2.68 },
  Gamma_Cas: { name: "Navi", ra: 0.945, dec: 60.717, mag: 2.47 },
  Schedar: { name: "Schedar", ra: 0.675, dec: 56.537, mag: 2.24 },
  Caph: { name: "Caph", ra: 0.153, dec: 59.15, mag: 2.28 },

  // Southern Cross (Crux)
  Acrux: { name: "Acrux", ra: 12.443, dec: -63.099, mag: 0.77 },
  Mimosa: { name: "Mimosa", ra: 12.795, dec: -59.689, mag: 1.25 },
  Gacrux: { name: "Gacrux", ra: 12.519, dec: -57.113, mag: 1.63 },
  Delta_Cru: { name: "Imai", ra: 12.252, dec: -58.749, mag: 2.79 },

  // Extras for sky filler
  Sirius: { name: "Sirius", ra: 6.752, dec: -16.716, mag: -1.46 },
  Canopus: { name: "Canopus", ra: 6.399, dec: -52.696, mag: -0.74 },
  Vega: { name: "Vega", ra: 18.616, dec: 38.784, mag: 0.03 },
  Altair: { name: "Altair", ra: 19.846, dec: 8.868, mag: 0.77 },
  Deneb: { name: "Deneb", ra: 20.69, dec: 45.28, mag: 1.25 },
  Arcturus: { name: "Arcturus", ra: 14.261, dec: 19.182, mag: -0.05 },
  Capella: { name: "Capella", ra: 5.278, dec: 45.998, mag: 0.08 },
  Aldebaran: { name: "Aldebaran", ra: 4.598, dec: 16.509, mag: 0.85 },
  Procyon: { name: "Procyon", ra: 7.655, dec: 5.225, mag: 0.34 },
  Pollux: { name: "Pollux", ra: 7.755, dec: 28.026, mag: 1.14 },
  Castor: { name: "Castor", ra: 7.577, dec: 31.888, mag: 1.57 },
  Spica: { name: "Spica", ra: 13.42, dec: -11.161, mag: 1.04 },
  Antares: { name: "Antares", ra: 16.49, dec: -26.432, mag: 1.06 },
  Fomalhaut: { name: "Fomalhaut", ra: 22.961, dec: -29.622, mag: 1.16 },
  Regulus: { name: "Regulus", ra: 10.139, dec: 11.967, mag: 1.35 },
};

// Constellation line pairs
export const CONSTELLATIONS: [string, string][] = [
  // Big Dipper
  ["Dubhe", "Merak"],
  ["Merak", "Phecda"],
  ["Phecda", "Megrez"],
  ["Megrez", "Dubhe"],
  ["Megrez", "Alioth"],
  ["Alioth", "Mizar"],
  ["Mizar", "Alkaid"],
  // Orion
  ["Betelgeuse", "Bellatrix"],
  ["Bellatrix", "Mintaka"],
  ["Mintaka", "Alnilam"],
  ["Alnilam", "Alnitak"],
  ["Alnitak", "Saiph"],
  ["Saiph", "Rigel"],
  ["Rigel", "Mintaka"],
  ["Betelgeuse", "Alnitak"],
  // Cassiopeia
  ["Segin", "Ruchbah"],
  ["Ruchbah", "Gamma_Cas"],
  ["Gamma_Cas", "Schedar"],
  ["Schedar", "Caph"],
  // Southern Cross
  ["Acrux", "Gacrux"],
  ["Mimosa", "Delta_Cru"],
];

// Convert RA (hours) / Dec (deg) to a 3D point on a sphere of radius r
export function raDecToVec3(raHours: number, decDeg: number, r: number) {
  const raRad = (raHours / 24) * Math.PI * 2;
  const decRad = (decDeg * Math.PI) / 180;
  const x = r * Math.cos(decRad) * Math.cos(raRad);
  const y = r * Math.sin(decRad);
  const z = r * Math.cos(decRad) * Math.sin(raRad);
  return [x, y, z] as const;
}
