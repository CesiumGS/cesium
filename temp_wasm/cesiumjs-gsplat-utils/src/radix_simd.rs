use std::arch::wasm32::*;
use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint8Array, Uint32Array, WebAssembly};
use wasm_bindgen::JsCast;
use web_sys::console;

use crate::perf_timer;

#[wasm_bindgen]
pub struct GSplatData {
    positions: Vec<f32>,
    scales: Vec<f32>,
    rotations: Vec<f32>,
    colors: Vec<u8>,
    model_view: [f32; 16],
    count: usize,
}

#[wasm_bindgen]
impl GSplatData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        positions: Vec<f32>,
        scales: Vec<f32>,
        rotations: Vec<f32>,
        colors: Vec<u8>,
        model_view: Vec<f32>,
        count: usize,
    ) -> Self {
        let mut model_view_array = [0.0; 16];
        model_view_array.copy_from_slice(&model_view);
        
        Self {
            positions,
            scales,
            rotations,
            colors,
            model_view: model_view_array,
            count,
        }
    }

    #[wasm_bindgen(js_name = fromFloat32Arrays)]
    pub fn from_float32_arrays(
        positions: Float32Array,
        scales: Float32Array,
        rotations: Float32Array,
        colors: Uint8Array,
        model_view: Float32Array,
        count: usize,
    ) -> Result<GSplatData, JsValue> {
        if positions.length() as usize != count * 3 {
            return Err(JsValue::from_str("Invalid positions length"));
        }
        if scales.length() as usize != count * 3 {
            return Err(JsValue::from_str("Invalid scales length"));
        }
        if rotations.length() as usize != count * 4 {
            return Err(JsValue::from_str("Invalid rotations length"));
        }
        if colors.length() as usize != count * 4 {
            return Err(JsValue::from_str("Invalid colors length"));
        }
        if model_view.length() != 16 {
            return Err(JsValue::from_str("Model view matrix must have 16 elements"));
        }

        let positions: Vec<f32> = positions.to_vec();
        let scales: Vec<f32> = scales.to_vec();
        let rotations: Vec<f32> = rotations.to_vec();
        let colors: Vec<u8> = colors.to_vec();
        let model_view: Vec<f32> = model_view.to_vec();

        Ok(GSplatData::new(
            positions,
            scales,
            rotations,
            colors,
            model_view,
            count,
        ))
    }

    #[wasm_bindgen(js_name = getPositions)]
    pub fn get_positions(&self) -> Float32Array {
        let result = Float32Array::new_with_length(self.positions.len() as u32);
        result.copy_from(&self.positions[..]);
        result
    }

    #[wasm_bindgen(js_name = getScales)]
    pub fn get_scales(&self) -> Float32Array {
        let result = Float32Array::new_with_length(self.scales.len() as u32);
        result.copy_from(&self.scales[..]);
        result
    }

    #[wasm_bindgen(js_name = getRotations)]
    pub fn get_rotations(&self) -> Float32Array {
        let result = Float32Array::new_with_length(self.rotations.len() as u32);
        result.copy_from(&self.rotations[..]);
        result
    }

    #[wasm_bindgen(js_name = getColors)]
    pub fn get_colors(&self) -> Uint8Array {
        let result = Uint8Array::new_with_length(self.colors.len() as u32);
        result.copy_from(&self.colors[..]);
        result
    }
}

