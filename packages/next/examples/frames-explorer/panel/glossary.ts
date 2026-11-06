// The glossary (R16: no undefined jargon). Each term's definition is one or
// two plain sentences, for both audiences: a graphics engineer meeting
// geodesy, and a geodesist meeting this library. `Term` (Term.tsx) shows them
// in a popover wherever the word appears.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY = {
  itrf: {
    term: "ITRF",
    definition:
      "The International Terrestrial Reference Frame: Earth-centred axes that turn with the Earth. GPS positions and survey coordinates live here (WGS 84 today agrees with it to a few centimetres).",
  },
  gcrf: {
    term: "GCRF",
    definition:
      "The Geocentric Celestial Reference Frame: Earth-centred axes that don't turn with the Earth, aligned with distant quasars. Satellites and the Moon are computed here, then turned into ITRF.",
  },
  icrf: {
    term: "ICRF",
    definition:
      "The International Celestial Reference Frame: the solar system's barycentre, with axes fixed on distant quasars. The root of the frame tree.",
  },
  eme2000: {
    term: "EME2000",
    definition:
      "Earth Mean Equator and Equinox of J2000: the inertial frame most spacecraft files use. It differs from GCRF by the frame bias, about 23 milliarcseconds.",
  },
  moonMe: {
    term: "MOON_ME",
    definition:
      "The Moon's mean Earth / polar axis frame: axes fixed to the Moon, the x axis toward the Earth on average. Lunar maps and landing sites use it.",
  },
  moonPa: {
    term: "MOON_PA",
    definition:
      "The Moon's principal-axes frame: axes along the Moon's axes of inertia, from the DE440 libration model. It differs from MOON_ME by a fixed rotation of under a degree.",
  },
  eop: {
    term: "Earth orientation (EOP)",
    definition:
      "The measured wobble and spin of the Earth (polar motion and UT1) that turn GCRF into ITRF. IERS publishes measured values and predictions; predictions grow less accurate with age.",
  },
  convergence: {
    term: "Convergence",
    definition:
      "The angle between grid north (a projection's y axis) and true north at a point. It's zero on the central meridian and grows away from it.",
  },
  combinedFactor: {
    term: "Combined factor",
    definition:
      "Grid scale factor × elevation factor: what turns a distance on the ground into a distance on the projection's grid. Surveyors divide grid distances by it to get ground distances.",
  },
  epoch: {
    term: "Epoch",
    definition:
      "The date a coordinate is valid at. The plates move centimetres a year, so a position in ITRF needs its epoch, such as 2010.0.",
  },
  ballpark: {
    term: "Ballpark",
    definition:
      "A datum operation PROJ falls back to when it knows no better one: it ignores the datum difference, so it can be off by metres to hundreds of metres. Shown in amber, never as a pass of accuracy.",
  },
  boundCrs: {
    term: "Bound CRS",
    definition:
      "A coordinate reference system that carries its own transformation to WGS 84 (a TOWGS84 Helmert), as CAD and BIM exports often do. The library places it by those parameters, not PROJ's registry choice.",
  },
  helmert: {
    term: "Helmert transformation",
    definition:
      "Three shifts, three small rotations and a scale between two datums. Its sign convention (position vector or coordinate frame) matters: the wrong one moves points by metres.",
  },
  tolerance: {
    term: "Tolerance",
    definition:
      "How far a result may be from its expected value and still pass. Every tolerance is the plan's own, stated beside the case, never loosened for the page.",
  },
  accuracy: {
    term: "Accuracy (1σ)",
    definition:
      "What a computation can claim about where something really is: the root sum square of its error terms, one standard deviation. Different from the tolerance, which checks the arithmetic.",
  },
  byDefinition: {
    term: "Exact by definition",
    definition:
      "A convention, not a measurement: adopted constants (the IAU 2006 frame bias) or defined offsets (TT − TAI = 32.184 s). There is no error to state, so it adds nothing to an accuracy.",
  },
  notBounded: {
    term: "Not bounded",
    definition:
      "At least one error term has no stated size, so the total can't be given. The page names the term rather than showing a number.",
  },
  effect: {
    term: "Effect size",
    definition:
      "How big a real-world effect is (2 ppm between foot definitions, 56 µs a day on the Moon). Shown apart from pass or fail; a case passes when the library's size matches an independent hand formula.",
  },
  fingerprint: {
    term: "Fingerprint",
    definition:
      "A recorded operation's PROJ pipeline, its grid files' SHA-256 and the coordinates it gives. Browser and Node must give the same fingerprint: the same file lands the same everywhere.",
  },
  tdb: {
    term: "TDB",
    definition:
      "Barycentric Dynamical Time: the time scale of planetary ephemerides like DE440. It differs from TT by under 2 ms, periodically.",
  },
  tissot: {
    term: "Tissot ellipse",
    definition:
      "The shape a small circle on the ground takes on the map. Its size shows the scale; its stretch shows angular distortion. Conformal projections (UTM, Web Mercator) keep circles round.",
  },
  ppm: {
    term: "ppm",
    definition: "Parts per million: 1 ppm is 1 mm per km.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
