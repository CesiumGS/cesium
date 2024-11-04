import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
//import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
//import RuntimeError from "../Core/RuntimeError.js";

let wasm;

let cachedUint8ArrayMemory0 = null;

// const TextureDataFinalization = (typeof FinalizationRegistry === 'undefined')
//     ? { register: () => {}, unregister: () => {} }
//     : new FinalizationRegistry(ptr => wasm.__wbg_texturedata_free(ptr >>> 0, 1));

//Used for texture generation, disabled for now
// class TextureData {

//   static __wrap(ptr) {
//       ptr = ptr >>> 0;
//       const obj = Object.create(TextureData.prototype);
//       obj.__wbg_ptr = ptr;
//       TextureDataFinalization.register(obj, obj.__wbg_ptr, obj);
//       return obj;
//   }

//   __destroy_into_raw() {
//       const ptr = this.__wbg_ptr;
//       this.__wbg_ptr = 0;
//       TextureDataFinalization.unregister(this);
//       return ptr;
//   }

//   free() {
//       const ptr = this.__destroy_into_raw();
//       wasm.__wbg_texturedata_free(ptr, 0);
//   }
//   /**
//    * @returns {Uint32Array}
//    */
//   get data() {
//       const ret = wasm.texturedata_data(this.__wbg_ptr);
//       const v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
//       wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
//       return v1;
//   }
//   /**
//    * @returns {number}
//    */
//   get width() {
//       const ret = wasm.texturedata_width(this.__wbg_ptr);
//       return ret >>> 0;
//   }
//   /**
//    * @returns {number}
//    */
//   get height() {
//       const ret = wasm.texturedata_height(this.__wbg_ptr);
//       return ret >>> 0;
//   }
// }

function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null ||
    cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

const cachedTextDecoder =
  typeof TextDecoder !== "undefined"
    ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true })
    : {
        decode: () => {
          throw Error("TextDecoder not available");
        },
      };

if (typeof TextDecoder !== "undefined") {
  cachedTextDecoder.decode();
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(
    getUint8ArrayMemory0().subarray(ptr, ptr + len),
  );
}

// let cachedUint32ArrayMemory0 = null;

// function getUint32ArrayMemory0() {
//     if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
//         cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
//     }
//     return cachedUint32ArrayMemory0;
// }

// function getArrayU32FromWasm0(ptr, len) {
//     ptr = ptr >>> 0;
//     return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
// }

let WASM_VECTOR_LEN = 0;
/*
function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_0.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
    */
/**
 * @param {Uint8Array} buffer
 * @param {number} vertex_count
 * @returns {TextureData}
 */
/*
function generate_texture(buffer, vertex_count) {
    const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_texture(ptr0, len0, vertex_count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TextureData.__wrap(ret[0]);
}
*/
let cachedFloat32ArrayMemory0 = null;

function getFloat32ArrayMemory0() {
  if (
    cachedFloat32ArrayMemory0 === null ||
    cachedFloat32ArrayMemory0.byteLength === 0
  ) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getFloat32ArrayMemory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * @param {Float32Array} splats
 */
function count_sort_splats(splats) {
  const ptr0 = passArrayF32ToWasm0(splats, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  wasm.count_sort_splats(ptr0, len0, splats);
}

/**
 * @param {Uint8Array} buffer
 * @param {number} vertex_count
 * @returns {TextureData}
 */
// function generate_splat_texture(buffer, vertex_count) {
//     const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
//     const len0 = WASM_VECTOR_LEN;
//     const ret = wasm.generate_splat_texture(ptr0, len0, vertex_count);
//     if (ret[2]) {
//         throw takeFromExternrefTable0(ret[1]);
//     }
//     return TextureData.__wrap(ret[0]);
// }

async function __wbg_load(module, imports) {
  const instance = await WebAssembly.instantiate(module, imports);

  if (instance instanceof WebAssembly.Instance) {
    return { instance, module };
  }
  return instance;
}

function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_copy_to_typed_array = function (arg0, arg1, arg2) {
    new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(
      getArrayU8FromWasm0(arg0, arg1),
    );
  };
  imports.wbg.__wbg_alert_abe635d522c06aef = function (arg0, arg1) {
    console.error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbindgen_throw = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbindgen_init_externref_table = function () {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
  };

  return imports;
}

function __wbg_init_memory(imports, memory) {}

function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedFloat32ArrayMemory0 = null;
  // cachedUint32ArrayMemory0 = null;
  cachedUint8ArrayMemory0 = null;

  wasm.__wbindgen_start();
  return wasm;
}

// function initSync(module) {
//     if (wasm !== undefined) {
//       return wasm;
//     }

//     if (typeof module !== 'undefined') {
//         if (Object.getPrototypeOf(module) === Object.prototype) {
//             ({module} = module)
//         } else {
//             console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
//         }
//     }

//     const imports = __wbg_get_imports();

//     __wbg_init_memory(imports);

//     if (!(module instanceof WebAssembly.Module)) {
//         module = new WebAssembly.Module(module);
//     }

//     const instance = new WebAssembly.Instance(module, imports);

//     return __wbg_finalize_init(instance, module);
// }

async function __wbg_init(module_or_path) {
  if (wasm !== undefined) {
    return wasm;
  }

  if (typeof module_or_path !== "undefined") {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        "using deprecated parameters for the initialization function; pass a single object instead",
      );
    }
  }

  if (typeof module_or_path === "undefined") {
    module_or_path = new URL("cesiumjs_gsplat_utils_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();

  if (
    typeof module_or_path === "string" ||
    (typeof Request === "function" && module_or_path instanceof Request) ||
    (typeof URL === "function" && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  __wbg_init_memory(imports);

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initWorker(parameters, transferableObjects) {
  // Require and compile WebAssembly module, or use fallback if not supported
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig) && defined(wasmConfig.wasmBinary)) {
    __wbg_init(wasmConfig.wasmBinary);
    return true;
  }
}

async function doSort(parameters, transferableObjects) {
  const f32arr = new Float32Array(parameters.splatIndexes.buffer);
  count_sort_splats(f32arr);
}

async function gaussianSplatSort(parameters, transferableObjects) {
  // Expect the first message to be to load a web assembly module
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }

  return doSort(parameters, transferableObjects);
}

export default createTaskProcessorWorker(gaussianSplatSort);
