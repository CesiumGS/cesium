/**
 * Time controls over an engine view (plan §13.13): what 1.x's `Animation`
 * dial and `Timeline` do, reworked around what the time means at the place
 * being looked at. Plain DOM beside the credits and the inspector.
 *
 * Laid out like a video player's controls, so each part says what it does:
 *
 *   ▶  ‹ Mon, Nov 2 ›  [==== the day ====]  10:30 AM  ⚙
 *
 * - Play: time passes (at the speed in ⚙), the sun moving with it.
 * - The date, with the day before and after; clicking it opens a calendar.
 * - The day as a strip, the scrubber: shaded by the sun's elevation at the
 *   place (night, twilight, day), sunrise and sunset marked, the time
 *   previewed under the pointer; drag it, or use it as a slider from the
 *   keyboard.
 * - The time, in the zone chosen in ⚙ (local solar time by default).
 * - ⚙, a popover with the rest: speed, jumps (now, sunrise, golden hour,
 *   noon, sunset, night), study dates (solstices, equinoxes), time zone, and
 *   the sun's elevation with an action for when it's down (e.g. automatic
 *   exposure, so the night shows as it would to a camera).
 *
 * Overlay rules it keeps: one slim bar, always the same size (nothing
 * appears or disappears in it as the time changes; tabular figures); the
 * rest on demand; anchored to the bottom edge between the credits and a
 * fullscreen button, above the credits when the view is narrow; 24 px
 * targets and tooltips; readable over any scene (a translucent, blurred
 * backing); keyboard reachable, Escape and a click outside close the
 * popover and return focus; pointer input inside it never reaches the
 * camera. Styled in Cesium's 1.x widget palette.
 *
 * A place's legal time zone needs a boundary table (a follow-up); local
 * solar time is what the light follows.
 */
import type { Clock } from "../src/time/Clock.ts";
import { sunElevation, sunTimes, type SunTimes } from "../src/time/sun.ts";

export interface TimeControlsOptions {
  /** The place the time is about (geodetic radians), if any yet. */
  place: () => { longitude: number; latitude: number } | undefined;
  /**
   * Offered while the sun is down: e.g. turn on automatic exposure. A
   * button labeled `nightActionLabel` in the ⚙ popover.
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
  /**
   * Marks spans of time on the day strip (UTC ms), drawn as bands over the
   * sky's colors, with their titles in the strip's tooltip: an app's events
   * (a spacecraft behind the Moon). A click in a band, without a drag,
   * jumps the clock to its start, paused. An empty list clears them.
   */
  setMarks(marks: readonly TimeMark[]): void;
  dispose(): void;
}

/** A span of time marked on the day strip (`TimeControlsHandle.setMarks`). */
export interface TimeMark {
  /** UTC ms. */
  start: number;
  end: number;
  title: string;
}

type Zone = "nominal" | "solar" | "utc" | "local";

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

const ZONES: Record<Zone, { short: string; long: string }> = {
  nominal: {
    short: "",
    long:
      "The place's time zone from its longitude (whole hours from UTC), " +
      "without daylight saving or political borders",
  },
  solar: {
    short: "solar time",
    long: "Local solar time: noon is when the sun is highest here",
  },
  utc: { short: "UTC", long: "Coordinated Universal Time" },
  local: { short: "", long: "This computer's time zone" },
};

/** Below this view width the controls sit above the credits. */
const NARROW = 640;
/** The bar's widest, and narrowest beside the credits. */
const MAX_WIDTH = 560;
const MIN_WIDTH = 480;

