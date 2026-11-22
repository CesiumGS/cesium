// A decoder a test registers (test/sourceSeam.test.ts): it sums a Float64Array
// and says which thread it ran on. Erasable TypeScript only: a Node worker
// thread imports it as the content worker would.
import { threadId } from "node:worker_threads";

export default function decode(payload: Readonly<Record<string, unknown>>) {
  const values = payload.values as Float64Array;
  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  const doubled = values.map((v) => v * 2);
  return {
    result: { sum, doubled, thread: threadId },
    transfer: [doubled.buffer],
  };
}