#[target_feature(enable = "simd128")]
unsafe fn compute_depths_simd(positions: &[f32], model_view: &[f32], count: usize) -> Vec<i32> {
    let mut depths = Vec::with_capacity(count);
    let simd_count = count - (count % 4);
    
    let scale = f32x4(4096.0, 4096.0, 4096.0, 4096.0);
    let mv2 = f32x4_splat(model_view[2]);
    let mv6 = f32x4_splat(model_view[6]);
    let mv10 = f32x4_splat(model_view[10]);
    
    for chunk_idx in (0..simd_count).step_by(4) {
        let base_idx = chunk_idx * 3;
        if base_idx + 11 >= positions.len() {
            break; 
        }
        
        let pos = v128_load(positions[base_idx..].as_ptr() as *const v128);
        let mut depth = f32x4_mul(pos, mv2);
        
        let pos_y = v128_load(positions[base_idx + 4..].as_ptr() as *const v128);
        depth = f32x4_add(depth, f32x4_mul(pos_y, mv6));
        
        let pos_z = v128_load(positions[base_idx + 8..].as_ptr() as *const v128);
        depth = f32x4_add(depth, f32x4_mul(pos_z, mv10));
        
        let depth_scaled = f32x4_mul(depth, scale);
        let depth_int = i32x4_trunc_sat_f32x4(depth_scaled);
        
        let mut result = [0i32; 4];
        v128_store(result.as_mut_ptr() as *mut v128, depth_int);
        depths.extend_from_slice(&result);
    }
    
    let remainder_start = (count / 4) * 4;
    for i in remainder_start..count {
        let idx = i * 3;
        if idx + 2 < positions.len() {
            let depth = positions[idx] * model_view[2] +
                       positions[idx + 1] * model_view[6] +
                       positions[idx + 2] * model_view[10];
            depths.push((depth * 4096.0) as i32);
        }
    }
    
    depths.truncate(count);
    depths
}

#[target_feature(enable = "simd128")]
unsafe fn reorder_attributes_simd(data: &mut GSplatData, indices: &[u32]) {
    let mut new_positions = vec![0.0; data.positions.len()];
    let mut new_scales = vec![0.0; data.scales.len()];
    let mut new_rotations = vec![0.0; data.rotations.len()];
    let mut new_colors = vec![0; data.colors.len()];
    
    for (new_idx, &old_idx) in indices.iter().enumerate() {
        let old_idx = old_idx as usize;

        if old_idx * 3 + 2 >= data.positions.len() || 
           new_idx * 3 + 2 >= new_positions.len() {
            break;
        }

        let pos_idx = new_idx * 3;
        let old_pos_idx = old_idx * 3;
        new_positions[pos_idx..pos_idx + 3]
            .copy_from_slice(&data.positions[old_pos_idx..old_pos_idx + 3]);
        
        if old_idx * 3 + 2 >= data.scales.len() || 
           new_idx * 3 + 2 >= new_scales.len() {
            break;
        }
        
        let scale_idx = new_idx * 3;
        let old_scale_idx = old_idx * 3;
        new_scales[scale_idx..scale_idx + 3]
            .copy_from_slice(&data.scales[old_scale_idx..old_scale_idx + 3]);
        
        if old_idx * 4 + 3 >= data.rotations.len() || 
           new_idx * 4 + 3 >= new_rotations.len() {
            break;
        }
        
        let rot_idx = new_idx * 4;
        let old_rot_idx = old_idx * 4;
        new_rotations[rot_idx..rot_idx + 4]
            .copy_from_slice(&data.rotations[old_rot_idx..old_rot_idx + 4]);
        
        if old_idx * 4 + 3 >= data.colors.len() || 
           new_idx * 4 + 3 >= new_colors.len() {
            break;
        }

        let color_idx = new_idx * 4;
        let old_color_idx = old_idx * 4;
        new_colors[color_idx..color_idx + 4]
            .copy_from_slice(&data.colors[old_color_idx..old_color_idx + 4]);
    }
    
    data.positions = new_positions;
    data.scales = new_scales;
    data.rotations = new_rotations;
    data.colors = new_colors;
}