/** Attaches the time controls over `element` (positioned relative to it). */
export function attachTimeControls(
  element: HTMLElement,
  clock: Clock,
  options: TimeControlsOptions,
): TimeControlsHandle {
  injectStyle();
  const root = el("div", "cesium-time");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "Date and time of the sun");
  // Pointer input inside the controls stays out of the camera.
  for (const type of ["pointerdown", "pointerup", "wheel", "dblclick"]) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }
  // By longitude until a time-zone map gives the place's legal zone.
  let zone: Zone = "nominal";

  // --- the bar ---
  const bar = el("div", "ct-bar");
  const play = button("ct-icon ct-play", "Play");
  const previous = button("ct-icon", "The day before", "‹");
  const dateButton = button("ct-date", "Choose a date");
  const date = document.createElement("input");
  date.type = "date";
  date.className = "ct-date-input";
  date.tabIndex = -1;
  date.setAttribute("aria-hidden", "true");
  const dateWrap = el("span", "ct-date-wrap");
  dateWrap.append(dateButton, date);
  const next = button("ct-icon", "The day after", "›");
  const stripWrap = el("div", "ct-strip-wrap");
  const strip = document.createElement("canvas");
  strip.className = "ct-strip";
  strip.tabIndex = 0;
  strip.setAttribute("role", "slider");
  strip.setAttribute("aria-label", "Time of day");
  strip.setAttribute("aria-valuemin", "0");
  strip.setAttribute("aria-valuemax", "1439");
  const preview = el("div", "ct-preview");
  preview.hidden = true;
  stripWrap.append(strip, preview);
  const time = el("span", "ct-time");
  const live = el("span", "ct-live");
  live.setAttribute("aria-hidden", "true");
  const timeText = el("span", "");
  const zoneTag = el("span", "ct-zone");
  time.append(live, timeText, zoneTag);
  const settings = button("ct-icon", "Speed, jumps and time zone");
  settings.innerHTML = GEAR_ICON;
  settings.setAttribute("aria-haspopup", "dialog");
  settings.setAttribute("aria-expanded", "false");
  bar.append(
    play,
    divider(),
    previous,
    dateWrap,
    next,
    divider(),
    stripWrap,
    time,
    divider(),
    settings,
  );

  // --- the ⚙ popover ---
  const popover = el("div", "ct-popover");
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Time options");
  popover.hidden = true;

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

  const jumps = el("div", "ct-chips");
  const now = button("ct-chip", "Now: follow this computer's clock", "Now");
  const presets: Array<
    [HTMLButtonElement, (t: SunTimes) => number | undefined]
  > = [
    [button("ct-chip", "Sunrise", "Sunrise"), (t) => t.sunrise],
    [
      button("ct-chip", "Golden hour: 45 minutes before sunset", "Golden hour"),
      (t) => (t.sunset !== undefined ? t.sunset - 45 * MINUTE : undefined),
    ],
    [button("ct-chip", "Solar noon", "Noon"), (t) => t.noon],
    [button("ct-chip", "Sunset", "Sunset"), (t) => t.sunset],
    [button("ct-chip", "Solar midnight", "Night"), (t) => t.noon + DAY / 2],
  ];
  jumps.append(now, ...presets.map(([b]) => b));

  const season = document.createElement("select");
  season.className = "ct-select";
  season.append(option("", "Choose…"));
  for (const [name] of SEASONS) {
    season.append(option(name, name));
  }
  const zoneSelect = document.createElement("select");
  zoneSelect.className = "ct-select";
  const computerZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "This computer";
  zoneSelect.append(
    option("nominal", "The place's (by longitude)"),
    option("solar", "Solar time at the place"),
    option("utc", "UTC"),
    option("local", `This computer (${computerZone})`),
  );

  // The sun: always shown, its action reserved (no shift when it sets).
  const sunRow = el("div", "ct-sun");
  const sunText = el("span", "");
  sunRow.append(sunText);
  let nightAction: HTMLButtonElement | undefined;
  if (options.onNight) {
    const label = options.nightActionLabel ?? "Adjust exposure";
    nightAction = button("ct-chip", label, label);
    nightAction.addEventListener("click", () => options.onNight?.());
    sunRow.append(nightAction);
  }
  const times = el("div", "ct-caption");

  popover.append(
    heading("Speed"),
    speeds,
    heading("Jump to"),
    jumps,
    field("Study date", season),
    field("Time zone", zoneSelect),
    sunRow,
    times,
  );
  root.append(popover, bar);
  element.append(root);

  // Centered between whatever sits in the bottom corners (the credits on
  // the left, a fullscreen button on the right), clear of both; where that
  // leaves too little room, above them, the day on a row of its own.
  const layout = () => {
    const width = element.clientWidth;
    let clear = 56;
    for (const corner of element.querySelectorAll<HTMLElement>(
      ".cesium-credits .cc-bar",
    )) {
      clear = Math.max(clear, corner.getBoundingClientRect().width + 16);
    }
    const room = Math.min(MAX_WIDTH, width - 2 * clear);
    const narrow = width < NARROW || room < MIN_WIDTH;
    root.classList.toggle("ct-narrow", narrow);
    root.style.width = narrow ? "" : `${room}px`;
    lastDrawn = "";
    render();
  };
  const resize = new ResizeObserver(layout);
  resize.observe(element);
  // The credits change width as the content on screen changes.
  const corners = new MutationObserver(() => {
    for (const corner of element.querySelectorAll(".cesium-credits .cc-bar")) {
      resize.observe(corner);
    }
  });
  corners.observe(element, { childList: true });
  for (const corner of element.querySelectorAll(".cesium-credits .cc-bar")) {
    resize.observe(corner);
  }

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
    if (!p) {
      return 0;
    }
    // Solar: 4 minutes per degree; nominal: that, in whole hours.
    const solar = (p.longitude / deg) * 4;
    return zone === "solar" ? solar : Math.round(solar / 60) * 60;
  };
  /** Midnight starting the zone's day that contains `ms`. */
  const dayStart = (ms: number) => {
    const off = offset(ms) * MINUTE;
    return Math.floor((ms + off) / DAY) * DAY - off;
  };
  const inZone = (ms: number) => new Date(ms + offset(ms) * MINUTE);
  const formatDate = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const formatYear = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    dateStyle: "full",
  });
  const formatClock = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
  const zoneShort = () => {
    if (zone === "local") {
      return (
        new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
          .formatToParts(new Date(clock.time))
          .find((p) => p.type === "timeZoneName")?.value ?? ""
      );
    }
    if (zone === "nominal") {
      const hours = Math.round(offset(clock.time) / 60);
      return hours === 0
        ? "UTC"
        : `UTC${hours > 0 ? "+" : "−"}${Math.abs(hours)}`;
    }
    return ZONES[zone].short;
  };

  /** Sets the time, keeping the time of day, on another day. */
  const moveToDay = (start: number) => {
    clock.time = start + (clock.time - dayStart(clock.time));
  };

  // --- interaction ---
  play.addEventListener("click", () => {
    clock.mode = clock.mode === "paused" ? "playing" : "paused";
  });
  previous.addEventListener("click", () =>
    moveToDay(dayStart(clock.time) - DAY),
  );
  next.addEventListener("click", () => moveToDay(dayStart(clock.time) + DAY));
  dateButton.addEventListener("click", () => {
    try {
      date.showPicker();
    } catch {
      date.focus();
    }
  });
  date.addEventListener("change", () => {
    if (!date.value) {
      return;
    }
    const [y, m, d] = date.value.split("-").map(Number);
    const utcMidnight = Date.UTC(y!, m! - 1, d!);
    moveToDay(utcMidnight - offset(utcMidnight) * MINUTE);
  });
  settings.addEventListener("click", () => setPopover(popover.hidden === true));
  now.addEventListener("click", () => {
    clock.rate = 1;
    clock.mode = "live";
  });
  for (const [b, pick] of presets) {
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
    lastDrawn = "";
    render();
  });

  // The popover: Escape and a click outside close it, focus returns.
  function setPopover(open: boolean): void {
    popover.hidden = !open;
    settings.setAttribute("aria-expanded", String(open));
    if (open) {
      render();
      (popover.querySelector("button, select") as HTMLElement | null)?.focus();
    }
  }
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !popover.hidden) {
      e.stopPropagation();
      setPopover(false);
      settings.focus();
    }
  });
  const outside = (e: PointerEvent) => {
    if (!popover.hidden && !root.contains(e.target as Node)) {
      setPopover(false);
    }
  };
  document.addEventListener("pointerdown", outside, true);

  // Scrubbing the day; the time under the pointer previewed.
  const fractionAt = (clientX: number) => {
    const rect = strip.getBoundingClientRect();
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };
  const timeAt = (clientX: number) =>
    dayStart(clock.time) + fractionAt(clientX) * (DAY - MINUTE);
  // The press on the strip, if one is going on: a drag scrubs, a click in a
  // marked span jumps to its start (`pressStep`).
  let press: StripPress | undefined;
  /** The marked span under `clientX` on the shown day, if any. */
  const markUnder = (clientX: number) => {
    const rect = strip.getBoundingClientRect();
    return markAt(marks, dayStart(clock.time), rect.width, clientX - rect.left);
  };
  const step = (phase: "down" | "move" | "up", clientX: number) => {
    const next = pressStep(
      press,
      phase,
      clientX,
      phase === "down" ? markUnder(clientX) : undefined,
    );
    press = next.press;
    if (next.time === "pointer") {
      clock.time = timeAt(clientX);
    } else if (next.time !== undefined) {
      clock.time = next.time;
    }
  };
  strip.addEventListener("pointerdown", (e) => {
    strip.setPointerCapture(e.pointerId);
    clock.mode = "paused";
    step("down", e.clientX);
  });
  strip.addEventListener("pointermove", (e) => {
    if (press) {
      step("move", e.clientX);
    }
    // Over a marked span (not pressing): a click jumps to its start.
    const mark = press ? undefined : markUnder(e.clientX);
    strip.style.cursor = mark ? "pointer" : "";
    const f = fractionAt(e.clientX);
    preview.textContent = mark
      ? `Jump to ${formatClock.format(inZone(mark.start))}`
      : formatClock.format(inZone(timeAt(e.clientX)));
    preview.style.left = `${f * 100}%`;
    preview.hidden = false;
  });
  strip.addEventListener("pointerleave", () => {
    if (!press) {
      preview.hidden = true;
    }
  });
  strip.addEventListener("pointerup", (e) => {
    if (press) {
      step("up", e.clientX);
    }
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
      clock.mode = clock.mode === "paused" ? "playing" : "paused";
    }
  });

  // --- drawing ---
  let lastDrawn = "";
  let shownPlaying: boolean | undefined;
  let cachedStrip: ImageData | undefined;
  let sunMarks: SunTimes | undefined;
  let marks: readonly TimeMark[] = [];
  const baseTitle = strip.title;

  function render(): void {
    const t = clock.time;
    const local = inZone(t);
    const clockText = formatClock.format(local);
    timeText.textContent = clockText;
    zoneTag.textContent = zoneShort();
    time.title =
      clock.mode === "live"
        ? `Now, following this computer's clock (${ZONES[zone].long})`
        : ZONES[zone].long;
    dateButton.textContent = formatDate.format(local);
    dateButton.title = `${formatYear.format(local)}: choose a date`;
    date.value = local.toISOString().slice(0, 10);
    live.classList.toggle("ct-on", clock.mode === "live");
    const playing = clock.mode !== "paused";
    const rateName =
      SPEEDS.find(([, rate]) => rate === clock.rate)?.[0] ?? `${clock.rate}×`;
    // Only when it changes: replaced every frame while playing, the icon
    // under the pointer was gone by the time the button was released, and
    // the click (to pause) never came.
    if (playing !== shownPlaying) {
      shownPlaying = playing;
      play.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
    }
    play.setAttribute("aria-label", playing ? "Pause" : `Play (${rateName})`);
    play.title = playing
      ? "Pause"
      : `Play: the sun moves at ${rateName} (speed in ⚙)`;
    for (const [b, rate] of speedButtons) {
      b.setAttribute("aria-pressed", String(rate === clock.rate));
    }
    now.setAttribute("aria-pressed", String(clock.mode === "live"));
    const start = dayStart(t);
    strip.setAttribute(
      "aria-valuenow",
      String(Math.round((t - start) / MINUTE)),
    );
    strip.setAttribute("aria-valuetext", clockText);
    drawStrip(start, t);
    if (!popover.hidden) {
      const p = place();
      if (p) {
        const e = sunElevation(t, p.longitude, p.latitude) / deg;
        const down = e < -0.833;
        sunText.textContent = down
          ? `Sun ${Math.round(-e)}° below the horizon`
          : `Sun ${Math.round(e)}° above the horizon`;
        // Reserved, shown only when it applies: the row keeps its size.
        nightAction?.classList.toggle("ct-reserved", !down);
        nightAction?.toggleAttribute("disabled", !down);
        const at = (ms: number | undefined) =>
          ms === undefined ? "—" : formatClock.format(inZone(ms));
        const day = sunTimes(start, p.longitude, p.latitude);
        times.textContent = `Sunrise ${at(day.sunrise)} · Noon ${at(day.noon)} · Sunset ${at(day.sunset)}`;
      } else {
        sunText.textContent = "No place yet";
        times.textContent = "";
      }
    }
  }

  function drawStrip(start: number, t: number): void {
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
    const p = place();
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
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let h = 1; h < 24; h++) {
        const x = Math.round((h / 24) * width);
        g.fillRect(x, height - (h % 6 === 0 ? 6 : 3) * ratio, ratio, height);
      }
      sunMarks = p ? sunTimes(start, p.longitude, p.latitude) : undefined;
      g.fillStyle = "rgba(255, 214, 140, 0.9)";
      for (const ms of [sunMarks?.sunrise, sunMarks?.sunset]) {
        if (ms !== undefined) {
          g.fillRect(
            Math.round(((ms - start) / DAY) * width),
            0,
            ratio,
            height,
          );
        }
      }
      cachedStrip = g.getImageData(0, 0, width, height);
    } else if (cachedStrip) {
      g.putImageData(cachedStrip, 0, 0);
    }
    const xOf = (ms: number) => ((ms - start) / DAY) * width;
    // The marks' titles join whatever title the strip had (the shown day's
    // marks only); never replace it.
    const titles = marks
      .filter((m) => m.end > start && m.start < start + DAY)
      .map((m) => m.title)
      .join("\n");
    const title = [baseTitle, titles].filter((x) => x !== "").join("\n");
    if (strip.title !== title) {
      strip.title = title;
    }
    // The app's marked spans, over the sky (not cached: they change).
    g.fillStyle = "rgba(255, 112, 84, 0.6)";
    for (const [x, w] of markSpans(marks, start, width, ratio)) {
      g.fillRect(x, 0, w, height);
    }
    const wall = Date.now();
    if (wall >= start && wall < start + DAY) {
      g.fillStyle = "rgba(170, 238, 255, 0.95)";
      g.fillRect(Math.round(xOf(wall)) - ratio, 0, 2 * ratio, 3 * ratio);
    }
    const x = xOf(t);
    g.fillStyle = "#fff";
    g.fillRect(Math.round(x) - ratio, 0, 2 * ratio, height);
    // The knob in the controls' accent (the play button's color).
    g.strokeStyle = getComputedStyle(play).backgroundColor;
    g.lineWidth = 2 * ratio;
    g.beginPath();
    g.arc(x, height / 2, 4 * ratio, 0, 2 * Math.PI);
    g.fill();
    g.stroke();
  }

  const unsubscribe = clock.events.on("change", () => render());
  render();

  return {
    element: root,
    show(on: boolean) {
      root.hidden = !on;
      if (on) {
        lastDrawn = "";
        render();
      } else {
        setPopover(false);
      }
    },
    update() {
      lastDrawn = "";
      render();
    },
    setMarks(next) {
      marks = next;
      render();
    },
    dispose() {
      unsubscribe();
      resize.disconnect();
      corners.disconnect();
      document.removeEventListener("pointerdown", outside, true);
      root.remove();
    },
  };
}

