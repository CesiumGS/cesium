/**
 * Time controls over an engine view (plan §13.13): what 1.x's `Animation`
 * dial and `Timeline` do, reworked around what the time means at the place
 * being looked at. Plain DOM beside the credits and the inspector.
 *
 * - A pill: the date and time there, in its time zone, with play/pause.
 * - Its panel: the day as a strip, shaded by the sun's elevation (night,
 *   twilight, day) with sunrise, solar noon and sunset marked, dragged to
 *   scrub (and a slider for the keyboard); the day before and after, a date,
 *   "Now"; presets for the light (sunrise, golden hour, noon, sunset, night)
 *   and for shadow studies (the solstices and equinoxes); named speeds
 *   instead of a dial; and, when the sun is down, a way to open the camera
 *   up (automatic exposure) so the night shows as it would to a camera.
 *
 * The time zone: local solar time at the place (its longitude), UTC, or
 * this computer's. A place's legal time zone needs a boundary table (a
 * follow-up); solar time is what the light follows.
 */
import type { Clock } from "../src/time/Clock.ts";
import { sunElevation, sunTimes, type SunTimes } from "../src/time/sun.ts";

export interface TimeControlsOptions {
  /** The place the time is about (geodetic radians), if any yet. */
  place: () => { longitude: number; latitude: number } | undefined;
  /**
   * Offered while the sun is down: e.g. turn on automatic exposure. Shown
   * as a button labeled `nightActionLabel`.
   */
  onNight?: () => void;
  nightActionLabel?: string;
}

export interface TimeControlsHandle {
  readonly element: HTMLElement;
  /** Shows or hides the controls. */
  show(on: boolean): void;
  /** Redraws (the place moved). */
  update(): void;
  dispose(): void;
}

type Zone = "solar" | "utc" | "local";

const DAY = 86_400_000;
const MINUTE = 60_000;
const deg = Math.PI / 180;

/** Speeds, as scene seconds per second. */
const SPEEDS: Array<[string, number]> = [
  ["Real time", 1],
  ["1 min/s", 60],
  ["1 h/s", 3600],
  ["1 day/s", 86_400],
];

/** Days for shadow studies (month, day). */
const SEASONS: Array<[string, number, number]> = [
  ["March equinox", 2, 20],
  ["June solstice", 5, 21],
  ["September equinox", 8, 22],
  ["December solstice", 11, 21],
];

