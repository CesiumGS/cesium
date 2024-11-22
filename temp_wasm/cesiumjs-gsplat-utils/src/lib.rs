mod utils;
mod perf_timer;
mod textureGen;
//mod textureGen_simd;
mod radix_simd;

use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint8Array, Uint32Array, Object};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

//reimplementation of our javascript count sort
#[derive(Clone, Copy)]
struct Matrix4([f32; 16]);

#[wasm_bindgen]
pub fn generate_splat_texture_from_attrs(
    positions: &Float32Array,
    scales: &Float32Array,
    rotations: &Float32Array,
    colors: &Uint8Array,
    count: usize
) -> Result<Object, JsValue> {
    let texture_data = textureGen::generate_texture_from_attrs(
        positions,
        scales,
        rotations,
        colors,
        count
    )?;

    let js_data = Uint32Array::new_with_length((texture_data.width() * texture_data.height() * 4) as u32);
    js_data.copy_from(&texture_data.data());

    // Create a JavaScript object to hold both the data and dimensions
    let result = Object::new();
    js_sys::Reflect::set(&result, &"data".into(), &js_data)?;
    js_sys::Reflect::set(&result, &"width".into(), &(texture_data.width() as f64).into())?;
    js_sys::Reflect::set(&result, &"height".into(), &(texture_data.height() as f64).into())?;
    
    Ok(result)
}