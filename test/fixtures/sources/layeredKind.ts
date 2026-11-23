// A second kind over the sample source (CS-847), claimed by its declared
// kind or a `.layers` path: so a URL that isn't `.sample` (an ion asset's
// tileset.json) can be opened in a test.
import type { SourceKind } from "../../../packages/core/src/source/types.ts";
import { SampleSource } from "./sampleKind.ts";

const kind: SourceKind = {
  id: "layered",
  accepts: (asset) =>
    asset.kind === "layered" || asset.url.pathname.endsWith(".layers"),
  open: (asset, host) => new SampleSource(asset, host),
};
export default kind;
