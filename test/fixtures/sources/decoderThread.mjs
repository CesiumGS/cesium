// A worker thread for Node tests that runs registered decoders as the
// content worker does (packages/core/src/io/worker.ts hands them to the same
// WorkerDecoders). It answers the pool's messages with Jobs' reply shape.
import { parentPort } from "node:worker_threads";
import { WorkerDecoders } from "../../../packages/core/src/io/workerDecoders.ts";

const decoders = new WorkerDecoders();
const controllers = new Map();
parentPort.on("message", (data) => {
  if (decoders.handleLoad(data)) {
    return;
  }
  if (data.type === "cancel") {
    controllers.get(data.id)?.abort();
    return;
  }
  if (!decoders.has(data.type)) {
    parentPort.postMessage({
      id: data.id,
      ok: false,
      error: `Unknown request type "${data.type}"`,
    });
    return;
  }
  const controller = new AbortController();
  controllers.set(data.id, controller);
  void decoders
    .run(data, controller.signal, (reply, transfer) =>
      parentPort.postMessage(reply, transfer),
    )
    .finally(() => controllers.delete(data.id));
});
