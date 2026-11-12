// The section worker: the Web Worker `SectionClient` talks to. Provisional.
// All of its logic is in `SectionHost`, which tests run in-process.
import {
  SectionHost,
  type SectionMessage,
  type SectionReply,
} from "./sectionHost.ts";

interface Scope {
  postMessage(message: SectionReply, transfer: ArrayBuffer[]): void;
  addEventListener(
    type: "message",
    listener: (event: { data: SectionMessage }) => void,
  ): void;
}

const scope = self as unknown as Scope;
const host = new SectionHost({
  post: (reply, transfer) => scope.postMessage(reply, transfer),
});
scope.addEventListener("message", (event) => host.receive(event.data));
