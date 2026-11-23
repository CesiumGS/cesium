// Buffer indices read from data, kept inside their buffers (AGENTS.md, GPU
// safety: "Clamp every buffer index"). A record's offset or a count from
// content can point anywhere; WebGPU's robust access keeps such a read
// defined, but what it returns is not the data, so the engine clamps first.
// test/boundedLoops.test.ts takes these, `min` and `clamp` for a clamp.
module bounds;

// `at`, at most the last of `count` elements (0 when the buffer is empty).
public uint clampIndex(uint at, uint count) {
  return min(at, max(count, 1u) - 1u);
}

// The first of `width` elements from `at`, moved back so that all of them
// lie within `count` (0 when fewer than `width` do).
public uint clampSpan(uint at, uint width, uint count) {
  return min(at, count >= width ? count - width : 0u);
}