#[wasm_bindgen]
pub fn radix_sort_simd(data: &mut GSplatData) -> Result<(), JsValue> {
    let count = data.count;
    
    if count * 3 > data.positions.len() ||
       count * 3 > data.scales.len() ||
       count * 4 > data.rotations.len() ||
       count * 4 > data.colors.len() {
        return Err(JsValue::from_str("Invalid input sizes"));
    }
    
    let mut depths = unsafe { 
        compute_depths_simd(&data.positions, &data.model_view, count) 
    };
    let mut indices: Vec<u32> = (0..count as u32).collect();
    
    let mut temp_depths = vec![0i32; count];
    let mut temp_indices = vec![0u32; count];
    
    for shift in (0..32).step_by(8) {
        let mut counts = [0u32; 256];
        
        unsafe { count_frequencies_simd(&depths, shift, &mut counts) };

        let mut total = 0u32;
        for count in counts.iter_mut() {
            let current = *count;
            *count = total;
            total += current;
        }

        unsafe { 
            scatter_elements_simd(
                &depths, 
                &indices, 
                shift, 
                &counts, 
                &mut temp_depths, 
                &mut temp_indices
            ) 
        };
        std::mem::swap(&mut depths, &mut temp_depths);
        std::mem::swap(&mut indices, &mut temp_indices);
    }
    
    unsafe { reorder_attributes_simd(data, &indices) };
    Ok(())
}

#[target_feature(enable = "simd128")]
unsafe fn count_frequencies_simd(depths: &[i32], shift: u32, counts: &mut [u32; 256]) {
    unsafe {
        let mask = i32x4_splat(0xFF);
        
        for chunk in depths.chunks_exact(4) {
            let values = v128_load(chunk.as_ptr() as *const v128);
            let shifted = i32x4_shr(values, shift);
            let bytes = v128_and(shifted as v128, mask);
            
            let mut result = [0i32; 4];
            v128_store(result.as_mut_ptr() as *mut v128, bytes);
            
            for &value in &result {
                counts[value as usize] += 1;
            }
        }
    }
    
    for &depth in depths.chunks_exact(4).remainder() {
        let byte = ((depth >> shift) & 0xFF) as usize;
        counts[byte] += 1;
    }
}

#[target_feature(enable = "simd128")]
unsafe fn scatter_elements_simd(
    depths: &[i32],
    indices: &[u32],
    shift: u32,
    counts: &[u32; 256],
    temp_depths: &mut [i32],
    temp_indices: &mut [u32],
) {
    let mut offsets = counts.to_owned();
    
    for (&depth, &index) in depths.iter().zip(indices.iter()) {
        let byte = ((depth >> shift) & 0xFF) as usize;
        let pos = offsets[byte] as usize;
        
        temp_depths[pos] = depth;
        temp_indices[pos] = index;
        
        offsets[byte] += 1;
    }
}