/** Attaches the time controls over `element` (positioned relative to it). */
export function attachTimeControls(
  element: HTMLElement,
  clock: Clock,
  options: TimeControlsOptions,
): TimeControlsHandle {
  injectStyle();
  const root = el("div", "cesium-time");
  for (const type of ["pointerdown", "pointerup", "wheel", "dblclick"]) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }
  let zone: Zone = "solar";

  // --- the pill ---
  const pill = el("div", "ct-pill");
  const play = button("ct-play", "Play");
  const label = button("ct-label", "Date and time");
  label.setAttribute("aria-expanded", "false");
  const when = el("span", "ct-when");
  const zoneTag = el("span", "ct-zone");
  label.append(when, zoneTag);
  pill.append(play, label);

  // --- the panel ---
  const panel = el("div", "ct-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Date and time");
  panel.hidden = true;

  const dateRow = el("div", "ct-row");
  const previous = button("ct-icon", "The day before", "‹");
  const date = document.createElement("input");
  date.type = "date";
  date.className = "ct-date";
  date.setAttribute("aria-label", "Date");
  const next = button("ct-icon", "The day after", "›");
  const now = button("ct-chip", "Now", "Now");
  dateRow.append(previous, date, next, spacer(), now);

  const strip = document.createElement("canvas");
  strip.className = "ct-strip";
  strip.tabIndex = 0;
  strip.setAttribute("role", "slider");
  strip.setAttribute("aria-label", "Time of day");
  strip.setAttribute("aria-valuemin", "0");
  strip.setAttribute("aria-valuemax", "1440");
  const marks = el("div", "ct-marks");

  const presets = el("div", "ct-row ct-wrap");
  const presetButtons: Array<
    [HTMLButtonElement, (t: SunTimes) => number | undefined]
  > = [
    [button("ct-chip", "Sunrise", "Sunrise"), (t) => t.sunrise],
    [
      button("ct-chip", "Golden hour", "Golden hour"),
      (t) => (t.sunset !== undefined ? t.sunset - 45 * MINUTE : undefined),
    ],
    [button("ct-chip", "Solar noon", "Noon"), (t) => t.noon],
    [button("ct-chip", "Sunset", "Sunset"), (t) => t.sunset],
    [
      button("ct-chip", "Night (solar midnight)", "Night"),
      (t) => t.noon + DAY / 2,
    ],
  ];
  presets.append(...presetButtons.map(([b]) => b));

  const speedRow = el("div", "ct-row");
  const season = document.createElement("select");
  season.className = "ct-select";
  season.setAttribute("aria-label", "Shadow-study dates");
  season.append(option("", "Study dates…"));
  for (const [name] of SEASONS) {
    season.append(option(name, name));
  }
  const speeds = el("div", "ct-segments");
  speeds.setAttribute("role", "group");
  speeds.setAttribute("aria-label", "Speed");
  const speedButtons = SPEEDS.map(([name, rate]) => {
    const b = button("ct-segment", `Play at ${name}`, name);
    b.addEventListener("click", () => {
      clock.rate = rate;
      clock.mode = "playing";
    });
    return [b, rate] as const;
  });
  speeds.append(...speedButtons.map(([b]) => b));
  speedRow.append(season, spacer(), speeds);

  const zoneRow = el("div", "ct-row");
  const zoneSelect = document.createElement("select");
  zoneSelect.className = "ct-select";
  zoneSelect.setAttribute("aria-label", "Time zone");
  const computerZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "This computer";
  zoneSelect.append(
    option("solar", "Local solar time (the place)"),
    option("utc", "UTC"),
    option("local", `This computer (${computerZone})`),
  );
  const zoneLabel = el("span", "ct-caption");
  zoneLabel.textContent = "Time zone";
  zoneRow.append(zoneLabel, zoneSelect);

  const night = el("div", "ct-night");
  night.hidden = true;
  const nightText = el("span", "");
  nightText.textContent = "The sun is down.";
  night.append(nightText);
  if (options.onNight) {
    const action = button(
      "ct-chip",
      options.nightActionLabel ?? "Adjust exposure",
      options.nightActionLabel ?? "Adjust exposure",
    );
    action.addEventListener("click", () => options.onNight?.());
    night.append(action);
  }

  panel.append(dateRow, strip, marks, presets, speedRow, zoneRow, night);
  root.append(panel, pill);
  element.append(root);

  // --- time in the chosen zone ---
  const place = () => options.place();
  /** Minutes the zone is ahead of UTC at `ms`. */
  const offset = (ms: number) => {
    if (zone === "utc") {
      return 0;
    }
    if (zone === "local") {
      return -new Date(ms).getTimezoneOffset();
    }
    const p = place();
    return p ? (p.longitude / deg) * 4 : 0;
  };
  /** Midnight starting the zone's day that contains `ms`. */
  const dayStart = (ms: number) => {
    const off = offset(ms) * MINUTE;
    return Math.floor((ms + off) / DAY) * DAY - off;
  };
  const inZone = (ms: number) => new Date(ms + offset(ms) * MINUTE);
  const formatWhen = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const formatClock = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
  const zoneName = () =>
    zone === "utc"
      ? "UTC"
      : zone === "solar"
        ? "solar time"
        : (new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
            .formatToParts(new Date(clock.time))
            .find((p) => p.type === "timeZoneName")?.value ?? "");

  /** Sets the time, keeping the time of day, on another day. */
  const moveToDay = (start: number) => {
    clock.time = start + (clock.time - dayStart(clock.time));
  };

  // --- interaction ---
  play.addEventListener("click", () => {
    clock.mode = clock.mode === "playing" ? "paused" : "playing";
  });
  label.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    label.setAttribute("aria-expanded", String(!panel.hidden));
    render();
  });
  previous.addEventListener("click", () =>
    moveToDay(dayStart(clock.time) - DAY),
  );
  next.addEventListener("click", () => moveToDay(dayStart(clock.time) + DAY));
  now.addEventListener("click", () => {
    clock.rate = 1;
    clock.mode = "live";
  });
  date.addEventListener("change", () => {
    if (!date.value) {
      return;
    }
    const [y, m, d] = date.value.split("-").map(Number);
    const utcMidnight = Date.UTC(y!, m! - 1, d!);
    moveToDay(utcMidnight - offset(utcMidnight) * MINUTE);
  });
  for (const [b, pick] of presetButtons) {
    b.addEventListener("click", () => {
      const p = place();
      if (!p) {
        return;
      }
      const t = pick(sunTimes(dayStart(clock.time), p.longitude, p.latitude));
      if (t !== undefined) {
        clock.mode = "paused";
        clock.time = t;
      }
    });
  }
  season.addEventListener("change", () => {
    const entry = SEASONS.find(([name]) => name === season.value);
    season.value = "";
    if (!entry) {
      return;
    }
    const year = inZone(clock.time).getUTCFullYear();
    const utcMidnight = Date.UTC(year, entry[1], entry[2]);
    moveToDay(utcMidnight - offset(utcMidnight) * MINUTE);
  });
  zoneSelect.addEventListener("change", () => {
    zone = zoneSelect.value as Zone;
    render();
  });

  // Scrubbing the strip.
  const timeAt = (clientX: number) => {
    const rect = strip.getBoundingClientRect();
    const f = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return dayStart(clock.time) + f * (DAY - MINUTE);
  };
  let dragging = false;
  strip.addEventListener("pointerdown", (e) => {
    dragging = true;
    strip.setPointerCapture(e.pointerId);
    clock.mode = "paused";
    clock.time = timeAt(e.clientX);
  });
  strip.addEventListener("pointermove", (e) => {
    if (dragging) {
      clock.time = timeAt(e.clientX);
    }
  });
  strip.addEventListener("pointerup", () => {
    dragging = false;
  });
  strip.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 60 * MINUTE : 15 * MINUTE;
    const start = dayStart(clock.time);
    const moves: Record<string, number> = {
      ArrowLeft: clock.time - step,
      ArrowRight: clock.time + step,
      PageUp: clock.time - DAY,
      PageDown: clock.time + DAY,
      Home: start,
      End: start + DAY - MINUTE,
    };
    const to = moves[e.key];
    if (to !== undefined) {
      e.preventDefault();
      clock.mode = "paused";
      clock.time = to;
    } else if (e.key === " ") {
      e.preventDefault();
      clock.mode = clock.mode === "playing" ? "paused" : "playing";
    }
  });

  // --- drawing ---
  let lastDrawn = "";
  function render(): void {
    const t = clock.time;
    const local = inZone(t);
    when.textContent = formatWhen.format(local);
    zoneTag.textContent = zoneName();
    const playing = clock.mode === "playing";
    play.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
    play.setAttribute("aria-label", playing ? "Pause" : "Play");
    play.setAttribute("aria-pressed", String(playing));
    now.setAttribute("aria-pressed", String(clock.mode === "live"));
    for (const [b, rate] of speedButtons) {
      b.setAttribute("aria-pressed", String(playing && clock.rate === rate));
    }
    const p = place();
    const elevation = p ? sunElevation(t, p.longitude, p.latitude) : 0;
    night.hidden = !p || elevation > -0.833 * deg;
    if (panel.hidden) {
      return;
    }
    date.value = local.toISOString().slice(0, 10);
    const start = dayStart(t);
    const minutes = Math.round((t - start) / MINUTE);
    strip.setAttribute("aria-valuenow", String(minutes));
    strip.setAttribute("aria-valuetext", formatClock.format(local));
    drawStrip(start, t, p);
  }

  function drawStrip(
    start: number,
    t: number,
    p: { longitude: number; latitude: number } | undefined,
  ): void {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(strip.clientWidth * ratio);
    const height = Math.round(strip.clientHeight * ratio);
    if (width === 0 || height === 0) {
      return;
    }
    if (strip.width !== width || strip.height !== height) {
      strip.width = width;
      strip.height = height;
      lastDrawn = "";
    }
    const g = strip.getContext("2d")!;
    // The day's shading only changes with the day, the place or the zone.
    const key = `${start}|${zone}|${p ? `${p.longitude.toFixed(3)},${p.latitude.toFixed(3)}` : ""}|${width}`;
    if (key !== lastDrawn) {
      lastDrawn = key;
      for (let x = 0; x < width; x++) {
        const at = start + ((x + 0.5) / width) * DAY;
        const e = p ? sunElevation(at, p.longitude, p.latitude) / deg : 10;
        g.fillStyle = skyColor(e);
        g.fillRect(x, 0, 1, height);
      }
      // Hour ticks.
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let h = 1; h < 24; h++) {
        const x = Math.round((h / 24) * width);
        g.fillRect(x, height - (h % 6 === 0 ? 7 : 4) * ratio, ratio, height);
      }
      cachedStrip = g.getImageData(0, 0, width, height);
      const times = p ? sunTimes(start, p.longitude, p.latitude) : undefined;
      const format = (ms: number | undefined) =>
        ms === undefined ? "—" : formatClock.format(inZone(ms));
      marks.textContent = times
        ? `Sunrise ${format(times.sunrise)} · Noon ${format(times.noon)} · Sunset ${format(times.sunset)}`
        : "";
      sunMarks = times;
    } else if (cachedStrip) {
      g.putImageData(cachedStrip, 0, 0);
    }
    const xOf = (ms: number) => ((ms - start) / DAY) * width;
    // Sunrise and sunset.
    g.fillStyle = "rgba(255, 214, 140, 0.9)";
    for (const ms of [sunMarks?.sunrise, sunMarks?.sunset]) {
      if (ms !== undefined) {
        g.fillRect(Math.round(xOf(ms)), 0, ratio, height);
      }
    }
    // Now, if it's this day.
    const wall = Date.now();
    if (wall >= start && wall < start + DAY) {
      g.fillStyle = "rgba(138, 184, 255, 0.95)";
      g.fillRect(Math.round(xOf(wall)) - ratio, 0, 2 * ratio, 4 * ratio);
    }
    // The time.
    const x = xOf(t);
    g.fillStyle = "#fff";
    g.fillRect(Math.round(x) - ratio, 0, 2 * ratio, height);
    g.beginPath();
    g.arc(x, height / 2, 4 * ratio, 0, 2 * Math.PI);
    g.fill();
  }
  let cachedStrip: ImageData | undefined;
  let sunMarks: SunTimes | undefined;

  const unsubscribe = clock.events.on("change", () => render());
  render();

  return {
    element: root,
    show(on: boolean) {
      root.hidden = !on;
      if (on) {
        render();
      }
    },
    update() {
      lastDrawn = "";
      render();
    },
    dispose() {
      unsubscribe();
      root.remove();
    },
  };
}