/**
 * The marked spans over the day starting at `start` (UTC ms) on a strip
 * `width` px wide: each [x, width] in px, clipped to the day, at least
 * `minWidth` wide; spans outside the day are left out.
 */
export function markSpans(
  marks: readonly TimeMark[],
  start: number,
  width: number,
  minWidth = 1,
): [number, number][] {
  const xOf = (ms: number) => ((ms - start) / DAY) * width;
  const out: [number, number][] = [];
  for (const m of marks) {
    const x0 = Math.max(0, xOf(m.start));
    const x1 = Math.min(width, xOf(m.end));
    if (x1 > x0) {
      out.push([Math.floor(x0), Math.max(minWidth, Math.ceil(x1 - x0))]);
    }
  }
  return out;
}

/** A press on the day strip (`pressStep`). */
export interface StripPress {
  /** Where it went down, px. */
  x: number;
  /** The marked span it went down in, if any. */
  mark: TimeMark | undefined;
  /** It moved more than `CLICK_SLOP` px: a drag, which scrubs. */
  dragging: boolean;
}

/** A press that moves no further than this, px, is a click. */
export const CLICK_SLOP = 3;

/**
 * One step of a press on the day strip (pure): the press after it, and
 * the clock's new time, if it changes: "pointer" for the time under the
 * pointer, or a mark's start. A press outside a mark scrubs from the
 * start. A press in a mark writes nothing until it either moves past
 * `CLICK_SLOP` (a drag: it scrubs) or comes up (a click: the mark's
 * start), so a click writes the clock once.
 */