#[wasm_bindgen]
pub fn radix_sort_gaussians_attrs(
    positions: &Float32Array,
    scales: &Float32Array,
    rotations: &Float32Array,
    colors: &Uint8Array,
    model_view: &Float32Array,
    count: usize,
) -> Result<js_sys::Array, JsValue> {
    if positions.length() as usize != count * 3 
        || scales.length() as usize != count * 3 
        || rotations.length() as usize != count * 4 
        || colors.length() as usize != count * 4 
        || model_view.length() != 16 {
        return Err(JsValue::from_str("Invalid array lengths"));
    }

    //set capacity first
    let positions_vec = positions.to_vec();
    let model_view_vec = model_view.to_vec();

    let mut depth_values = vec![0i32; count];
    let mut max_depth = f32::NEG_INFINITY;
    let mut min_depth = f32::INFINITY;

    for i in 0..count {
        let depth = positions_vec[i * 3] * model_view_vec[2] +
                   positions_vec[i * 3 + 1] * model_view_vec[6] +
                   positions_vec[i * 3 + 2] * model_view_vec[10];
        
        let depth_int = (depth * 4096.0) as i32;
        depth_values[i] = depth_int;
        max_depth = max_depth.max(depth_int as f32);
        min_depth = min_depth.min(depth_int as f32);
    }

    let depth_offset = (-min_depth) as i32;
    for depth in depth_values.iter_mut() {
        *depth += depth_offset;
    }

    let mut indices: Vec<u32> = (0..count as u32).collect();
    let mut temp_depths = vec![0i32; count];
    let mut temp_indices = vec![0u32; count];

    for shift in (0..32).step_by(8) {
        let mut counts = [0u32; 256];

        for &depth in depth_values.iter() {
            let byte = ((depth >> shift) & 0xFF) as usize;
            counts[byte] += 1;
        }

        let mut total = 0;
        for count in counts.iter_mut() {
            let current = *count;
            *count = total;
            total += current;
        }

        for i in 0..count {
            let byte = ((depth_values[i] >> shift) & 0xFF) as usize;
            let pos = counts[byte] as usize;
            counts[byte] += 1;

            temp_depths[pos] = depth_values[i];
            temp_indices[pos] = indices[i];
        }

        depth_values.copy_from_slice(&temp_depths);
        indices.copy_from_slice(&temp_indices);
    }

    let mut new_positions: Vec<f32> = vec![0.0; count * 3];
    let mut new_scales: Vec<f32> = vec![0.0; count * 3];
    let mut new_rotations: Vec<f32> = vec![0.0; count * 4];
    let mut new_colors: Vec<u8> = vec![0; count * 4];

    let scales_vec = scales.to_vec();
    let rotations_vec = rotations.to_vec();
    let colors_vec = colors.to_vec();

    for i in 0..count {
        let j = indices[i] as usize;

        new_positions[i * 3] = positions_vec[j * 3];
        new_positions[i * 3 + 1] = positions_vec[j * 3 + 1];
        new_positions[i * 3 + 2] = positions_vec[j * 3 + 2];

        new_scales[i * 3] = scales_vec[j * 3];
        new_scales[i * 3 + 1] = scales_vec[j * 3 + 1];
        new_scales[i * 3 + 2] = scales_vec[j * 3 + 2];

        new_rotations[i * 4] = rotations_vec[j * 4];
        new_rotations[i * 4 + 1] = rotations_vec[j * 4 + 1];
        new_rotations[i * 4 + 2] = rotations_vec[j * 4 + 2];
        new_rotations[i * 4 + 3] = rotations_vec[j * 4 + 3];

        new_colors[i * 4] = colors_vec[j * 4];
        new_colors[i * 4 + 1] = colors_vec[j * 4 + 1];
        new_colors[i * 4 + 2] = colors_vec[j * 4 + 2];
        new_colors[i * 4 + 3] = colors_vec[j * 4 + 3];
    }

    let new_positions_array = Float32Array::new_with_length(count as u32 * 3);
    new_positions_array.copy_from(&new_positions[..]);

    let new_scales_array = Float32Array::new_with_length(count as u32 * 3);
    new_scales_array.copy_from(&new_scales[..]);

    let new_rotations_array = Float32Array::new_with_length(count as u32 * 4);
    new_rotations_array.copy_from(&new_rotations[..]);

    let new_colors_array = Uint8Array::new_with_length(count as u32 * 4);
    new_colors_array.copy_from(&new_colors[..]);

    let result = js_sys::Array::new();
    result.push(&new_positions_array);
    result.push(&new_scales_array);
    result.push(&new_rotations_array);
    result.push(&new_colors_array);

    Ok(result)
}


