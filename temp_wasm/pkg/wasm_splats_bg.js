let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_2.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let WASM_VECTOR_LEN = 0;

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_2.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rots
 * @param {Uint8Array} colors
 * @param {number} count
 * @returns {TextureData}
 */
export function generate_texture_from_attrs(positions, scales, rots, colors, count) {
    const ret = wasm.generate_texture_from_attrs(positions, scales, rots, colors, count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TextureData.__wrap(ret[0]);
}

let cachedFloat32ArrayMemory0 = null;

function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
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

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}
/**
 * @param {GSplatData} data
 */
export function radix_sort_simd(data) {
    _assertClass(data, GSplatData);
    const ret = wasm.radix_sort_simd(data.__wbg_ptr);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rotations
 * @param {Uint8Array} colors
 * @param {Float32Array} model_view
 * @param {number} count
 * @returns {Array<any>}
 */
export function radix_sort_gaussians_attrs(positions, scales, rotations, colors, model_view, count) {
    const ret = wasm.radix_sort_gaussians_attrs(positions, scales, rotations, colors, model_view, count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Float32Array} positions
 * @param {Float32Array} model_view
 * @param {number} texture_width
 * @param {number} count
 * @returns {Uint32Array}
 */
export function radix_sort_gaussians_indexes(positions, model_view, texture_width, count) {
    const ret = wasm.radix_sort_gaussians_indexes(positions, model_view, texture_width, count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rotations
 * @param {Uint8Array} colors
 * @param {number} count
 * @returns {object}
 */
export function generate_splat_texture_from_attrs(positions, scales, rotations, colors, count) {
    const ret = wasm.generate_splat_texture_from_attrs(positions, scales, rotations, colors, count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

const GSplatDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gsplatdata_free(ptr >>> 0, 1));

export class GSplatData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GSplatData.prototype);
        obj.__wbg_ptr = ptr;
        GSplatDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GSplatDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gsplatdata_free(ptr, 0);
    }
    /**
     * @param {Float32Array} positions
     * @param {Float32Array} scales
     * @param {Float32Array} rotations
     * @param {Uint8Array} colors
     * @param {Float32Array} model_view
     * @param {number} count
     */
    constructor(positions, scales, rotations, colors, model_view, count) {
        const ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(scales, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF32ToWasm0(rotations, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(colors, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArrayF32ToWasm0(model_view, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.gsplatdata_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, count);
        this.__wbg_ptr = ret >>> 0;
        GSplatDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Float32Array} positions
     * @param {Float32Array} scales
     * @param {Float32Array} rotations
     * @param {Uint8Array} colors
     * @param {Float32Array} model_view
     * @param {number} count
     * @returns {GSplatData}
     */
    static fromFloat32Arrays(positions, scales, rotations, colors, model_view, count) {
        const ret = wasm.gsplatdata_fromFloat32Arrays(positions, scales, rotations, colors, model_view, count);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GSplatData.__wrap(ret[0]);
    }
    /**
     * @returns {Float32Array}
     */
    getPositions() {
        const ret = wasm.gsplatdata_getPositions(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Float32Array}
     */
    getScales() {
        const ret = wasm.gsplatdata_getScales(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Float32Array}
     */
    getRotations() {
        const ret = wasm.gsplatdata_getRotations(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    getColors() {
        const ret = wasm.gsplatdata_getColors(this.__wbg_ptr);
        return ret;
    }
}

const TextureDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_texturedata_free(ptr >>> 0, 1));

export class TextureData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TextureData.prototype);
        obj.__wbg_ptr = ptr;
        TextureDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TextureDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_texturedata_free(ptr, 0);
    }
    /**
     * @returns {Uint32Array}
     */
    get data() {
        const ret = wasm.texturedata_data(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get width() {
        const ret = wasm.texturedata_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get height() {
        const ret = wasm.texturedata_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {Uint32Array} data
     * @param {number} width
     * @param {number} height
     * @returns {TextureData}
     */
    static new(data, width, height) {
        const ptr0 = passArray32ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.texturedata_new(ptr0, len0, width, height);
        return TextureData.__wrap(ret);
    }
}

export function __wbg_buffer_61b7ce01341d7f88(arg0) {
    const ret = arg0.buffer;
    return ret;
};

export function __wbg_length_65d1cd11729ced11(arg0) {
    const ret = arg0.length;
    return ret;
};

export function __wbg_length_81a294bd2038fd26(arg0) {
    const ret = arg0.length;
    return ret;
};

export function __wbg_length_9d7c41656543fe86(arg0) {
    const ret = arg0.length;
    return ret;
};

export function __wbg_new_254fa9eac11932ae() {
    const ret = new Array();
    return ret;
};

export function __wbg_new_3ff5b33b1ce712df(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
};

export function __wbg_new_688846f374351c92() {
    const ret = new Object();
    return ret;
};

export function __wbg_new_b9ea1588c9985b80(arg0) {
    const ret = new Float32Array(arg0);
    return ret;
};

export function __wbg_newwithbyteoffsetandlength_5910bdf845a168eb(arg0, arg1, arg2) {
    const ret = new Uint32Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_newwithbyteoffsetandlength_ba35896968751d91(arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_newwithbyteoffsetandlength_f113a96374814bb2(arg0, arg1, arg2) {
    const ret = new Float32Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_newwithlength_1761a9eb039ca429(arg0) {
    const ret = new Uint32Array(arg0 >>> 0);
    return ret;
};

export function __wbg_newwithlength_34ce8f1051e74449(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return ret;
};

export function __wbg_newwithlength_ed665315b76ec334(arg0) {
    const ret = new Float32Array(arg0 >>> 0);
    return ret;
};

export function __wbg_push_6edad0df4b546b2c(arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
};

export function __wbg_set_23d69db4e5c66a6e(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
};

export function __wbg_set_4474fae9281eafb1(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
};

export function __wbg_set_4e647025551483bd() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    return ret;
}, arguments) };

export function __wbg_set_d2ca640bc040b031(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
};

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_2;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

export function __wbindgen_memory() {
    const ret = wasm.memory;
    return ret;
};

export function __wbindgen_number_new(arg0) {
    const ret = arg0;
    return ret;
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

