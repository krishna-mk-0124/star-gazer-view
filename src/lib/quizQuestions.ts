export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number; // index into options
};

export const QUIZ: QuizQuestion[] = [
  { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Mercury"], answer: 1 },
  { q: "What is the largest planet in our solar system?", options: ["Saturn", "Neptune", "Jupiter", "Earth"], answer: 2 },
  { q: "Which star is at the center of our solar system?", options: ["Sirius", "Alpha Centauri", "Polaris", "The Sun"], answer: 3 },
  { q: "What galaxy do we live in?", options: ["Andromeda", "Milky Way", "Triangulum", "Sombrero"], answer: 1 },
  { q: "Which planet has the most prominent rings?", options: ["Uranus", "Jupiter", "Saturn", "Neptune"], answer: 2 },
  { q: "How many moons does Earth have?", options: ["0", "1", "2", "3"], answer: 1 },
  { q: "What is the brightest star in Earth's night sky?", options: ["Vega", "Sirius", "Betelgeuse", "Polaris"], answer: 1 },
  { q: "Which constellation contains the Big Dipper?", options: ["Orion", "Cassiopeia", "Ursa Major", "Leo"], answer: 2 },
  { q: "What is a light-year a measure of?", options: ["Time", "Distance", "Brightness", "Mass"], answer: 1 },
  { q: "Which planet rotates on its side?", options: ["Uranus", "Neptune", "Pluto", "Venus"], answer: 0 },
  { q: "What is the closest star to Earth (besides the Sun)?", options: ["Sirius", "Proxima Centauri", "Barnard's Star", "Alpha Centauri A"], answer: 1 },
  { q: "What causes a solar eclipse?", options: ["Earth between Sun and Moon", "Moon between Sun and Earth", "Sun between Earth and Moon", "Mars passing the Sun"], answer: 1 },
  { q: "Which is the hottest planet in our solar system?", options: ["Mercury", "Venus", "Mars", "Jupiter"], answer: 1 },
  { q: "What is the name of NASA's most famous space telescope launched in 1990?", options: ["James Webb", "Spitzer", "Hubble", "Kepler"], answer: 2 },
  { q: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mars", "Mercury"], answer: 3 },
  { q: "What is the term for a star explosion?", options: ["Nebula", "Supernova", "Pulsar", "Quasar"], answer: 1 },
  { q: "Which constellation is known as 'The Hunter'?", options: ["Leo", "Orion", "Gemini", "Taurus"], answer: 1 },
  { q: "What is the Milky Way's shape?", options: ["Elliptical", "Irregular", "Spiral", "Lenticular"], answer: 2 },
  { q: "Which space agency landed humans on the Moon?", options: ["ESA", "Roscosmos", "NASA", "ISRO"], answer: 2 },
  { q: "What is the name of our Moon?", options: ["Phobos", "Luna", "Titan", "Europa"], answer: 1 },
  { q: "What kind of object is the Sun?", options: ["Planet", "Asteroid", "Star", "Comet"], answer: 2 },
  { q: "What is a black hole?", options: ["A region of empty space", "An ultra-dense object with strong gravity", "A failed star", "A type of nebula"], answer: 1 },
  { q: "Approximately how old is the universe?", options: ["4.5 billion years", "13.8 billion years", "100 million years", "500 billion years"], answer: 1 },
  { q: "Which planet has the longest day?", options: ["Mercury", "Venus", "Mars", "Jupiter"], answer: 1 },
  { q: "What is the asteroid belt located between?", options: ["Earth and Mars", "Mars and Jupiter", "Jupiter and Saturn", "Venus and Earth"], answer: 1 },
  { q: "Which is the largest moon in the solar system?", options: ["Titan", "Europa", "Ganymede", "Io"], answer: 2 },
  { q: "What is the name of the first artificial satellite?", options: ["Voyager 1", "Sputnik 1", "Apollo 1", "Explorer 1"], answer: 1 },
  { q: "Which planet has a giant red storm called the Great Red Spot?", options: ["Mars", "Saturn", "Jupiter", "Neptune"], answer: 2 },
  { q: "What is the unit of distance equal to ~3.26 light-years?", options: ["Astronomical Unit", "Parsec", "Light-day", "Kiloyear"], answer: 1 },
  { q: "Which dwarf planet was reclassified in 2006?", options: ["Ceres", "Eris", "Pluto", "Haumea"], answer: 2 },
];
