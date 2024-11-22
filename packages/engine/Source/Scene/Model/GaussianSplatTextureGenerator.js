import __wbg_init, {
  initSync,
  generate_splat_texture_from_attrs,
} from "cesiumjs-gsplat-utils";
import buildModuleUrl from "../../Core/buildModuleUrl.js";

//TODO: move to TaskProcessor

GaussianSplatTextureGenerator.wasmModule = undefined;
GaussianSplatTextureGenerator.wasmInitialized = false;
GaussianSplatTextureGenerator.initPromise = null;

function GaussianSplatTextureGenerator() {}

GaussianSplatTextureGenerator.initWasmModule = function () {
  (async () => {
    if (!this.initPromise) {
      this.initPromise = await __wbg_init(
        buildModuleUrl("ThirdParty/cesiumjs_gsplat_utils_bg.wasm"),
      )
        .then((wasm) => {
          this.wasmInitialized = true;
          initSync(wasm);
          this.wasmModule = wasm;
        })
        .catch((err) => {
          console.error("Failed to initialize WASM module:", err);
          throw err;
        });
    }
  })();
  return this.initPromise;
};

//Attributes
//Position (vec3)
//Scale (vec3)
//Rotation (vec4)
//RGBA (u8 * 4)
GaussianSplatTextureGenerator.generateFromAttrs = async function (
  attributes,
  count,
) {
  if (!this.wasmModule || !this.wasmInitialized) {
    this.initWasmModule();

    while (!this.wasmModule) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return generate_splat_texture_from_attrs(
    attributes.find((a) => a.name === "POSITION").typedArray,
    attributes.find((a) => a.name === "_SCALE").typedArray,
    attributes.find((a) => a.name === "_ROTATION").typedArray,
    attributes.find((a) => a.name === "COLOR_0").typedArray,
    count,
  );
};

export default GaussianSplatTextureGenerator;
