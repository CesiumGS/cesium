// The frames explorer's compute worker (R13): the stress suite, PROJ and the
// PROJ-dependent overlays, off the main thread. Started by the page as
// `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`;
// everything testable is in host.ts, and the messages in protocol.ts.
import recorded from "./fingerprints.json";
import { browserContext, createHost, type HostPort } from "./host.ts";

createHost(self as unknown as HostPort, browserContext("/frames-data/"), {
  fingerprints: recorded.fingerprints,
});
