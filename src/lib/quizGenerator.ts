// Procedural quiz generator — produces 10,000+ unique question variations
// across 4 categories: Planets, Stars, Constellations, Missions.

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  category: "Planets" | "Stars" | "Constellations" | "Missions";
};

type PlanetFact = {
  name: string;
  moons: number;
  diameterKm: number;
  dayHours: number;
  yearDays: number;
  position: number; // distance from Sun rank
  surfaceTempC: number;
};

const PLANETS: PlanetFact[] = [
  { name: "Mercury", moons: 0, diameterKm: 4879, dayHours: 1408, yearDays: 88, position: 1, surfaceTempC: 167 },
  { name: "Venus", moons: 0, diameterKm: 12104, dayHours: 5832, yearDays: 225, position: 2, surfaceTempC: 464 },
  { name: "Earth", moons: 1, diameterKm: 12742, dayHours: 24, yearDays: 365, position: 3, surfaceTempC: 15 },
  { name: "Mars", moons: 2, diameterKm: 6779, dayHours: 25, yearDays: 687, position: 4, surfaceTempC: -65 },
  { name: "Jupiter", moons: 95, diameterKm: 139820, dayHours: 10, yearDays: 4333, position: 5, surfaceTempC: -110 },
  { name: "Saturn", moons: 146, diameterKm: 116460, dayHours: 11, yearDays: 10759, position: 6, surfaceTempC: -140 },
  { name: "Uranus", moons: 27, diameterKm: 50724, dayHours: 17, yearDays: 30687, position: 7, surfaceTempC: -195 },
  { name: "Neptune", moons: 14, diameterKm: 49244, dayHours: 16, yearDays: 60190, position: 8, surfaceTempC: -200 },
];

type StarFact = { name: string; constellation: string; magnitude: number; type: string };
const STARS: StarFact[] = [
  { name: "Sirius", constellation: "Canis Major", magnitude: -1.46, type: "A-type main sequence" },
  { name: "Canopus", constellation: "Carina", magnitude: -0.74, type: "F-type supergiant" },
  { name: "Arcturus", constellation: "Boötes", magnitude: -0.05, type: "K-type giant" },
  { name: "Vega", constellation: "Lyra", magnitude: 0.03, type: "A-type main sequence" },
  { name: "Capella", constellation: "Auriga", magnitude: 0.08, type: "G-type giant" },
  { name: "Rigel", constellation: "Orion", magnitude: 0.13, type: "B-type supergiant" },
  { name: "Procyon", constellation: "Canis Minor", magnitude: 0.34, type: "F-type subgiant" },
  { name: "Betelgeuse", constellation: "Orion", magnitude: 0.42, type: "M-type red supergiant" },
  { name: "Altair", constellation: "Aquila", magnitude: 0.77, type: "A-type main sequence" },
  { name: "Aldebaran", constellation: "Taurus", magnitude: 0.85, type: "K-type giant" },
  { name: "Antares", constellation: "Scorpius", magnitude: 1.06, type: "M-type red supergiant" },
  { name: "Spica", constellation: "Virgo", magnitude: 1.04, type: "B-type binary" },
  { name: "Pollux", constellation: "Gemini", magnitude: 1.14, type: "K-type giant" },
  { name: "Deneb", constellation: "Cygnus", magnitude: 1.25, type: "A-type supergiant" },
  { name: "Polaris", constellation: "Ursa Minor", magnitude: 1.98, type: "F-type supergiant" },
];