#[wasm_bindgen]
pub fn radix_sort_gaussians_indexes(
    positions: &Float32Array,
    model_view: &Float32Array,
    texture_width: u32,
    count: usize,
) -> Result<js_sys::Uint32Array, JsValue> {
    if positions.length() as usize != count * 3 {
        return Err(JsValue::from_str("Invalid positions length"));
    }
    if model_view.length() != 16 {
        return Err(JsValue::from_str("Invalid model_view length"));
    }

    let positions_vec = positions.to_vec();
    let model_view_vec = model_view.to_vec();
    let mut depth_values = vec![0i32; count];
    let mut max_depth = f32::NEG_INFINITY;
    let mut min_depth = f32::INFINITY;

    for i in 0..count {
        let depth = positions_vec[i * 3] * model_view_vec[2] +
                   positions_vec[i * 3 + 1] * model_view_vec[6] +
                   positions_vec[i * 3 + 2] * model_view_vec[10];

        let depth_int = (depth * 4096.0) as i32;
        depth_values[i] = depth_int;
        max_depth = max_depth.max(depth_int as f32);
        min_depth = min_depth.min(depth_int as f32);
    }

    let depth_offset = (-min_depth) as i32;
    for depth in depth_values.iter_mut() {
        *depth += depth_offset;
    }

    let mut indices: Vec<u32> = (0..count as u32).collect();
    let mut temp_depths = vec![0i32; count];
    let mut temp_indices = vec![0u32; count];

    for shift in (0..32).step_by(8) {
        let mut counts = [0u32; 256];
        
        for &depth in depth_values.iter() {
            let byte = ((depth >> shift) & 0xFF) as usize;
            counts[byte] += 1;
        }

        let mut total = 0;
        for count in counts.iter_mut() {
            let current = *count;
            *count = total;
            total += current;
        }

        for i in 0..count {
            let byte = ((depth_values[i] >> shift) & 0xFF) as usize;
            let pos = counts[byte] as usize;
            counts[byte] += 1;

            temp_depths[pos] = depth_values[i];
            temp_indices[pos] = indices[i];
        }

        depth_values.copy_from_slice(&temp_depths);
        indices.copy_from_slice(&temp_indices);
    }

    let indices_array = Uint32Array::new_with_length(count as u32);
    indices_array.copy_from(&indices);
    
    Ok(indices_array)
}

#[wasm_bindgen]
pub fn radix_sort_gaussians_indexes_simd(
    positions: &Float32Array,
    model_view: &Float32Array,
    texture_width: u32,
    count: usize,
) -> Result<js_sys::Uint32Array, JsValue> {
    if positions.length() as usize != count * 3 || model_view.length() != 16 {
        return Err(JsValue::from_str("Invalid input lengths"));
    }

    let positions_vec = positions.to_vec();
    let mv = model_view.to_vec();
    
    // Convert positions to SIMD vectors
    let mv_row = v128_load(&[mv[2], mv[6], mv[10], 0.0]);
    let mut depth_values = vec![0i32; count];
    let mut max_depth = f32::NEG_INFINITY;
    let mut min_depth = f32::INFINITY;

    // Process 4 points at a time
    for chunk in (0..count).step_by(4) {
        let remaining = count - chunk;
        if remaining >= 4 {
            let pos0 = v128_load(&positions_vec[chunk * 3..]);
            let pos1 = v128_load(&positions_vec[chunk * 3 + 4..]);
            let pos2 = v128_load(&positions_vec[chunk * 3 + 8..]);
            
            // Compute depths using SIMD dot product
            let depths = f32x4_dot_product(
                v128_shuffle::<0, 1, 2, 2>(pos0, pos1),
                mv_row
            );
            
            // Convert to fixed point and store
            let depth_ints = f32x4_convert_to_i32x4(f32x4_mul(depths, f32x4_splat(4096.0)));
            depth_values[chunk..chunk + 4].copy_from_slice(&i32x4_extract_values(depth_ints));
            
            // Update min/max using SIMD
            max_depth = f32x4_extract_lane::<0>(f32x4_max(f32x4_splat(max_depth), depths));
            min_depth = f32x4_extract_lane::<0>(f32x4_min(f32x4_splat(min_depth), depths));
        } else {
            // Handle remaining points sequentially
            for i in chunk..count {
                let depth = positions_vec[i * 3] * mv[2] +
                           positions_vec[i * 3 + 1] * mv[6] +
                           positions_vec[i * 3 + 2] * mv[10];
                depth_values[i] = (depth * 4096.0) as i32;
                max_depth = max_depth.max(depth);
                min_depth = min_depth.min(depth);
            }
        }
    }

    let depth_offset = (-min_depth * 4096.0) as i32;
    for depth in depth_values.iter_mut() {
        *depth += depth_offset;
    }

    let mut indices: Vec<u32> = (0..count as u32).collect();
    let mut temp_depths = vec![0i32; count];
    let mut temp_indices = vec![0u32; count];

    for shift in (0..32).step_by(8) {
        let mut counts = [0u32; 256];

        for chunk in depth_values.chunks(4) {
            let depths = if chunk.len() == 4 {
                i32x4_load(chunk)
            } else {
                let mut padded = [0i32; 4];
                padded[..chunk.len()].copy_from_slice(chunk);
                i32x4_load(&padded)
            };
            
           // let bytes = i32x4_shr(depths, i32x4_splat(shift));
          //  let masked = v128_and(bytes, i32x4_splat(0xFF));
            
            // i8x16_extract_lane::<0>()
            // let b1 = i32x4_extract_lane::<0>(masked) & 0xFF;
            // let b2 = i32x4_extract_lane::<0>(masked) & 0xFF;
            // let b3 = i32x4_extract_lane::<0>(masked) & 0xFF;
            // let b4 = i32x4_extract_lane::<0>(masked) & 0xFF;
            // counts[b1] += 1;
            // counts[b2] += 1;
            // counts[b3] += 1;
            // counts[b4] += 1;
            // for i in 0..chunk.len() {
            //     let byte = i32x4_extract_lane::<0>(i32x4_shuffle::<i, i, i, i>(masked, masked)) as usize;
            //     counts[byte] += 1;
            // }
        }

        let mut total = 0;
        for count in counts.iter_mut() {
            let current = *count;
            *count = total;
            total += current;
        }

        for i in 0..count {
            let byte = ((depth_values[i] >> shift) & 0xFF) as usize;
            let pos = counts[byte] as usize;
            counts[byte] += 1;

            temp_depths[pos] = depth_values[i];
            temp_indices[pos] = indices[i];
        }

        depth_values.copy_from_slice(&temp_depths);
        indices.copy_from_slice(&temp_indices);
    }

    let indices_array = Uint32Array::new_with_length(count as u32);
    indices_array.copy_from(&indices);
    Ok(indices_array)
}

