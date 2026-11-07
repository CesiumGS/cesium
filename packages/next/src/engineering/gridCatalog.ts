// The PROJ-data grid catalog (`files.geojson`, with `copyright_and_licenses.csv`
// for licenses): what each grid is called, where it is, how big it is and what
// it must hash to. The one source of truth for which grid names exist.
import type { AreaOfInterest } from "./crs.ts";
import { PROJ_DATA_CATALOG } from "./projPins.ts";

/** One file of the catalog. */
export interface GridEntry {
  readonly name: string;
  readonly url: string;
  /** Lower-case hex SHA-256 of the file. */
  readonly sha256: string;
  readonly bytes: number;
  /** The catalog's `type`, such as `VERTICAL_OFFSET_GEOGRAPHIC_TO_VERTICAL`. */
  readonly type?: string;
  readonly sourceCrs?: string;
  readonly targetCrs?: string;
  /** The catalog's `full_bbox`, in degrees. */
  readonly area?: AreaOfInterest;
  /** The catalog's `source`: the agency that publishes the grid. */
  readonly agency: string;
  readonly country?: string;
  /** From `copyright_and_licenses.csv`. */
  readonly license?: string;
  readonly description?: string;
  /** The catalog marks the file as removed (`version_removed`). */
  readonly removed: boolean;
}

/** Rows of a CSV with quoted fields (commas, doubled quotes, newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function licensesByFile(csv: string): Map<string, string> {
  const [header, ...rows] = parseCsv(csv);
  const file = header?.indexOf("filename") ?? -1;
  const license = header?.indexOf("license") ?? -1;
  if (file < 0 || license < 0) {
    throw new Error(
      "copyright_and_licenses.csv: no filename and license columns",
    );
  }
  const out = new Map<string, string>();
  for (const row of rows) {
    const value = row[license]?.trim();
    if (row[file] && value) {
      out.set(row[file], value);
    }
  }
  return out;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

function bboxArea(value: unknown): AreaOfInterest | undefined {
  if (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === "number" && Number.isFinite(v))
  ) {
    const [west, south, east, north] = value as [
      number,
      number,
      number,
      number,
    ];
    return { west, south, east, north };
  }
  return undefined;
}

/** The parsed catalog: entries by exact file name. */
export class GridCatalog {
  readonly entries: ReadonlyMap<string, GridEntry>;
  readonly version: string;

  private constructor(
    entries: ReadonlyMap<string, GridEntry>,
    version: string,
  ) {
    this.entries = entries;
    this.version = version;
  }

  /**
   * Parses `files.geojson` (and, for licenses, `copyright_and_licenses.csv`).
   * A feature without a name, URL, 64-hex `sha256sum` or whole-number
   * `file_size` throws, naming it. The catalog carries no version of its own,
   * so `version` is the tag it was fetched from.
   */
  static parse(
    geojson: string,
    licensesCsv?: string,
    version: string = PROJ_DATA_CATALOG.version,
  ): GridCatalog {
    const parsed = JSON.parse(geojson) as {
      features?: { properties?: Record<string, unknown> }[];
    };
    if (!Array.isArray(parsed.features)) {
      throw new Error("grid catalog: no features array");
    }
    const licenses = licensesCsv ? licensesByFile(licensesCsv) : undefined;
    const entries = new Map<string, GridEntry>();
    parsed.features.forEach((feature, index) => {
      const p = feature.properties ?? {};
      const name = optionalString(p.name);
      if (name === undefined) {
        throw new Error(`grid catalog: feature ${index} has no name`);
      }
      const url = optionalString(p.url);
      const sha256 = p.sha256sum;
      const bytes = p.file_size;
      if (url === undefined) {
        throw new Error(`grid catalog: ${name} has no url`);
      }
      if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) {
        throw new Error(`grid catalog: ${name} has no valid sha256sum`);
      }
      if (
        typeof bytes !== "number" ||
        !Number.isSafeInteger(bytes) ||
        bytes < 0
      ) {
        throw new Error(`grid catalog: ${name} has no valid file_size`);
      }
      entries.set(name, {
        name,
        url,
        sha256,
        bytes,
        type: optionalString(p.type),
        sourceCrs: optionalString(p.source_crs_code),
        targetCrs: optionalString(p.target_crs_code),
        area: bboxArea(p.full_bbox),
        agency: optionalString(p.source) ?? "unknown",
        country: optionalString(p.source_country),
        license: licenses?.get(name),
        description: optionalString(p.description),
        removed: p.version_removed !== undefined && p.version_removed !== "",
      });
    });
    return new GridCatalog(entries, version);
  }

  get(name: string): GridEntry | undefined {
    return this.entries.get(name);
  }

  /** `"<agency> (<license>), via PROJ-data <version>"`; the license is left out when unknown. */
  credit(name: string): string {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new Error(`grid catalog: no grid named ${name}`);
    }
    const license = entry.license ? ` (${entry.license})` : "";
    return `${entry.agency}${license}, via PROJ-data ${this.version}`;
  }
}
