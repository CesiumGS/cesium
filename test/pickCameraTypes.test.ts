// `CorePick.pose` is the pick camera's pose and `CorePick.camera` is the
// camera record. The engineering entry's `PickCamera` and `SnapCamera` mean
// the pose, so a change that points them at `CorePick["camera"]` would
// silently change what they mean.
//
// vitest runs no type checks here (`typecheck` is off in vite.config.ts), so
// these assertions are checked by `tsc` (this directory is in the root
// tsconfig's `include`): a wrong alias fails `npx tsc --noEmit -p .` and
// `npm run typecheck`. The test body only keeps vitest from reporting an
// empty file.
import { describe, expect, expectTypeOf, it } from "vitest";
import type { CorePick } from "../packages/core/src/index.ts";
import type { PickCamera, SnapCamera } from "../packages/crs/src/index.ts";

describe("PickCamera and SnapCamera", () => {
  it("mean CorePick.pose, not CorePick.camera", () => {
    expectTypeOf<PickCamera>().toEqualTypeOf<CorePick["pose"]>();
    expectTypeOf<SnapCamera>().toEqualTypeOf<CorePick["pose"]>();
    expectTypeOf<PickCamera>().not.toEqualTypeOf<CorePick["camera"]>();
    expectTypeOf<SnapCamera>().not.toEqualTypeOf<CorePick["camera"]>();
    expect(true).toBe(true);
  });
});
