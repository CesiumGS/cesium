// Runs the device probes in a worker: the same code as the page's, where an
// engine in worker mode would run it (it needs only `navigator` and
// `OffscreenCanvas`). Posts the results back.
import {
  forgetProbes,
  probeWebgpu,
} from "../packages/next/src/scene/deviceChoice.ts";
import { probeWebgl2 } from "../packages/next/src/webgl2/probe.ts";

self.onmessage = async () => {
  forgetProbes();
  const [webgpu, webgl2] = await Promise.all([probeWebgpu(), probeWebgl2()]);
  postMessage({ webgpu, webgl2 });
};
