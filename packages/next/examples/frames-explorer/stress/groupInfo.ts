// The question cards' plain data (R14, ruling F28): every group's name,
// question, lenses and focus, and the defaults the catalog fills results
// with (F27's accuracy note; what a group's expected values are). It imports
// nothing, so the page's main thread reads it without the runner, PROJ or the
// cases (the worker runs those, R13). `stressGroups.ts` adds the headlines.

/** The audiences the Verify tab filters by (R14). */
export type Lens =
  "civil" | "bim" | "gis" | "space" | "timing" | "offshore" | "av";

export const LENSES: readonly Lens[] = [
  "civil",
  "bim",
  "gis",
  "space",
  "timing",
  "offshore",
  "av",
];

/** One step of a result's computation trace (R16): input, each step, output. */
export interface TraceStep {
  kind: "input" | "step" | "output" | "expected";
  /** What the step is: "Design point", "PROJ operation", "ITRF → GCRF". */
  label: string;
  /** The value as computed, full precision, as copied. */
  value: string;
  /** The value is code (a pipeline, a WKT), shown in the mono face. */
  code?: boolean;
  note?: string;
}

/** Where a value a result is compared with, or its input, comes from (R10). */
export interface Citation {
  /** The references.json entry. */
  reference: string;
  document: string;
  publisher?: string;
  /** Table, page, PID, record or section. */
  locator?: string;
  url?: string;
  retrieved: string;
  /** The entry is an input to the case (ruling F6), not a value it is compared with. */
  input?: boolean;
}

/** What a result's expected value is (R10, R16): the inspector's "Compared against". */
export type Comparison =
  | { kind: "published"; text: string }
  | { kind: "formula"; text: string }
  | { kind: "roundTrip"; text: string }
  | { kind: "error"; text: string }
  | { kind: "independent"; text: string };

/** A question card's group, as plain data. */
export interface GroupInfo {
  readonly id: string;
  /** The group's short name, as the plan and the lens table call it. */
  readonly name: string;
  /** The card's title: the question the group answers, in plain language. */
  readonly question: string;
  readonly lenses: readonly Lens[];
  /** What "Show on globe" turns to. */
  readonly focus?: {
    readonly frames: readonly string[];
    readonly overlay?: string;
    readonly site?: string;
  };
  /** A virtual group (Reproducibility): its results are other groups'. */
  readonly virtual?: boolean;
  /**
   * The data its cases need beyond the frame tree, PROJ first (the union of
   * its cases' needs; a test checks it), so the page can say what a card
   * waits for (R9).
   */
  readonly needs: readonly ("proj" | "geoid" | "orion")[];
  /**
   * F27: the accuracy that applies to a result of this group that states no
   * position accuracy, unless the case gives its own.
   */
  readonly accuracyNote: string;
  /** What the group's results are compared with (the inspector's "Compared against"). */
  readonly compared: Comparison;
}

const EARTH_FRAMES = ["ICRF", "GCRF", "ITRF"];

const ALL_FRAMES = [
  "ICRF",
  "HCRS",
  "GCRF",
  "EARTH_ICRF",
  "EME2000",
  "ITRF",
  "MOON_ICRF",
  "MOON_ME",
  "MOON_PA",
];

const ROUND_TRIP =
  "The input itself, after forward and inverse: this proves the library agrees with itself, not that it's right (Reference values does that).";

/**
 * Every question card, in the order the Verify tab lists them; every group
 * but the virtual Reproducibility has cases.
 */
