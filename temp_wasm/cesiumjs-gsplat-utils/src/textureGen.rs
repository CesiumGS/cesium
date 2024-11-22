use wasm_bindgen::prelude::*;
use std::mem;
use js_sys::{Float32Array, Uint8Array, Uint32Array, Array};
use web_sys::console::*;

#[wasm_bindgen]
pub struct TextureData {

    data: Vec<u32>,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl TextureData {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u32> {
        self.data.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn new(data: Vec<u32>, width: u32, height: u32) -> Self {
        TextureData {
            data,
            width,
            height
        }
    }
}

//Algorithm from ILM 
//https://github.com/mitsuba-renderer/openexr/blob/master/IlmBase/Half/half.cpp
fn float_to_half(f: f32) -> i16 {
    let f_int = f.to_bits() as i32;
    let sign = (f_int >> 16) & 0x00008000;
    let mut exp = ((f_int >> 23) & 0x000000ff) - (127 - 15);
    let mut frac = f_int & 0x007fffff;

    if exp <= 0 {
        if exp < -10 {
            return sign as i16;
        }

        frac = frac | 0x00800000;

        let t = 14 - exp;
        let a = (1 << (t - 1)) - 1;
        let b = (frac >> t) & 1;

        frac = (frac + a + b) >> t;
        return (sign | frac) as i16;
    } else if exp == 0xff - (127 - 15) {
        if frac == 0 {
            return (sign | 0x7c00) as i16;
        } else {
            frac >>= 13;
            return (sign | 0x7c00 | frac | ((frac == 0) as i32)) as i16;
        }
    }

    frac = frac + 0x00000fff + ((frac >> 13) & 1);

    if frac & 0x00800000 != 0 {
        frac = 0;
        exp += 1;
    }

    if exp > 30 {
        //the original algo sets cpu overflow here
        return (sign | 0x7c00) as i16;
    }
    (sign | (exp << 10) | (frac >> 13)) as i16
}

#[wasm_bindgen]
pub fn generate_texture_from_attrs(
    positions: &Float32Array,
    scales: &Float32Array,
    rots: &Float32Array,
    colors: &Uint8Array,
    count: usize
) -> Result<TextureData, JsValue> {
    let tex_width = 2048;
    let tex_height = ((2 * count) as f32 / tex_width as f32).ceil() as u32;
    let mut tex_data = vec![0u32; (tex_width * tex_height * 4) as usize];
    
    let tex_data_c = unsafe {
        std::slice::from_raw_parts_mut(
            tex_data.as_mut_ptr() as *mut u8,
            tex_data.len() * 4,
        )
    };
    
    let tex_data_f = unsafe {
        std::slice::from_raw_parts_mut(
            tex_data.as_mut_ptr() as *mut f32,
            tex_data.len(),
        )
    };

    let rotv: Vec<f32> = rots.to_vec();
    let posv: Vec<f32> = positions.to_vec();
    let clrv: Vec<u8> = colors.to_vec();
    let sclv: Vec<f32> = scales.to_vec();

    for i in 0..count {
        tex_data_f[8 * i + 0] = posv[3 * i + 0];
        tex_data_f[8 * i + 1] = posv[3 * i + 1];
        tex_data_f[8 * i + 2] = posv[3 * i + 2];

        //u8 offsets
        tex_data_c[4 * (8 * i + 7) + 0] = clrv[4 * i + 0];
        tex_data_c[4 * (8 * i + 7) + 1] = clrv[4 * i + 1];
        tex_data_c[4 * (8 * i + 7) + 2] = clrv[4 * i + 2];
        tex_data_c[4 * (8 * i + 7) + 3] = clrv[4 * i + 3];

        let r = rotv[4*i+3];
        let x = rotv[4*i+0];
        let y = rotv[4*i+1];
        let z = rotv[4*i+2];
        let r_matrix = [
            1.0 - 2.0 * (y * y + z * z),
            2.0 * (x * y + r * z),
            2.0 * (x * z - r * y),
            
            2.0 * (x * y - r * z),
            1.0 - 2.0 * (x * x + z * z),
            2.0 * (y * z + r * x),
            
            2.0 * (x * z + r * y),
            2.0 * (y * z - r * x),
            1.0 - 2.0 * (x * x + y * y),
        ];

        // S * R multiplication
        let s0 = 3 * i + 0;
        let s1 = 3 * i + 1;
        let s2 = 3 * i + 2;

        let m = [
            r_matrix[0] * sclv[s0], r_matrix[1] * sclv[s0], r_matrix[2] * sclv[s0],
            r_matrix[3] * sclv[s1], r_matrix[4] * sclv[s1], r_matrix[5] * sclv[s1],
            r_matrix[6] * sclv[s2], r_matrix[7] * sclv[s2], r_matrix[8] * sclv[s2],
        ];
        let sigma = [
            m[0] * m[0] + m[3] * m[3] + m[6] * m[6],
            m[0] * m[1] + m[3] * m[4] + m[6] * m[7],
            m[0] * m[2] + m[3] * m[5] + m[6] * m[8],
            m[1] * m[1] + m[4] * m[4] + m[7] * m[7],
            m[1] * m[2] + m[4] * m[5] + m[7] * m[8],
            m[2] * m[2] + m[5] * m[5] + m[8] * m[8],
        ];
        tex_data[8 * i + 4] = ( float_to_half(4.0 * sigma[0]) as u32 & 0xFFFF) | ((float_to_half(4.0 * sigma[1]) as u32 & 0xFFFF) << 16);
        tex_data[8 * i + 5] = (float_to_half(4.0 * sigma[2]) as u32 & 0xFFFF) | ((float_to_half(4.0 * sigma[3]) as u32 & 0xFFFF) << 16);
        tex_data[8 * i + 6] = (float_to_half(4.0 * sigma[4]) as u32 & 0xFFFF) | ((float_to_half(4.0 * sigma[5]) as u32 & 0xFFFF) << 16);
    }
    
    Ok(TextureData {
        data: tex_data,
        width: tex_width,
        height: tex_height,
    })
}