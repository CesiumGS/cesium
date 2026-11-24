// The layered kind under a second ID (test/sourceSeam.test.ts: T3's
// non-interference run and T4), claimed only by its declared kind: so one
// asset can be opened as two kinds.
import type { SourceKind } from "../../../packages/core/src/source/types.ts";
import { SampleSource } from "./sampleKind.ts";

const kind: SourceKind = {
  id: "layered-b",
  accepts: (asset) => asset.kind === "layered-b",
  open: (asset, host) => new SampleSource(asset, host),
};
export default kind;