#[inline]
fn v128_load(slice: &[f32]) -> v128 {
    unsafe { v128_load(slice.as_ptr() as *const v128) }
}

#[inline]
fn i32x4_load(slice: &[i32]) -> v128 {
    unsafe { v128_load(slice.as_ptr() as *const v128) }
}

#[inline]
fn f32x4_dot_product(a: v128, b: v128) -> v128 {
    unsafe {
        let mul = f32x4_mul(a, b);
        f32x4_add(
            f32x4_add(
                f32x4_extract_lane::<0>(mul),
                f32x4_extract_lane::<1>(mul)
            ),
            f32x4_add(
                f32x4_extract_lane::<2>(mul),
                f32x4_extract_lane::<3>(mul)
            )
        )
    }
}

#[inline]
fn i32x4_extract_values(v: v128) -> [i32; 4] {
    unsafe {
        [
            i32x4_extract_lane::<0>(v),
            i32x4_extract_lane::<1>(v),
            i32x4_extract_lane::<2>(v),
            i32x4_extract_lane::<3>(v)
        ]
    }
}

#[wasm_bindgen(js_name = "GaussianSorter")]
pub struct GaussianSorter {
    indices: Vec<u32>,
    temp_indices: Vec<u32>,
    depth_values: Vec<i32>,
    counts: [u32; 256],
    temp_positions: Vec<f32>,
    temp_scales: Vec<f32>,
    temp_rotations: Vec<f32>,
    temp_colors: Vec<u8>,
}

#[wasm_bindgen(js_class = "GaussianSorter")]
impl GaussianSorter {
    #[wasm_bindgen(constructor)]
    pub fn new(max_count: usize) -> Self {
        Self {
            indices: Vec::with_capacity(max_count),
            temp_indices: vec![0u32; max_count],
            depth_values: vec![0i32; max_count],
            counts: [0u32; 256],
            temp_positions: vec![0.0; max_count * 3],
            temp_scales: vec![0.0; max_count * 3],
            temp_rotations: vec![0.0; max_count * 4],
            temp_colors: vec![0; max_count * 4],
        }
    }

