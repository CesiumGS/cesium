/**
 * The vehicles' feed, from the real-time tracks example: a worker that keeps
 * each vehicle's position and course, moves it on, and sends reports in slices.
 * A classic worker from a blob, which a page opened from disk may start.
 */
export const feedSource = `
const BUDGET = 2500000;
const ROW = 5;
let n = 0, half = 10000, rows = new Float32Array(0), rate = 10, cursor = 0, paused = false;
const plan = () => {
  const per = Math.min(n, Math.max(1, Math.ceil(BUDGET / rate)));
  return { per, interval: Math.ceil(n / per) / rate };
};
const tick = () => {
  if (n === 0 || paused) return;
  const { per, interval } = plan();
  const first = cursor;
  const count = Math.min(per, n - first);
  const out = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) {
    const o = (first + k) * ROW;
    let turn = rows[o + 4] + (Math.random() * 2 - 1) * 6;
    turn = Math.max(-20, Math.min(20, turn));
    rows[o + 4] = turn;
    let h = rows[o + 2] + turn * interval;
    const v = 30 * rows[o + 3];
    const r = (h * Math.PI) / 180;
    let x = rows[o] + v * interval * Math.sin(r);
    let y = rows[o + 1] + v * interval * Math.cos(r);
    if (Math.abs(x) > half) { x = Math.sign(x) * half; h = 360 - h; }
    if (Math.abs(y) > half) { y = Math.sign(y) * half; h = 180 - h; }
    h = ((h % 360) + 360) % 360;
    rows[o] = x; rows[o + 1] = y; rows[o + 2] = h;
    out[k * 4] = x; out[k * 4 + 1] = y; out[k * 4 + 2] = 0; out[k * 4 + 3] = h;
  }
  cursor = (first + count) % n;
  self.postMessage({ first, data: out, interval }, [out.buffer]);
};
self.onmessage = (e) => {
  const m = e.data;
  if (m.paused !== undefined) { paused = m.paused; return; }
  n = m.count; half = m.half; rate = m.rate; cursor = 0;
  rows = new Float32Array(n * ROW);
  const CHUNK = 1 << 20;
  for (let first = 0; first < n; first += CHUNK) {
    const count = Math.min(CHUNK, n - first);
    const samples = new Float32Array(count * 4);
    for (let k = 0; k < count; k++) {
      const o = (first + k) * ROW;
      rows[o] = (Math.random() * 2 - 1) * half;
      rows[o + 1] = (Math.random() * 2 - 1) * half;
      rows[o + 2] = Math.random() * 360;
      rows[o + 3] = 0.5 + Math.random();
      samples[k * 4] = rows[o];
      samples[k * 4 + 1] = rows[o + 1];
      samples[k * 4 + 3] = rows[o + 2];
    }
    self.postMessage({ first, data: samples, interval: plan().interval }, [samples.buffer]);
  }
  setInterval(tick, 1000 / rate);
};
`;
