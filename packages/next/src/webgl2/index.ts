// The WebGL 2 tier's entry: the one module the engine's device choice loads,
// dynamically, so WebGPU users never load it (`scripts/checkBundle.mjs`
// guards that it is a chunk of its own).
export { Webgl2Device } from "./device.ts";
export { probeWebgl2 } from "./probe.ts";
