// A kind whose query selects its content (CS-847): the sample source, under
// a kind that declares `layer` (SourceIdentity.params), so two layers of one
// URL are two sources with their own feature IDs. Also `access_token`, which
// is a credential and so is never kept all the same.
import type { SourceKind } from "../../../packages/core/src/source/types.ts";
import { SampleSource } from "./sampleKind.ts";

const kind: SourceKind = {
  id: "layered",
  accepts: (asset) =>
    asset.kind === "layered" || asset.url.pathname.endsWith(".layers"),
  open: (asset, host) => new SampleSource(asset, host),
  identity: { params: ["layer", "access_token"] },
};
export default kind;