type ConstellationFact = { name: string; brightest: string; hemisphere: "Northern" | "Southern" | "Equatorial"; nickname?: string };
const CONSTELLATIONS: ConstellationFact[] = [
  { name: "Orion", brightest: "Rigel", hemisphere: "Equatorial", nickname: "The Hunter" },
  { name: "Ursa Major", brightest: "Alioth", hemisphere: "Northern", nickname: "The Great Bear" },
  { name: "Ursa Minor", brightest: "Polaris", hemisphere: "Northern", nickname: "The Little Bear" },
  { name: "Cassiopeia", brightest: "Schedar", hemisphere: "Northern", nickname: "The Queen" },
  { name: "Cygnus", brightest: "Deneb", hemisphere: "Northern", nickname: "The Swan" },
  { name: "Leo", brightest: "Regulus", hemisphere: "Northern", nickname: "The Lion" },
  { name: "Lyra", brightest: "Vega", hemisphere: "Northern", nickname: "The Lyre" },
  { name: "Scorpius", brightest: "Antares", hemisphere: "Southern", nickname: "The Scorpion" },
  { name: "Crux", brightest: "Acrux", hemisphere: "Southern", nickname: "Southern Cross" },
  { name: "Carina", brightest: "Canopus", hemisphere: "Southern", nickname: "The Keel" },
  { name: "Taurus", brightest: "Aldebaran", hemisphere: "Northern", nickname: "The Bull" },
  { name: "Gemini", brightest: "Pollux", hemisphere: "Northern", nickname: "The Twins" },
  { name: "Andromeda", brightest: "Alpheratz", hemisphere: "Northern", nickname: "The Chained Maiden" },
];

type MissionFact = { name: string; year: number; agency: string; achievement: string };
const MISSIONS: MissionFact[] = [
  { name: "Apollo 11", year: 1969, agency: "NASA", achievement: "first crewed Moon landing" },
  { name: "Voyager 1", year: 1977, agency: "NASA", achievement: "farthest human-made object from Earth" },
  { name: "Voyager 2", year: 1977, agency: "NASA", achievement: "only mission to visit Uranus and Neptune" },
  { name: "Hubble Space Telescope", year: 1990, agency: "NASA/ESA", achievement: "deep-field optical imaging" },
  { name: "James Webb Space Telescope", year: 2021, agency: "NASA/ESA/CSA", achievement: "infrared cosmology observation" },
  { name: "Cassini", year: 1997, agency: "NASA/ESA", achievement: "Saturn system exploration" },
  { name: "Curiosity", year: 2011, agency: "NASA", achievement: "Mars surface rover" },
  { name: "Perseverance", year: 2020, agency: "NASA", achievement: "Mars sample collection" },
  { name: "Chandrayaan-3", year: 2023, agency: "ISRO", achievement: "first soft landing near the Moon's south pole" },
  { name: "Sputnik 1", year: 1957, agency: "USSR", achievement: "first artificial satellite" },
  { name: "Mariner 4", year: 1964, agency: "NASA", achievement: "first successful Mars flyby" },
  { name: "New Horizons", year: 2006, agency: "NASA", achievement: "Pluto flyby" },
  { name: "Tiangong", year: 2021, agency: "CNSA", achievement: "Chinese modular space station" },
  { name: "ISS", year: 1998, agency: "NASA/Roscosmos/ESA/JAXA/CSA", achievement: "continuously inhabited orbital laboratory" },
];

// ------------- helpers
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function buildOptions(correct: string, distractors: string[]): { options: string[]; answer: number } {
  const pool = shuffle(distractors.filter((d) => d !== correct)).slice(0, 3);
  const options = shuffle([correct, ...pool]);
  return { options, answer: options.indexOf(correct) };
}

// ------------- generators
type Gen = () => QuizQuestion;

const planetGens: Gen[] = [
  () => {
    const p = pick(PLANETS);
    const { options, answer } = buildOptions(
      String(p.moons),
      shuffle([0, 1, 2, 5, 14, 27, 79, 95, 146]).map(String)
    );
    return { q: `How many known moons does ${p.name} have?`, options, answer, category: "Planets" };
  },
  () => {
    const p = pick(PLANETS);
    const correct = `${p.diameterKm.toLocaleString()} km`;
    const distractors = PLANETS.filter((q) => q !== p).map((q) => `${q.diameterKm.toLocaleString()} km`);
    const { options, answer } = buildOptions(correct, distractors);
    return { q: `What is the approximate equatorial diameter of ${p.name}?`, options, answer, category: "Planets" };
  },
  () => {
    const p = pick(PLANETS);
    const correct = `${p.yearDays} days`;
    const distractors = PLANETS.filter((q) => q !== p).map((q) => `${q.yearDays} days`);
    const { options, answer } = buildOptions(correct, distractors);
    return { q: `How long is one year on ${p.name}?`, options, answer, category: "Planets" };
  },
  () => {
    const rank = 1 + Math.floor(Math.random() * 8);
    const p = PLANETS.find((q) => q.position === rank)!;
    const { options, answer } = buildOptions(p.name, PLANETS.map((q) => q.name));
    const ord = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][rank - 1];
    return { q: `Which planet is the ${ord} from the Sun?`, options, answer, category: "Planets" };
  },
  () => {
    const p = pick(PLANETS);
    const correct = `${p.surfaceTempC}°C`;
    const distractors = PLANETS.filter((q) => q !== p).map((q) => `${q.surfaceTempC}°C`);
    const { options, answer } = buildOptions(correct, distractors);
    return { q: `Average surface temperature of ${p.name}?`, options, answer, category: "Planets" };
  },
];

