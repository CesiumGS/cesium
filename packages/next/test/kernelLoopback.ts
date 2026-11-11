// An in-process stand-in for a Web Worker: a `KernelHost` behind the same
// structured clone (with transfer) and the same asynchronous delivery that a
// real worker's message port has, for testing `KernelClient` and `KernelHost`.
import { KernelHost, type KernelHostOptions } from "../src/brep/kernelHost.ts";
import type { KernelWorkerLike } from "../src/brep/kernelClient.ts";
import type { KernelReply, KernelRequest } from "../src/brep/kernelProtocol.ts";

export interface Loopback extends KernelWorkerLike {
  readonly host: KernelHost;
  terminated: boolean;
  /** Raises the worker's `error` event, as a script that failed would. */
  fail(message: string): void;
}

export function loopback(
  options: Omit<KernelHostOptions, "post"> = {},
): Loopback {
  const listeners = {
    message: [] as Array<(event: { data: KernelReply }) => void>,
    error: [] as Array<(event: { message?: string }) => void>,
    messageerror: [] as Array<(event: { message?: string }) => void>,
  };
  const host = new KernelHost({
    ...options,
    post(reply, transfer) {
      const data = structuredClone(reply, { transfer });
      setTimeout(() => {
        if (!port.terminated) {
          listeners.message.forEach((listener) => listener({ data }));
        }
      }, 0);
    },
  });
  const port = {
    host,
    terminated: false,
    postMessage(message: KernelRequest, transfer: ArrayBuffer[] = []) {
      const data = structuredClone(message, { transfer });
      setTimeout(() => {
        if (!port.terminated) {
          host.receive(data);
        }
      }, 0);
    },
    terminate() {
      port.terminated = true;
      // A real worker's memory goes with it.
      host.dispose();
    },
    addEventListener(type: string, listener: unknown) {
      (listeners as Record<string, unknown[]>)[type]!.push(listener);
    },
    fail(message: string) {
      listeners.error.forEach((listener) => listener({ message }));
    },
  } as Loopback;
  return port;
}