    //"in-place" attempt, memory buffer is in the wrong context
    #[wasm_bindgen(js_name = "sortGaussians")]
    pub fn sort_gaussians(
        &mut self,
        memory_buffer: &[u8],
        positions_offset: u32,
        scales_offset: u32,
        rotations_offset: u32,
        colors_offset: u32,
        model_view: &[f32],
        count: usize,
    ) -> Result<(), JsValue> {
        let positions = unsafe { std::slice::from_raw_parts(
            memory_buffer.as_ptr().add(positions_offset as usize) as *const f32,
            count * 3
        )};
        let scales = unsafe { std::slice::from_raw_parts(
            memory_buffer.as_ptr().add(scales_offset as usize) as *const f32,
            count * 3
        )};
        let rotations = unsafe { std::slice::from_raw_parts(
            memory_buffer.as_ptr().add(rotations_offset as usize) as *const f32,
            count * 4
        )};
        let colors = unsafe { std::slice::from_raw_parts(
            memory_buffer.as_ptr().add(colors_offset as usize) as *const u8,
            count * 4
        )};

        let mv2 = model_view[2];
        let mv6 = model_view[6];
        let mv10 = model_view[10];
        let mv14 = model_view[14];

        let mut max_depth = f32::NEG_INFINITY;
        let mut min_depth = f32::INFINITY;

        for i in 0..count {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];
            
            let depth = x * mv2 + y * mv6 + z * mv10 + mv14;
            let depth_int = (depth * 4096.0) as i32;
            self.depth_values[i] = depth_int;
            max_depth = max_depth.max(depth_int as f32);
            min_depth = min_depth.min(depth_int as f32);
        }

        self.indices.clear();
        self.indices.extend(0..count as u32);

        for shift in (0..32).step_by(8) {
            self.counts.fill(0);

            for &depth in self.depth_values.iter().take(count) {
                let byte = ((depth >> shift) & 0xFF) as usize;
                self.counts[byte] += 1;
            }

            let mut total = 0;
            for count in self.counts.iter_mut() {
                let current = *count;
                *count = total;
                total += current;
            }

            for i in 0..count {
                let byte = ((self.depth_values[i] >> shift) & 0xFF) as usize;
                let pos = self.counts[byte] as usize;
                self.counts[byte] += 1;
                self.temp_indices[pos] = self.indices[i];
            }

            self.indices[..count].copy_from_slice(&self.temp_indices[..count]);
        }

        for i in 0..count {
            let j = self.indices[i] as usize;
            self.temp_positions[i * 3..(i + 1) * 3].copy_from_slice(&positions[j * 3..(j + 1) * 3]);
            self.temp_scales[i * 3..(i + 1) * 3].copy_from_slice(&scales[j * 3..(j + 1) * 3]);
            self.temp_rotations[i * 4..(i + 1) * 4].copy_from_slice(&rotations[j * 4..(j + 1) * 4]);
            self.temp_colors[i * 4..(i + 1) * 4].copy_from_slice(&colors[j * 4..(j + 1) * 4]);
        }

        let positions_out = unsafe { std::slice::from_raw_parts_mut(
            memory_buffer.as_ptr().add(positions_offset as usize) as *mut f32,
            count * 3
        )};
        let scales_out = unsafe { std::slice::from_raw_parts_mut(
            memory_buffer.as_ptr().add(scales_offset as usize) as *mut f32,
            count * 3
        )};
        let rotations_out = unsafe { std::slice::from_raw_parts_mut(
            memory_buffer.as_ptr().add(rotations_offset as usize) as *mut f32,
            count * 4
        )};
        let colors_out = unsafe { std::slice::from_raw_parts_mut(
            memory_buffer.as_ptr().add(colors_offset as usize) as *mut u8,
            count * 4
        )};

        positions_out.copy_from_slice(&self.temp_positions[..count * 3]);
        scales_out.copy_from_slice(&self.temp_scales[..count * 3]);
        rotations_out.copy_from_slice(&self.temp_rotations[..count * 4]);
        colors_out.copy_from_slice(&self.temp_colors[..count * 4]);

        Ok(())
    }
}