/** The sky's color by the sun's elevation (degrees), for the day strip. */
function skyColor(elevation: number): string {
  // Night, astronomical and nautical twilight, civil twilight, golden hour,
  // day: piecewise between these colors.
  const stops: Array<[number, [number, number, number]]> = [
    [-18, [11, 16, 38]],
    [-12, [22, 34, 72]],
    [-6, [62, 70, 120]],
    [-1, [196, 120, 96]],
    [3, [244, 170, 90]],
    [10, [150, 196, 238]],
    [30, [110, 170, 235]],
  ];
  if (elevation <= stops[0]![0]) {
    return rgb(stops[0]![1]);
  }
  for (let i = 1; i < stops.length; i++) {
    const [e1, c1] = stops[i]!;
    const [e0, c0] = stops[i - 1]!;
    if (elevation <= e1) {
      const f = (elevation - e0) / (e1 - e0);
      return rgb([0, 1, 2].map((k) => c0[k]! + (c1[k]! - c0[k]!) * f) as never);
    }
  }
  return rgb(stops[stops.length - 1]![1]);
}

function rgb(c: [number, number, number]): string {
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

function el(tag: string, className: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) {
    e.className = className;
  }
  return e;
}

function button(
  className: string,
  label: string,
  text?: string,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.setAttribute("aria-label", label);
  if (text !== undefined) {
    b.textContent = text;
  }
  return b;
}

