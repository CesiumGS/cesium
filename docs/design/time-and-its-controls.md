# Time and its controls

**What this holds:** The engine's clock, time scales and the time controls. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Once the sky, the sun's light and the stars come from the time, views need
time controls. 1.x's are the `Animation` widget (a shuttle-ring dial for
play, reverse and speed) and the `Timeline` (a scrubbable bar of dense tick
labels in UTC). They show the clock, not what the time means: no time
zone, no sunrise or sunset, no "now", no quick way to pick a date, and a
speed dial few users understand. The model under them (one `Clock` per
viewer: current time, multiplier, range, step) is sound and stays,
improved.

**Model (engine).**

- A `Clock` holds the time (a `JulianDate`, TAI inside), a rate (seconds of
  scene time per second), a mode (paused, playing, or live: following the
  wall clock), and an optional range (clamp or loop). Views refer to a
  clock, shared by default; a view can have its own (split view comparing
  9 am and 3 pm shadows, an AEC staple).
- What depends on time is computed per view from its clock: the sun and
  moon directions (L0 parity with 1.x), the star field's rotation, the
  atmosphere's light and the environment lighting, time-dynamic content
  (§13.11 tracks, time-dynamic tiles). `Engine.sunDirection` becomes a
  derived, per-view value; setting the sun by hand stays possible (an
  override, as the Viewer's sliders do today).
- Changing the time renders on demand like any other change (§13.8);
  scrubbing must stay smooth, so what time rebuilds per frame (the
  atmosphere's sky-view table, the environment's radiance and SH) has to
  fit in a frame.

**Controls (a widget, separate from the engine).**

- **A time pill** in a corner of the view: the date and time at the place
  being looked at, in its time zone ("Tue 21 Jun 2026 · 3:42 pm EDT"), with
  play/pause. `Intl.DateTimeFormat` formats any IANA zone; finding the zone
  of a place needs a small boundary table (or solar time as a fallback).
  UTC and the viewer's own zone are a menu choice.
- **Expanded: a day strip.** A 24-hour scrubber for the chosen day whose
  background is the day itself: the atmosphere's horizon color over the day
  at the focus point (night, twilight, day), with marks for sunrise, solar
  noon, sunset and the twilights, and "now". Dragging scrubs; scrolling over
  it zooms the scale from minutes to years (the timeline's job, when it's
  needed).
- **Date**: a calendar with the year's landmarks (solstices, equinoxes) and
  presets for shadow studies (21 Mar, 21 Jun, 21 Sep, 21 Dec at 9 am, noon
  and 3 pm) and for looks (sunrise, golden hour, noon, sunset, night).
- **Speed** as a few named steps (real time, 1 min/s, 1 h/s, 1 day/s),
  reverse in a menu, instead of a dial. **Now** returns to live.
- **Data time**: when content carries time (tracks, CZML, time-dynamic
  tiles), the scrubber shows its availability as bands and its range, which
  is what 1.x's timeline is for; without such content the day strip is the
  default.
- **Exposure across day and night**: a fixed EV100 15 turns a scrubbed night
  black, so scrubbing past sunset offers (or turns on) automatic exposure,
  and the stars, moon and city lights appear as they would to a camera.
- Keyboard first (space to play, arrow keys to step an hour or a day),
  screen-reader announcements of the time, and a compact form that fits a
  phone. Built framework-free in `widgets/` like the Viewer, with Dyno's
  StrataKit version on top.

**Built (r41).** `Clock` (`src/time/Clock.ts`: time in UTC milliseconds,
rate, paused / playing / live) and the sun from it (`src/time/sun.ts`:
Meeus's low-precision apparent position, about 0.01°, turned to Earth-fixed
axes by Greenwich sidereal time; sunrise, solar noon and sunset by
bisection; unit tests against the almanac: the solstice's and equinox's
declinations, the subsolar longitude by the equation of time, Philadelphia's
sunrise, noon and sunset within 1.5-3 minutes). The `Viewer` owns a clock
and its sun follows it (`viewer.clock`, `sunFromClock`; `setSun` still
places it by hand); the first framing sets an unset clock to 10:30 local
solar time today there, a first look in daylight. The time controls
(`widgets/timeControls.ts`, framework-free, on by default in the `Viewer`):
the pill (date and time, play/pause), and its panel with the day strip
(shaded by the sun's elevation at the place, sunrise and sunset marked, the
wall clock's "now", dragged to scrub, a keyboard slider), the day before and
after, a date, "Now" (live), presets for the light (sunrise, golden hour,
noon, sunset, night) and the study dates (equinoxes, solstices), named
speeds, and the time zone: local solar time at the place (default), UTC or
this computer's. When the sun is down it offers an action (Dyno's: turn on
automatic exposure). Dyno's Viewer: "Sun from date and time" (on by
default; the azimuth and elevation sliders otherwise). Playing at 1 h/s
re-renders every frame with the sky, environment and aerial perspective
updating (about 6 ms of GPU at Dyno's size on the laptop GPU).

Follow-ups: the sun with 1.x's exact algorithms (Simon 1994, the IAU 2006
Earth orientation with its data) for L0 parity; a place's legal time zone
(a boundary table); clocks per view (comparing two times side by side) and
`Engine.sunDirection` per view; data time ranges on the strip; the moon and
the night sky, without which a night is black at any exposure. Open
(r41): with automatic exposure, a midnight view showed the terrain lit
while the truck was black, and at noon the meter settled on an exposure
that clipped the lit truck to white, as if the terrain were far darker than
the sun should make it: the terrain's lighting (or the meter's reading of
it) needs a look. Found on the way: an overflow to infinity (a lit scene
at a night exposure) made the meter's average NaN and froze automatic
exposure for good; the opaque pass now stays below fp16's largest value and
the meter ignores readings that aren't numbers.
