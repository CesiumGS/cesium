let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
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

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_0.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * @param {Float32Array} pos
 * @param {Uint8Array} rgba
 * @param {Float32Array} scale
 * @param {Float32Array} rot
 * @param {number} vertex_count
 * @returns {TextureData}
 */
export function generate_texture_from_attrs(pos, rgba, scale, rot, vertex_count) {
    const ptr0 = passArrayF32ToWasm0(pos, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(rgba, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(scale, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF32ToWasm0(rot, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.generate_texture_from_attrs(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, vertex_count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TextureData.__wrap(ret[0]);
}

/**
 * @param {Uint8Array} buffer
 * @param {number} vertex_count
 * @returns {TextureData}
 */
export function generate_texture(buffer, vertex_count) {
    const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_texture(ptr0, len0, vertex_count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TextureData.__wrap(ret[0]);
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}
/**
 * @param {GSplatData} data
 */
export function radix_sort_simd(data) {
    _assertClass(data, GSplatData);
    wasm.radix_sort_simd(data.__wbg_ptr);
}

/**
 * @param {Float32Array} positions
 * @param {Float32Array} scales
 * @param {Float32Array} rotations
 * @param {Float32Array} colors
 * @param {Float32Array} model_view
 * @param {number} count
 * @returns {GSplatData}
 */
export function sort_graphics_data(positions, scales, rotations, colors, model_view, count) {
    const ptr0 = passArrayF32ToWasm0(positions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF32ToWasm0(scales, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(rotations, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF32ToWasm0(colors, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArrayF32ToWasm0(model_view, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.sort_graphics_data(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, count);
    return GSplatData.__wrap(ret);
}

export function greet() {
    wasm.greet();
}

/**
 * @param {SortParameters} params
 */
export function count_sort(params) {
    _assertClass(params, SortParameters);
    wasm.count_sort(params.__wbg_ptr);
}

/**
 * @param {Uint8Array} buffer
 * @param {number} vertex_count
 * @returns {TextureData}
 */
export function generate_splat_texture(buffer, vertex_count) {
    const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_splat_texture(ptr0, len0, vertex_count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TextureData.__wrap(ret[0]);
}

/**
 * @param {Float32Array} pos
 * @param {Uint8Array} rgba
 * @param {Float32Array} scale
 * @param {Float32Array} rot
 * @param {number} vertex_cnt
 * @returns {TextureData}
 */
export function generate_splat_texture_from_attrs(pos, rgba, scale, rot, vertex_cnt) {
    const ptr0 = passArrayF32ToWasm0(pos, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(rgba, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(scale, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF32ToWasm0(rot, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.generate_splat_texture_from_attrs(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, vertex_cnt);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TextureData.__wrap(ret[0]);
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
     * @param {Float32Array} colors
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
        const ptr3 = passArrayF32ToWasm0(colors, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArrayF32ToWasm0(model_view, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.gsplatdata_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, count);
        this.__wbg_ptr = ret >>> 0;
        GSplatDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const SortParametersFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sortparameters_free(ptr >>> 0, 1));

export class SortParameters {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SortParametersFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sortparameters_free(ptr, 0);
    }
    /**
     * @param {Float32Array} positions
     * @param {Float32Array} scales
     * @param {Float32Array} rotations
     * @param {Float32Array} colors
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
        const ptr3 = passArrayF32ToWasm0(colors, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArrayF32ToWasm0(model_view, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.sortparameters_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, count);
        this.__wbg_ptr = ret >>> 0;
        SortParametersFinalization.register(this, this.__wbg_ptr, this);
        return this;
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

export function __wbg_alert_abe635d522c06aef(arg0, arg1) {
    alert(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

