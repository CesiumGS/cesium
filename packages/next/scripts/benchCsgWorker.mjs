// A kernel worker for `benchCsgUpdate.mjs`: the browser worker's `KernelHost`
// in a Node worker thread, with the kernels' builds loaded from disk, so a
// request crosses a real thread with a real structured clone.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import { KernelHost } from "../src/brep/kernelHost.ts";
import { OcctKernel } from "../src/brep/occt.ts";
import { SmlibKernel } from "../src/brep/smlib.ts";

const load = async (directory, file) =>
  (await import(pathToFileURL(join(directory, file)).href)).default();

const host = new KernelHost({
  post: (reply, transfer) => parentPort.postMessage(reply, transfer),
  loadOcct: async () =>
    new OcctKernel(await load(workerData.occt, "replicad_single.js")),
  loadSmlib: async () =>
    new SmlibKernel(await load(workerData.smlib, "smlib.mjs")),
});
parentPort.on("message", (request) => host.receive(request));
