import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
declare const url: string;
// ---
import { CustomShader } from "@cesium/next";

// WGSL here, or Slang through CustomShader.fromSlang.
const customShader = new CustomShader({
  fragment: `
    fn fragmentMain(
      fsInput: FragmentInput,
      material: ptr<function, MaterialOutput>,
    ) {
      (*material).baseColor = vec3f(1.0, 0.5, 0.0);
    }`,
});
const tileset = await viewer.addTileset(url, { customShader });
// --- end
export { tileset };