const starGens: Gen[] = [
  () => {
    const s = pick(STARS);
    const { options, answer } = buildOptions(s.constellation, CONSTELLATIONS.map((c) => c.name));
    return { q: `In which constellation is the star ${s.name}?`, options, answer, category: "Stars" };
  },
  () => {
    const s = pick(STARS);
    const { options, answer } = buildOptions(s.type, Array.from(new Set(STARS.map((x) => x.type))));
    return { q: `What spectral classification does ${s.name} belong to?`, options, answer, category: "Stars" };
  },
  () => {
    const s = pick(STARS);
    const correct = s.magnitude.toFixed(2);
    const distractors = STARS.filter((x) => x !== s).map((x) => x.magnitude.toFixed(2));
    const { options, answer } = buildOptions(correct, distractors);
    return { q: `What is the apparent visual magnitude of ${s.name}?`, options, answer, category: "Stars" };
  },
  () => {
    const c = pick(CONSTELLATIONS);
    const s = STARS.find((x) => x.name === c.brightest);
    if (!s) return starGens[0]();
    const { options, answer } = buildOptions(s.name, STARS.map((x) => x.name));
    return { q: `Which star is the brightest in ${c.name}?`, options, answer, category: "Stars" };
  },
];

const constellationGens: Gen[] = [
  () => {
    const c = pick(CONSTELLATIONS.filter((x) => x.nickname));
    const { options, answer } = buildOptions(c.name, CONSTELLATIONS.map((x) => x.name));
    return { q: `Which constellation is known as "${c.nickname}"?`, options, answer, category: "Constellations" };
  },
  () => {
    const c = pick(CONSTELLATIONS);
    const { options, answer } = buildOptions(c.hemisphere, ["Northern", "Southern", "Equatorial"]);
    return { q: `In which celestial hemisphere is ${c.name} predominantly visible?`, options, answer, category: "Constellations" };
  },
  () => {
    const c = pick(CONSTELLATIONS);
    const { options, answer } = buildOptions(c.brightest, STARS.map((s) => s.name));
    return { q: `Which is the brightest star of ${c.name}?`, options, answer, category: "Constellations" };
  },
];

const missionGens: Gen[] = [
  () => {
    const m = pick(MISSIONS);
    const correct = String(m.year);
    const distractors = MISSIONS.filter((x) => x !== m).map((x) => String(x.year));
    const { options, answer } = buildOptions(correct, distractors);
    return { q: `In what year was ${m.name} launched?`, options, answer, category: "Missions" };
  },
  () => {
    const m = pick(MISSIONS);
    const { options, answer } = buildOptions(m.agency, Array.from(new Set(MISSIONS.map((x) => x.agency))));
    return { q: `Which agency operated the ${m.name} mission?`, options, answer, category: "Missions" };
  },
  () => {
    const m = pick(MISSIONS);
    const { options, answer } = buildOptions(m.name, MISSIONS.map((x) => x.name));
    return { q: `Which mission is known for the ${m.achievement}?`, options, answer, category: "Missions" };
  },
];

const ALL: { category: QuizQuestion["category"]; gens: Gen[] }[] = [
  { category: "Planets", gens: planetGens },
  { category: "Stars", gens: starGens },
  { category: "Constellations", gens: constellationGens },
  { category: "Missions", gens: missionGens },
];

/**
 * Generate `count` non-repeating randomized questions, balanced across categories.
 */
export function generateQuiz(count = 30): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const seen = new Set<string>();
  let safety = 0;
  while (out.length < count && safety < count * 25) {
    safety++;
    const bucket = ALL[out.length % ALL.length];
    const q = pick(bucket.gens)();
    const key = q.q + "|" + q.options.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
