// A time formatter (frames 5b, Task 11): an `Instant` as the parts a UI shows,
// in UTC (a leap second included), a civil zone, solar or nominal time, or the
// computer's zone. It imports only the time library's own files.
import { Instant } from "./Instant.ts";
import { LeapSeconds } from "./leapSeconds.ts";

/**
 * A time zone. `longitude` is in radians, east positive. `solar` is mean solar
 * time at the longitude; `nominal` is that in whole hours from UTC.
 */
export type TimeZone =
  | { readonly kind: "utc" }
  | { readonly kind: "civil"; readonly iana: string }
  | {
      readonly kind: "solar";
      readonly longitude: number;
      /** Set by `placeZone`: the place's civil zone was asked for and isn't known. */
      readonly civilUnknown?: true;
    }
  | { readonly kind: "nominal"; readonly longitude: number }
  | { readonly kind: "local" };

/** The wall clock in a zone. */
export interface TimeParts {
  readonly year: number;
  /** 1 to 12. */
  readonly month: number;
  readonly day: number;
  /** 0 for Sunday. */
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
  /** 0 to 60 (60 inside a leap second). */
  readonly second: number;
  readonly millisecond: number;
  /** Inside the second UTC inserted at the end of its day. */
  readonly leapSecond: boolean;
  /** Minutes ahead of UTC; fractional for solar time. */
  readonly offsetMinutes: number;
  /** "UTC", "UTC+01:00", "UTC−07:00". */
  readonly offset: string;
  readonly zoneShort: string;
  readonly zoneLong: string;
  /** The date as `Intl.DateTimeFormat(locale)` writes it. */
  readonly date: string;
  /** The time of day, with the second shown as 60 inside a leap second. */
  readonly time: string;
}

/** A way to find a place's civil zone: an application's own (a time-zone database, a service). */
export interface ZoneLookup {
  /** The IANA name of the civil zone at a place (radians), or undefined when not known. */
  zoneAt(place: {
    readonly longitude: number;
    readonly latitude: number;
  }): string | undefined;
}

const MINUTE = 60_000;
const DAY = 86_400_000;
const DEG = Math.PI / 180;
/** J2000 (2000-01-01T12:00:00) as UTC milliseconds since 1970. */
const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const ianaFormats = new Map<string, Intl.DateTimeFormat>();

/**
 * Minutes the IANA zone `iana` is ahead of UTC at `ms` (daylight saving
 * included), from the browser's Intl: its wall clock read back as UTC.
 * An unknown zone throws (Intl's RangeError).
 */
export function ianaOffsetMinutes(ms: number, iana: string): number {
  let format = ianaFormats.get(iana);
  if (format === undefined) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    ianaFormats.set(iana, format);
  }
  const part: Record<string, number> = {};
  for (const p of format.formatToParts(new Date(ms))) {
    if (p.type !== "literal") {
      part[p.type] = Number(p.value);
    }
  }
  const wall = Date.UTC(
    part.year!,
    part.month! - 1,
    part.day!,
    part.hour!,
    part.minute!,
    part.second!,
  );
  const whole = Math.floor(ms / 1000) * 1000;
  return Math.round((wall - whole) / 60_000);
}

/**
 * Locales whose short zone names are the abbreviations people there use
 * ("BST", "AEST", "JST"), tried in turn when the reader's own locale
 * names the zone only by its offset ("GMT+1").
 */
const ABBREVIATION_LOCALES = [
  "en-GB",
  "en-AU",
  "en-US",
  "en-IN",
  "en-NZ",
  "ja-JP",
  "id-ID",
] as const;

/**
 * The IANA zone's abbreviation at `ms` ("BST", "PDT", "AEDT"), by Intl:
 * the reader's locale's short name, else the first of a few English
 * locales' (and the zone's own country's) that isn't just an offset, else
 * the offset itself ("UTC+3").
 */
export function ianaAbbreviation(
  ms: number,
  iana: string,
  locale?: string,
): string {
  const shortName = (loc: string | undefined) =>
    new Intl.DateTimeFormat(loc, { timeZone: iana, timeZoneName: "short" })
      .formatToParts(new Date(ms))
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  const offsetOnly = (name: string) => /^(GMT|UTC)[+−-]/.test(name);
  for (const loc of [locale, ...ABBREVIATION_LOCALES]) {
    const name = shortName(loc);
    if (name !== "" && !offsetOnly(name) && !/^[+−-]/.test(name)) {
      return name;
    }
  }
  const minutes = ianaOffsetMinutes(ms, iana);
  if (minutes === 0) {
    return "UTC";
  }
  const sign = minutes > 0 ? "+" : "−";
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `UTC${sign}${h}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}`;
}