export function pressStep(
  press: StripPress | undefined,
  phase: "down" | "move" | "up",
  x: number,
  markUnder?: TimeMark,
): { press: StripPress | undefined; time?: number | "pointer" } {
  if (phase === "down") {
    const next = { x, mark: markUnder, dragging: markUnder === undefined };
    return next.dragging ? { press: next, time: "pointer" } : { press: next };
  }
  if (!press) {
    return { press };
  }
  if (phase === "move") {
    const dragging = press.dragging || Math.abs(x - press.x) > CLICK_SLOP;
    return dragging
      ? { press: { ...press, dragging }, time: "pointer" }
      : { press };
  }
  return !press.dragging && press.mark
    ? { press: undefined, time: press.mark.start }
    : { press: undefined };
}

/**
 * The marked span at `x` px on a strip `width` px wide showing the day from
 * `start` (UTC ms), with `slop` px either side so a thin band can be hit;
 * the latest-starting when bands overlap.
 */
export function markAt(
  marks: readonly TimeMark[],
  start: number,
  width: number,
  x: number,
  slop = 3,
): TimeMark | undefined {
  if (width <= 0) {
    return undefined;
  }
  const at = (ms: number) => ((ms - start) / DAY) * width;
  let found: TimeMark | undefined;
  for (const m of marks) {
    const x0 = Math.max(0, at(m.start));
    const x1 = Math.min(width, at(m.end));
    if (
      x1 > x0 &&
      x >= x0 - slop &&
      x <= x1 + slop &&
      (found === undefined || m.start > found.start)
    ) {
      found = m;
    }
  }
  return found;
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
  b.title = label;
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

function divider(): HTMLElement {
  const d = el("span", "ct-divider");
  d.setAttribute("aria-hidden", "true");
  return d;
}

function heading(text: string): HTMLElement {
  const h = el("div", "ct-heading");
  h.textContent = text;
  return h;
}

/** A labeled control on one line. */
function field(label: string, control: HTMLElement): HTMLElement {
  const row = document.createElement("label");
  row.className = "ct-field";
  const name = el("span", "ct-heading");
  name.textContent = label;
  row.append(name, control);
  return row;
}

const PLAY_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4.5 2.5v11l9-5.5z" fill="currentColor"/></svg>';
const PAUSE_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
const GEAR_ICON =
  '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9.2 1.5l.3 1.7a5 5 0 0 1 1.3.7l1.6-.6 1.2 2.1-1.3 1.1a5 5 0 0 1 0 1.5l1.3 1.1-1.2 2.1-1.6-.6a5 5 0 0 1-1.3.7l-.3 1.7H6.8l-.3-1.7a5 5 0 0 1-1.3-.7l-1.6.6-1.2-2.1 1.3-1.1a5 5 0 0 1 0-1.5L2.4 5.4l1.2-2.1 1.6.6a5 5 0 0 1 1.3-.7l.3-1.7zM8 5.8A2.2 2.2 0 1 0 8 10.2 2.2 2.2 0 0 0 8 5.8z"/></svg>';

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

// Themed through --cesium-ui-* custom properties, set on any ancestor; the
// defaults follow StrataKit's dark theme (Bentley's design system: its
// elevation surface, 8% borders, 8 px containers and 4 px controls, ghost
// icon buttons with soft hover and pressed glows, InterVariable at 12 px)
// with Cesium blue as the accent. An app on StrataKit maps them to its
// tokens (Dyno's viewer.css), without the library depending on it.
const CSS = `
.cesium-time {
  --ct-surface: var(--cesium-ui-surface, oklch(26.92% 0.008 268.32));
  --ct-raised: var(--cesium-ui-surface-raised, oklch(30.5% 0.009 268.32));
  --ct-border: var(--cesium-ui-border, oklch(100% 0 0 / 0.08));
  --ct-control-border: var(--cesium-ui-control-border, oklch(41.45% 0.013 256.75));
  --ct-text: var(--cesium-ui-text, oklch(99.06% 0.002 247.84));
  --ct-text-muted: var(--cesium-ui-text-muted, oklch(79.56% 0.008 241.69));
  --ct-icon: var(--cesium-ui-icon, oklch(85.95% 0.006 255.48));
  --ct-hover: var(--cesium-ui-hover, oklch(100% 0 0 / 0.06));
  --ct-pressed: var(--cesium-ui-pressed, oklch(100% 0 0 / 0.1));
  --ct-accent: var(--cesium-ui-accent, #4581c4);
  --ct-on-accent: var(--cesium-ui-on-accent, #fff);
  --ct-focus: var(--cesium-ui-focus, #8cc4ff);
  --ct-font: var(--cesium-ui-font, "InterVariable", "Inter", system-ui, sans-serif);
  --ct-shadow: var(--cesium-ui-shadow, 0 1px 0 oklch(0% 0 0 / 0.08), 0 4px 12px -2px oklch(0% 0 0 / 0.4));
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 2;
  /* Its width is set to clear the bottom corners (see layout). */
  width: 420px;
  display: flex; flex-direction: column; align-items: stretch; gap: 6px;
  font: 400 12px/16px var(--ct-font); color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}
.cesium-time.ct-narrow { bottom: 52px; width: calc(100% - 16px); max-width: 560px; }
.cesium-time[hidden] { display: none; }
.cesium-time button, .cesium-time select, .cesium-time input { font: inherit; color: inherit; }
.cesium-time .ct-bar {
  display: flex; align-items: center; gap: 2px; height: 36px; padding: 0 4px; box-sizing: border-box;
  border-radius: 8px; border: 1px solid var(--ct-border);
  background: var(--ct-surface); box-shadow: var(--ct-shadow);
}
.cesium-time .ct-divider { flex: none; width: 1px; height: 16px; margin: 0 2px; background: var(--ct-border); }
/* Clicks land on the button, not its icon (which is swapped as it plays). */
.cesium-time button svg { pointer-events: none; }
.cesium-time .ct-icon {
  flex: none; display: grid; place-items: center; width: 28px; height: 28px; padding: 0;
  border: none; border-radius: 4px; background: none; color: var(--ct-icon); cursor: pointer;
  font-size: 16px; line-height: 1;
}
.cesium-time .ct-icon:hover, .cesium-time .ct-date:hover { background: var(--ct-hover); }
.cesium-time .ct-icon:active, .cesium-time .ct-date:active { background: var(--ct-pressed); }
.cesium-time .ct-icon[aria-expanded="true"] { background: var(--ct-pressed); }
.cesium-time .ct-play { background: var(--ct-accent); color: var(--ct-on-accent); }
.cesium-time .ct-play:hover { background: var(--ct-accent); filter: brightness(1.12); }
.cesium-time .ct-date-wrap { position: relative; flex: none; }
.cesium-time .ct-date {
  height: 28px; padding: 0 6px; border: none; border-radius: 4px; background: none;
  cursor: pointer; white-space: nowrap; min-width: 9ch;
}
/* The native picker, opened from the date button. */
.cesium-time .ct-date-input {
  position: absolute; inset: auto 0 0 0; width: 100%; height: 1px; opacity: 0; pointer-events: none;
  border: 0; padding: 0;
}
.cesium-time .ct-strip-wrap { position: relative; flex: 1 1 auto; min-width: 100px; margin: 0 6px; }
.cesium-time .ct-strip {
  display: block; width: 100%; height: 18px; border-radius: 4px; cursor: ew-resize; touch-action: none;
  box-shadow: inset 0 0 0 1px var(--ct-border);
}
.cesium-time .ct-preview {
  position: absolute; bottom: calc(100% + 8px); transform: translateX(-50%); pointer-events: none;
  padding: 2px 6px; border-radius: 4px; white-space: nowrap;
  background: var(--ct-raised); border: 1px solid var(--ct-border); box-shadow: var(--ct-shadow);
}
.cesium-time .ct-preview[hidden] { display: none; }
.cesium-time .ct-time {
  flex: none; display: inline-flex; align-items: baseline; gap: 4px; padding: 0 4px; white-space: nowrap;
}
.cesium-time .ct-zone { color: var(--ct-text-muted); font-size: 11px; min-width: 4ch; }
.cesium-time .ct-live { width: 6px; height: 6px; border-radius: 50%; align-self: center; background: transparent; }
.cesium-time .ct-live.ct-on { background: var(--ct-accent); }
.cesium-time.ct-narrow .ct-bar { flex-wrap: wrap; height: auto; padding: 4px; }
.cesium-time.ct-narrow .ct-strip-wrap { order: 10; flex-basis: 100%; margin: 4px 4px 2px; }
.cesium-time .ct-popover {
  align-self: flex-end; width: 300px; max-width: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 6px; padding: 12px;
  border-radius: 8px; border: 1px solid var(--ct-border);
  background: var(--ct-raised); box-shadow: var(--ct-shadow);
}
.cesium-time .ct-popover[hidden] { display: none; }
.cesium-time .ct-heading { color: var(--ct-text-muted); font-size: 11px; }
.cesium-time .ct-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.cesium-time .ct-chip, .cesium-time .ct-segment {
  min-height: 24px; padding: 0 8px; cursor: pointer; white-space: nowrap;
  border: 1px solid var(--ct-control-border); background: none;
}
.cesium-time .ct-chip { border-radius: 4px; }
.cesium-time .ct-segments { display: flex; margin-bottom: 6px; }
.cesium-time .ct-segment { flex: 1; border-radius: 0; margin-left: -1px; }
.cesium-time .ct-segment:first-child { border-radius: 4px 0 0 4px; margin-left: 0; }
.cesium-time .ct-segment:last-child { border-radius: 0 4px 4px 0; }
.cesium-time .ct-chip:hover:not(:disabled), .cesium-time .ct-segment:hover { background: var(--ct-hover); }
.cesium-time .ct-chip:active, .cesium-time .ct-segment:active { background: var(--ct-pressed); }
.cesium-time .ct-chip[aria-pressed="true"], .cesium-time .ct-segment[aria-pressed="true"] {
  background: var(--ct-accent); border-color: var(--ct-accent); color: var(--ct-on-accent); position: relative;
}
.cesium-time .ct-select {
  height: 24px; box-sizing: border-box; padding: 0 4px; color-scheme: dark;
  border: 1px solid var(--ct-control-border); border-radius: 4px; background: none;
}
.cesium-time option { background: oklch(26.92% 0.008 268.32); }
.cesium-time .ct-field { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cesium-time .ct-field > .ct-heading { flex: none; white-space: nowrap; }
.cesium-time .ct-field > select { min-width: 0; flex: 0 1 auto; }
.cesium-time .ct-sun > span { flex: 1; }
.cesium-time .ct-sun {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 26px;
  margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--ct-border);
}
.cesium-time .ct-reserved { visibility: hidden; }
.cesium-time .ct-caption { color: var(--ct-text-muted); font-size: 11px; }
.cesium-time :focus-visible { outline: 2px solid var(--ct-focus); outline-offset: 1px; }
`;