export const GROUP_INFO: readonly GroupInfo[] = [
  {
    id: "projections",
    needs: ["proj", "geoid"],
    name: "Projections",
    question: "Do design coordinates survive the trip to the globe and back?",
    lenses: ["gis", "offshore"],
    focus: { frames: ["ITRF"], overlay: "designGrid" },
    accuracyNote: "exact arithmetic: a round trip",
    compared: { kind: "roundTrip", text: ROUND_TRIP },
  },
  {
    id: "units",
    needs: ["proj"],
    name: "Units",
    question: "Does the library tell US survey feet from international feet?",
    lenses: ["civil", "bim"],
    focus: { frames: ["ITRF"], site: "california" },
    accuracyNote: "exact arithmetic: unit definitions",
    compared: {
      kind: "formula",
      text: "The foot definitions' ratio, (1200/3937)/0.3048, by hand.",
    },
  },
  {
    id: "site-grids",
    needs: ["proj", "geoid"],
    name: "Site grids",
    question: "Do rotated and scaled site grids land where they should?",
    lenses: ["civil", "bim"],
    focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" },
    accuracyNote: "exact arithmetic: the site formula",
    compared: {
      kind: "formula",
      text: "The site formula (rotate by θ, scale by s) by hand, then a round trip.",
    },
  },
  {
    id: "recorded-operations",
    needs: ["proj", "geoid"],
    name: "Recorded operations",
    question: "Is the datum operation fixed, with its grids accounted for?",
    lenses: ["bim", "offshore"],
    focus: { frames: ["ITRF"], site: "california" },
    accuracyNote: "the recorded operation itself (pipeline and grids)",
    compared: {
      kind: "independent",
      text: "The pipeline PROJ records, against the grid the CRS names.",
    },
  },
  {
    id: "frame-tree",
    needs: [],
    name: "Frame tree",
    question:
      "Do the frames agree with each other however you go between them?",
    lenses: ["space"],
    focus: { frames: ALL_FRAMES },
    accuracyNote: "exact arithmetic: compositions",
    compared: {
      kind: "roundTrip",
      text: "The same transform by every route through the tree: self-consistency.",
    },
  },
  {
    id: "time",
    needs: [],
    name: "Time",
    question:
      "Is time continuous through leap seconds, and honest at the tables' ends?",
    lenses: ["space", "timing"],
    focus: { frames: EARTH_FRAMES },
    accuracyNote: "exact arithmetic: time scales",
    compared: {
      kind: "formula",
      text: "UTC's leap-second rule by hand (IERS Bulletin C 52).",
    },
  },
  {
    id: "trajectory",
    needs: ["orion"],
    name: "Trajectory",
    question: "Is Orion's path used only where there is data?",
    lenses: ["space"],
    focus: { frames: ["EME2000", "MOON_ME"], overlay: "trajectoryPath" },
    accuracyNote: "the OEM's own coverage and covariance",
    compared: {
      kind: "error",
      text: "The OEM's covered spans, and a round trip through MOON_ME.",
    },
  },
  {
    id: "measurement",
    needs: ["proj", "geoid"],
    name: "Measurement",
    question: "Do design measurements agree with distances on the ground?",
    lenses: ["civil"],
    focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" },
    accuracyNote: "exact arithmetic: the design geometry",
    compared: {
      kind: "formula",
      text: "Design distance × site scale × metres per foot ÷ the combined factor, by hand.",
    },
  },
  // 1b: the new groups.
  {
    id: "reference-values",
    needs: ["proj", "geoid"],
    name: "Reference values",
    question: "Do results match published survey and geodesy values?",
    lenses: ["civil"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "published value ± half its last digit",
    compared: {
      kind: "published",
      text: "NGS datasheets and IOGP 373-7-2 worked examples, copied verbatim.",
    },
  },
  {
    id: "vertical-profile",
    needs: [],
    name: "Vertical profile",
    question: "Are vertical curves computed as the design manuals do?",
    lenses: ["civil"],
    accuracyNote: "exact arithmetic: the design manual's formulas",
    compared: {
      kind: "published",
      text: "The design manual's worked vertical curve.",
    },
  },
  {
    id: "distortion",
    needs: ["proj"],
    name: "Distortion",
    question: "How much does a projection stretch distances?",
    lenses: ["civil", "gis"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "hand formula, exact to 10⁻⁹",
    compared: {
      kind: "formula",
      text: "√(1 − e² sin² φ) / cos φ and the handbook's target band, by hand.",
    },
  },
  {
    id: "rigid-placement-budget",
    needs: ["proj"],
    name: "Rigid placement budget",
    question: "How big can a site be before rigid placement is off?",
    lenses: ["civil", "bim"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "hand formula √(2Rε), within 10%",
    compared: {
      kind: "formula",
      text: "√(2Rε): the extent where a flat site leaves the ellipsoid by ε.",
    },
  },
  {
    id: "coordinate-epoch",
    needs: ["proj"],
    name: "Coordinate epoch",
    question: "How far do coordinates move between epochs?",
    lenses: ["gis", "av"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "published example ± its rounding",
    compared: {
      kind: "published",
      text: "IOGP 373-7-2's Helmert examples and EPSG 8970's parameters.",
    },
  },
  {
    id: "axes-and-the-antimeridian",
    needs: ["proj"],
    name: "Axes and the antimeridian",
    question: "Are axis order and the 180° meridian handled?",
    lenses: ["gis"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "published value ± half its last digit",
    compared: {
      kind: "published",
      text: "GU2195's published UTM coordinates, and a round trip at ±180°.",
    },
  },
  {
    id: "space",
    needs: ["orion"],
    name: "Space",
    question: "Do light time, Doppler and line of sight match the references?",
    lenses: ["space"],
    focus: { frames: ["ITRF", "EME2000", "MOON_ME"] },
    accuracyNote: "SPICE fixture, plan 3's tolerances",
    compared: {
      kind: "independent",
      text: "Plan 3's SPICE fixture (spkpos, CN) and hand geometry.",
    },
  },
  // 1c: the industry groups.
  {
    id: "operation-candidates",
    needs: ["proj"],
    name: "Operation candidates",
    question:
      "Which datum operation was chosen, and what were the alternatives?",
    lenses: ["gis", "offshore"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "the EPSG registry's stated accuracies",
    compared: {
      kind: "published",
      text: "The EPSG registry's transformations 1311, 1133 and 1134.",
    },
  },
  {
    id: "ifc-map-conversion",
    needs: ["proj"],
    name: "IFC map conversion",
    question: "Does an IFC map conversion place the model correctly?",
    lenses: ["bim"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "published IfcSite ± half its last digit",
    compared: {
      kind: "published",
      text: "IFC 4.3 Annex E's example: IfcSite latitude, longitude and height.",
    },
  },
  {
    id: "plate-motion",
    needs: ["proj"],
    name: "Plate motion",
    question: "How fast does a map go stale as the plates move?",
    lenses: ["av"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "published manual values ± their rounding",
    compared: {
      kind: "published",
      text: "The GDA2020 technical manual's ALIC example (Table 3.2, Eq. 18).",
    },
  },
  {
    id: "below-the-ellipsoid",
    needs: ["proj"],
    name: "Below the ellipsoid",
    question: "Do scale factors and sight lines work below the ellipsoid?",
    lenses: ["civil"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "hand formula R/(R + h), exact to 10⁻¹²",
    compared: {
      kind: "formula",
      text: "R/(R + h) with R = √(MN), by hand.",
    },
  },
  {
    id: "heights-and-wgs84",
    needs: ["proj", "geoid"],
    name: "Heights and WGS84",
    question: "Which height, and which WGS84, is this?",
    lenses: ["civil", "gis", "av"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "datasheet values ± half their last digit",
    compared: {
      kind: "published",
      text: "GU2195's datasheet heights and the EPSG WGS 84 ensemble's 2 m.",
    },
  },
  {
    id: "bound-crss",
    needs: ["proj"],
    name: "Bound CRSs",
    question: "Are exported CRSs with TOWGS84 placed by their own parameters?",
    lenses: ["bim", "gis", "offshore"],
    focus: { frames: ["ITRF"] },
    accuracyNote: "the WKT's own parameters, by a hand Helmert",
    compared: {
      kind: "formula",
      text: "The WKT's TOWGS84 Helmert coded by hand (EPSG 9606).",
    },
  },
  {
    id: "time-scales",
    needs: [],
    name: "Time scales",
    question: "Are the GPS, TAI, TT and UTC offsets exact?",
    lenses: ["timing"],
    accuracyNote: "exact by definition: IERS and IS-GPS-200",
    compared: {
      kind: "published",
      text: "IERS Bulletin C 52 and IS-GPS-200N's GPS time.",
    },
  },
  {
    id: "lunar-time",
    needs: [],
    name: "Lunar time",
    question: "How much faster does a clock on the Moon tick?",
    lenses: ["space", "timing"],
    focus: { frames: ["Lunar south-pole site"] },
    accuracyNote: "Ashby & Patla (2024), within 2%",
    compared: {
      kind: "published",
      text: "Ashby & Patla (2024): 56.02 µs/day.",
    },
  },
  // Virtual: every fingerprinted result, whatever its own group.
  {
    id: "reproducibility",
    needs: ["proj"],
    name: "Reproducibility",
    question: "Does the same file land the same in browser and Node?",
    lenses: ["bim", "offshore"],
    virtual: true,
    accuracyNote:
      "pipeline and grids exact; coordinates within 16 ULP of the point (about 15 nm at the Earth's radius)",
    compared: {
      kind: "independent",
      text: "The fingerprint the Node data test recorded (fingerprints.json).",
    },
  },
];

/** A group's info by id. */
export const groupInfo = (id: string): GroupInfo | undefined =>
  GROUP_INFO.find((g) => g.id === id);