/** "UTC", "UTC+01:00", "UTC−07:00" for an offset in minutes (rounded to the minute). */
function offsetLabel(minutes: number): string {
  const whole = Math.round(minutes);
  if (whole === 0) {
    return "UTC";
  }
  const abs = Math.abs(whole);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${whole > 0 ? "+" : "−"}${h}:${m}`;
}

/** "UTC", "UTC+3", "UTC−7": whole hours, as the time controls' nominal zone is named. */
function nominalLabel(minutes: number): string {
  const hours = Math.round(minutes / 60);
  return hours === 0 ? "UTC" : `UTC${hours > 0 ? "+" : "−"}${Math.abs(hours)}`;
}

/** Whether Intl knows the IANA zone name. */
function knownZone(iana: string): boolean {
  try {
    return (
      typeof new Intl.DateTimeFormat(undefined, { timeZone: iana }).format ===
      "function"
    );
  } catch {
    return false;
  }
}

/**
 * The zone of a place: civil when the application's `lookup` answers with a
 * name Intl knows; otherwise its solar time, labelled so (`zoneLong` says
 * the civil zone isn't known). Without a lookup it is solar time.
 */
export function placeZone(
  place: { readonly longitude: number; readonly latitude: number },
  lookup?: ZoneLookup,
): TimeZone {
  const name = lookup?.zoneAt(place);
  if (name !== undefined && knownZone(name)) {
    return { kind: "civil", iana: name };
  }
  return { kind: "solar", longitude: place.longitude, civilUnknown: true };
}

/**
 * An instant as the parts a UI shows, in `zone`. The wall clock is exact
 * about leap seconds: the TAI second in which TAI − UTC steps is the zone's
 * minute that UTC's 23:59 maps to, second 60 (zones with whole-minute offsets;
 * solar time runs on). The default leap-second table is the built-in one.
 */
export function timeParts(
  instant: Instant,
  zone: TimeZone,
  options: {
    readonly leapSeconds?: LeapSeconds;
    readonly locale?: string;
  } = {},
): TimeParts {
  const leap = options.leapSeconds ?? LeapSeconds.builtIn();
  const locale = options.locale;
  // UTC milliseconds; inside an inserted second it is that second's
  // milliseconds past the next day's midnight (`taiMinusUtcAtTai`'s step).
  const taiMs = Math.round(J2000_UNIX_MS + instant.tai() * 1000);
  const dat = leap.taiMinusUtcAtTai(taiMs);
  const naive = taiMs - 1000 * dat;
  const inserted = leap.taiMinusUtc(naive) !== dat;
  const wholeMinuteZone = zone.kind !== "solar";
  const leapSecond = inserted && wholeMinuteZone;
  // In a leap second the wall clock is the last millisecond before the step
  // (23:59:59.999 UTC) with the second shown as 60.
  const dayStart = Math.floor(naive / DAY) * DAY;
  const utcMs = leapSecond ? dayStart - 1 : naive;
  const millisecond = naive - dayStart;

  let offsetMinutes: number;
  let zoneShort: string;
  let zoneLong: string;
  switch (zone.kind) {
    case "utc":
      offsetMinutes = 0;
      zoneShort = "UTC";
      zoneLong = "Coordinated Universal Time";
      break;
    case "civil":
      offsetMinutes = ianaOffsetMinutes(utcMs, zone.iana);
      zoneShort = ianaAbbreviation(utcMs, zone.iana, locale);
      zoneLong = zone.iana;
      break;
    case "solar":
      offsetMinutes = (zone.longitude / DEG) * 4;
      zoneShort = "solar time";
      zoneLong =
        zone.civilUnknown === true
          ? "Local solar time: this place's civil time zone isn't known; noon is when the sun is highest here"
          : "Local solar time: noon is when the sun is highest here";
      break;
    case "nominal":
      offsetMinutes = Math.round(((zone.longitude / DEG) * 4) / 60) * 60;
      zoneShort = nominalLabel(offsetMinutes);
      zoneLong =
        "The place's time zone from its longitude (whole hours from UTC), " +
        "without daylight saving or political borders";
      break;
    case "local":
      offsetMinutes = -new Date(utcMs).getTimezoneOffset();
      zoneShort =
        new Intl.DateTimeFormat(locale, { timeZoneName: "short" })
          .formatToParts(new Date(utcMs))
          .find((p) => p.type === "timeZoneName")?.value ?? "";
      zoneLong = "This computer's time zone";
      break;
  }
  const wallMs = Math.floor(utcMs + offsetMinutes * MINUTE);
  const wall = new Date(wallMs);
  const second = leapSecond ? 60 : wall.getUTCSeconds();
  const ms = leapSecond ? millisecond : wall.getUTCMilliseconds();
  const dateFormat = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const timeFormat = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const time = timeFormat
    .formatToParts(wall)
    .map((p) => (leapSecond && p.type === "second" ? "60" : p.value))
    .join("");
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    weekday: wall.getUTCDay(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    second,
    millisecond: ms,
    leapSecond,
    offsetMinutes,
    offset: offsetLabel(offsetMinutes),
    zoneShort,
    zoneLong,
    date: dateFormat.format(wall),
    time,
  };
}
