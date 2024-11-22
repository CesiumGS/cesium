#![feature(stdsimd)]

use wasm_bindgen::prelude::*;
use core::arch::wasm32::*;
use std::mem;

use crate::textureGen::TextureData;

// Enable SIMD at the crate level
#[cfg(target_arch = "wasm32")]
#[cfg(target_feature = "simd128")]

// #[wasm_bindgen]
// pub struct TextureData {
//     data: Vec<u32>,
//     width: u32,
//     height: u32,
// }

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
}

// SIMD optimized version of pack_half_2x16
#[inline]
unsafe fn pack_half_2x16_simd(a: v128, b: v128) -> v128 {
    // Convert f32x4 to i32x4 with rounding
    let a_int = i32x4_trunc_sat_f32x4(a);
    let b_int = i32x4_trunc_sat_f32x4(b);
    
    // Shift and pack
    let packed = v128_and(
        v128_or(
            i32x4_shl(a_int, 16),
            v128_and(b_int as v128, u32x4_splat(0xFFFF))
        ),
        u32x4_splat(0xFFFFFFFF)
    );
    
    packed
}


#[inline]
unsafe fn matrix_multiply_simd(rot: &[f32; 4], scale: &[f32; 3]) -> [v128; 3] {
    let quat = v128_load(rot.as_ptr() as *const v128);
    let scale_vec = v128_load(scale.as_ptr() as *const v128);
    
    let q_squared = f32x4_mul(quat, quat);
    let two = f32x4_splat(2.0);
    let one = f32x4_splat(1.0);
    
    // First row of rotation matrix
    let sum_yz0 = f32x4_add(
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<1>(q_squared)),  // y²
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<2>(q_squared))   // z²
    );
    let row0 = f32x4_sub(one, f32x4_mul(two, sum_yz0));

    // Second row - 2(xy + wz)
    let xy = f32x4_mul(
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<0>(quat)),  // x
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<1>(quat))   // y
    );
    let wz = f32x4_mul(
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<3>(quat)),  // w
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<2>(quat))   // z
    );
    let row1 = f32x4_mul(
        two,
        f32x4_add(xy, wz)
    );

    // Third row - 2(xz - wy) 
    let xz = f32x4_mul(
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<0>(quat)),  // x
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<2>(quat))   // z
    );
    let wy = f32x4_mul(
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<3>(quat)),  // w
        f32x4_replace_lane::<0>(f32x4_splat(0.0), f32x4_extract_lane::<1>(quat))   // y
    );
    let row2 = f32x4_mul(
        two,
        f32x4_sub(xz, wy)
    );

    // Scale the row
    let scaled_row0 = f32x4_mul(row0, f32x4_splat(f32x4_extract_lane::<0>(scale_vec)));
    let scaled_row1 = f32x4_mul(row1, f32x4_splat(f32x4_extract_lane::<1>(scale_vec)));
    let scaled_row2 = f32x4_mul(row2, f32x4_splat(f32x4_extract_lane::<2>(scale_vec)));
    [scaled_row0, scaled_row1, scaled_row2]
}

#[wasm_bindgen]
#[target_feature(enable = "simd128")]
pub unsafe fn generate_texture_simd(
    buffer: &[u8],
    vertex_count: usize,
) -> Result<TextureData, JsValue> {
    let f_buffer = std::slice::from_raw_parts(
        buffer.as_ptr() as *const f32,
        buffer.len() / 4,
    );

    let tex_width = 1024 * 2;
    let tex_height = ((2 * vertex_count) as f32 / tex_width as f32).ceil() as u32;
    let mut tex_data = vec![0u32; (tex_width * tex_height * 4) as usize];
    
    let tex_data_c = std::slice::from_raw_parts_mut(
        tex_data.as_mut_ptr() as *mut u8,
        tex_data.len() * 4,
    );
    
    let tex_data_f = std::slice::from_raw_parts_mut(
        tex_data.as_mut_ptr() as *mut f32,
        tex_data.len(),
    );

    // Process vertices in SIMD-friendly chunks where possible
    for i in 0..vertex_count {
        let pos = v128_load(&f_buffer[8 * i] as *const f32 as *const v128);
        v128_store(
            &mut tex_data_f[8 * i] as *mut f32 as *mut v128,
            pos
        );

        let color_offset = 32 * i + 24;
        let color = v128_load32_zero(buffer[color_offset..].as_ptr() as *const u32);
        v128_store(
            tex_data_c[4 * (8 * i + 7)..].as_ptr() as *mut v128,
            color
        );

        let scale = [
            f_buffer[8 * i + 3],
            f_buffer[8 * i + 4],
            f_buffer[8 * i + 5],
        ];

        let rot = [
            (buffer[32 * i + 28] as f32 - 128.0) / 128.0,
            (buffer[32 * i + 29] as f32 - 128.0) / 128.0,
            (buffer[32 * i + 30] as f32 - 128.0) / 128.0,
            (buffer[32 * i + 31] as f32 - 128.0) / 128.0,
        ];

        let m_rows = matrix_multiply_simd(&rot, &scale);
        let sigma0 = f32x4_add(
            f32x4_add(
                f32x4_mul(m_rows[0], m_rows[0]),
                f32x4_mul(m_rows[1], m_rows[1])
            ),
            f32x4_mul(m_rows[2], m_rows[2])
        );
        
        let sigma1 = f32x4_add(
            f32x4_add(
                f32x4_mul(m_rows[0], i8x16_shuffle::<4,8,12,0,4,8,12,0,4,8,12,0,4,8,12,0>(
                    m_rows[0], m_rows[0]
                )),
                f32x4_mul(m_rows[1], i8x16_shuffle::<4,8,12,0,4,8,12,0,4,8,12,0,4,8,12,0>(
                    m_rows[1], m_rows[1]
                ))
            ),
            f32x4_mul(m_rows[2], i8x16_shuffle::<4,8,12,0,4,8,12,0,4,8,12,0,4,8,12,0>(
                    m_rows[2], m_rows[2]
                ))
        );

        // Pack results
        let four = f32x4_splat(4.0);
        let sigma0_scaled = f32x4_mul(sigma0, four);
        let sigma1_scaled = f32x4_mul(sigma1, four);
        
        let packed = pack_half_2x16_simd(sigma0_scaled, sigma1_scaled);
        v128_store(
            &mut tex_data[8 * i + 4] as *mut u32 as *mut v128,
            packed
        );
    }

    Ok(TextureData::new(
        tex_data,
        tex_width,
        tex_height,
    ))
}