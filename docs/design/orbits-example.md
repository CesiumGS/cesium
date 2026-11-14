# Sketch: an orbits example (owner, 2026-11-08)

**What this holds:** An orbits example sketch (owner, 2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

A Dyno example of what's around the Earth: a database of satellites and near-Earth objects, with their orbits. It would use the live points path of [real-time-tracks.md](real-time-tracks.md) for tens of thousands of objects, propagated from a catalog: published orbital elements for satellites (for example CelesTrak or Space-Track, with SGP4) and JPL's small-body data for near-Earth objects, heliocentric rather than Earth-bound, so reference frames matter here. Orbits as lines lean on the vector design. Terms and fetch limits need reading per source, and data follows [2026-11-08-owners-calls-for-later-plans.md](../decisions/2026-11-08-owners-calls-for-later-plans.md)'s rule: fetched, not shipped.
