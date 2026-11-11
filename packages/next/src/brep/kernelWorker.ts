// The kernel worker (overall plan §13.33): the Web Worker that hosts SMLib and
// Open CASCADE for `KernelClient`. Provisional. All of its logic is in
// `KernelHost`, which tests run in-process.
import { KernelHost } from "./kernelHost.ts";
import type { KernelReply, KernelRequest } from "./kernelProtocol.ts";

interface Scope {
  postMessage(message: KernelReply, transfer: ArrayBuffer[]): void;
  addEventListener(
    type: "message",
    listener: (event: { data: KernelRequest }) => void,
  ): void;
}

const scope = self as unknown as Scope;
const host = new KernelHost({
  post: (reply, transfer) => scope.postMessage(reply, transfer),
});
scope.addEventListener("message", (event) => host.receive(event.data));