function option(value: string, text: string): HTMLOptionElement {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = text;
  return o;
}

function spacer(): HTMLElement {
  return el("span", "ct-spacer");
}

const PLAY_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
const PAUSE_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';

const STYLE_ID = "cesium-time-style";

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

const CSS = `
.cesium-time {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 6px;
  font: 12px/1.4 system-ui, sans-serif; color: #e6e9ef; max-width: calc(100% - 16px);
}
.cesium-time[hidden] { display: none; }
.cesium-time button, .cesium-time select, .cesium-time input { font: inherit; color: inherit; }
.cesium-time .ct-pill {
  display: inline-flex; align-items: center; gap: 2px; padding: 2px;
  border-radius: 999px; background: rgba(11, 14, 20, 0.62); backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.cesium-time .ct-play {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px;
  border: none; background: rgba(255, 255, 255, 0.1); cursor: pointer;
}
.cesium-time .ct-play:hover { background: rgba(255, 255, 255, 0.2); }
.cesium-time .ct-label {
  border: none; background: none; cursor: pointer; padding: 4px 10px 4px 6px;
  border-radius: 999px; white-space: nowrap; display: inline-flex; gap: 6px; align-items: baseline;
}
.cesium-time .ct-label:hover { background: rgba(255, 255, 255, 0.08); }
.cesium-time .ct-zone { color: #9aa3b5; font-size: 11px; }
.cesium-time .ct-panel {
  width: min(420px, calc(100vw - 32px)); max-width: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;
  border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 14, 20, 0.94); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
.cesium-time .ct-panel[hidden] { display: none; }
.cesium-time .ct-row { display: flex; align-items: center; gap: 6px; }
.cesium-time .ct-wrap { flex-wrap: wrap; }
.cesium-time .ct-spacer { flex: 1; }
.cesium-time .ct-icon, .cesium-time .ct-chip, .cesium-time .ct-segment {
  border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.06);
  border-radius: 6px; padding: 3px 8px; cursor: pointer; white-space: nowrap;
}
.cesium-time .ct-icon { padding: 3px 9px; font-size: 14px; line-height: 1; }
.cesium-time .ct-icon:hover, .cesium-time .ct-chip:hover, .cesium-time .ct-segment:hover {
  background: rgba(255, 255, 255, 0.14);
}
.cesium-time [aria-pressed="true"] { background: #2f5fb3; border-color: #4d7fd6; }
.cesium-time .ct-segments { display: inline-flex; }
.cesium-time .ct-segment { border-radius: 0; margin-left: -1px; font-size: 11px; }
.cesium-time .ct-segment:first-child { border-radius: 6px 0 0 6px; margin-left: 0; }
.cesium-time .ct-segment:last-child { border-radius: 0 6px 6px 0; }
.cesium-time .ct-date, .cesium-time .ct-select {
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px; padding: 2px 6px; color-scheme: dark;
}
.cesium-time .ct-select option { background: #151922; }
.cesium-time .ct-strip {
  width: 100%; height: 28px; border-radius: 6px; cursor: ew-resize; touch-action: none; display: block;
}
.cesium-time .ct-marks, .cesium-time .ct-caption { color: #9aa3b5; font-size: 11px; }
.cesium-time .ct-night {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 8px; border-radius: 6px; background: rgba(47, 95, 179, 0.18); color: #c9d6f2;
}
.cesium-time .ct-night[hidden] { display: none; }
.cesium-time :focus-visible { outline: 2px solid #8ab8ff; outline-offset: 2px; }
`;
