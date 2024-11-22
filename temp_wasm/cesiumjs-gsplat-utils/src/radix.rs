use wasm_bindgen::prelude::*;
mod radix_simd;

#[wasm_bindgen]
impl radix_simd::GSplatData {
    pub fn radix_sort(&mut self) {
        // Calculate depths and store as integers
        let mut depth_values: Vec<i32> = Vec::with_capacity(self.count);
        let mut max_depth = f32::NEG_INFINITY;
        let mut min_depth = f32::INFINITY;

        // Helper closure to calculate depth
        let calc_depth = |i: usize| -> f32 {
            let pos_idx = i * 3;
            self.positions[pos_idx] * self.model_view[2] +
            self.positions[pos_idx + 1] * self.model_view[6] +
            self.positions[pos_idx + 2] * self.model_view[10]
        };

        // Calculate initial depths
        for i in 0..self.count {
            let depth = (calc_depth(i) * 4096.0) as i32;
            depth_values.push(depth);
            max_depth = max_depth.max(depth as f32);
            min_depth = min_depth.min(depth as f32);
        }

        // Normalize depths to positive values
        let depth_offset = (-min_depth as i32);
        for depth in depth_values.iter_mut() {
            *depth += depth_offset;
        }

        // Create index array to track original positions
        let mut indices: Vec<u32> = (0..self.count as u32).collect();

        // Temporary arrays for radix sort
        let mut temp_depths = vec![0i32; self.count];
        let mut temp_indices = vec![0u32; self.count];

        // Sort for each byte (4 bytes for 32-bit integer)
        for shift in (0..32).step_by(8) {
            let mut counts = [0u32; 256];

            // Count frequencies
            for &depth in depth_values.iter() {
                let byte = ((depth >> shift) & 0xFF) as usize;
                counts[byte] += 1;
            }

            // Calculate starting positions
            let mut total = 0;
            for count in counts.iter_mut() {
                let current = *count;
                *count = total;
                total += current;
            }

            // Move items to correct position
            for i in 0..self.count {
                let byte = ((depth_values[i] >> shift) & 0xFF) as usize;
                let pos = counts[byte] as usize;
                counts[byte] += 1;

                temp_depths[pos] = depth_values[i];
                temp_indices[pos] = indices[i];
            }

            // Copy back
            depth_values.copy_from_slice(&temp_depths);
            indices.copy_from_slice(&temp_indices);
        }

        // Create new arrays for sorted data
        let mut new_positions = vec![0.0f32; self.positions.len()];
        let mut new_scales = vec![0.0f32; self.scales.len()];
        let mut new_rotations = vec![0.0f32; self.rotations.len()];
        let mut new_colors = vec![0.0f32; self.colors.len()];

        // Rearrange attribute arrays based on sorted indices
        for (i, &idx) in indices.iter().enumerate() {
            let j = idx as usize;

            // Copy positions (3 components)
            let pos_i = i * 3;
            let pos_j = j * 3;
            new_positions[pos_i] = self.positions[pos_j];
            new_positions[pos_i + 1] = self.positions[pos_j + 1];
            new_positions[pos_i + 2] = self.positions[pos_j + 2];

            // Copy scales (3 components)
            let scale_i = i * 3;
            let scale_j = j * 3;
            new_scales[scale_i] = self.scales[scale_j];
            new_scales[scale_i + 1] = self.scales[scale_j + 1];
            new_scales[scale_i + 2] = self.scales[scale_j + 2];

            // Copy rotations (4 components)
            let rot_i = i * 4;
            let rot_j = j * 4;
            new_rotations[rot_i] = self.rotations[rot_j];
            new_rotations[rot_i + 1] = self.rotations[rot_j + 1];
            new_rotations[rot_i + 2] = self.rotations[rot_j + 2];
            new_rotations[rot_i + 3] = self.rotations[rot_j + 3];

            // Copy colors (4 components)
            let color_i = i * 4;
            let color_j = j * 4;
            new_colors[color_i] = self.colors[color_j];
            new_colors[color_i + 1] = self.colors[color_j + 1];
            new_colors[color_i + 2] = self.colors[color_j + 2];
            new_colors[color_i + 3] = self.colors[color_j + 3];
        }

        // Update the original arrays with sorted data
        self.positions = new_positions;
        self.scales = new_scales;
        self.rotations = new_rotations;
        self.colors = new_colors;
    }
}