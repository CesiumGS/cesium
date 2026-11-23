# Core IR spike ([core-ir.md](../../../../docs/design/core-ir.md))

Spike code for choosing the engine's core IR. Nothing here is part of `@cesium/next`; its dependencies live in this folder's own `package.json`, and nothing was added to the package's.

## Run it

```sh
cd spikes/core-ir
pnpm install --ignore-workspace   # naga-wasm 30.2.0 and onnxruntime-web, in this folder (esbuild comes from the repository root)
node run.mjs         # Node measurements, written to out/node.json
node size.mjs        # bundle sizes
```

In the browser, start a dev server on your own port and open `/spikes/coreIr.html`. Results are also in `window.coreIrResults`.

## Files

| File                               | What                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cir.ts`                           | Candidate (a): the IR (typed single-assignment equations, rates, hash-consing, constant folding), its float64 evaluator and a jaxpr-style listing. Op names and semantics are glTF KHR_interactivity's. |
| `passes.ts`                        | Rates, literals to uniforms (with a shape key for pipeline caching), the versioned JSON form and its checking reader.                                                                                   |
| `ad.ts`, `interval.ts`             | Forward-mode autodiff (jvp, Jacobian programs) and interval bounds, as interpretations of the IR.                                                                                                       |
| `emit.ts`                          | WGSL and GLSL ES 3.00 from one program.                                                                                                                                                                 |
| `fromStyle.ts`                     | Front end: 1.x style expressions, through today's parser.                                                                                                                                               |
| `fromTransform.ts`                 | Front end: restricted JS transforms, through today's `parseTransform`.                                                                                                                                  |
| `fromMaterialX.ts`                 | Front end: a MaterialX node graph (XML), with the edits a live editor makes.                                                                                                                            |
| `fromSpirv.ts`                     | Front end: a WGSL function through naga to SPIR-V, read into the IR.                                                                                                                                    |
| `onnx.ts`                          | Candidate (b): the same programs as ONNX models (opset 28), a reader back, and a protobuf encoder.                                                                                                      |
| `naga-crate/`                      | Candidate for our own wasm-bindgen build of naga. **Not built** (no Rust toolchain on the machine; installing one was refused).                                                                         |
| `fromAlignment.ts`                 | Input 5: a plan-and-profile alignment over typed tables with `cesium/search`, its float64 reference, and a float32 emulation of the residual pass's row window.                                         |
| `benchAlignment.ts`                | Input 5's measurements, against today's per-element corridor compile.                                                                                                                                   |
| `samples.ts`                       | The four inputs.                                                                                                                                                                                        |
| `bench.ts`, `run.mjs`, `oracle.js` | Node measurements, with 1.x `Cesium3DTileStyle` as the style oracle.                                                                                                                                    |
| `browser.mjs`, `../coreIr.html`    | Browser measurements and the live MaterialX preview.                                                                                                                                                    |
