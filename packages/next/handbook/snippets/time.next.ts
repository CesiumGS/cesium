import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
import { Instant, LeapSeconds } from "@cesium/next/time";

// The time scale and leap seconds are stated, not assumed.
const leap = LeapSeconds.builtIn();
const start = Instant.fromIso("2026-11-08T12:00:00", "UTC", leap);

viewer.clock.time = start.toUtc(leap);
viewer.clock.mode = "playing";
