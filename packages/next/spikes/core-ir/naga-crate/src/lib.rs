// The API the engine needs from naga, and nothing else (plan §13.42):
// validate WGSL as WebGPU would (not with every capability on, as the
// third-party naga-wasm does), write GLSL ES 3.00 for the WebGL 2 renderer,
// and write SPIR-V (the stable bridge the WGSL front end reads). NOT BUILT;
// written against naga 30.0.2's documented API.

use naga::back::{glsl, spv};
use naga::valid::{Capabilities, ValidationFlags, Validator};
use wasm_bindgen::prelude::*;

fn parse_and_validate(source: &str) -> Result<(naga::Module, naga::valid::ModuleInfo), JsError> {
    let module = naga::front::wgsl::parse_str(source)
        .map_err(|e| JsError::new(&e.emit_to_string(source)))?;
    // WebGPU core: no f64, no push constants, no extensions beyond what a
    // browser enables. Tint's uniformity analysis still isn't naga's.
    let info = Validator::new(ValidationFlags::all(), Capabilities::empty())
        .validate(&module)
        .map_err(|e| JsError::new(&e.emit_to_string(source)))?;
    Ok((module, info))
}

/// Validates WGSL; returns "" or the formatted error.
#[wasm_bindgen]
pub fn validate_wgsl(source: &str) -> String {
    match parse_and_validate(source) {
        Ok(_) => String::new(),
        Err(e) => format!("{:?}", JsValue::from(e)),
    }
}

/// GLSL ES 3.00 for WebGL 2, for one entry point.
#[wasm_bindgen]
pub fn wgsl_to_glsl_es300(source: &str, entry_point: &str, fragment: bool) -> Result<String, JsError> {
    let (module, info) = parse_and_validate(source)?;
    let options = glsl::Options {
        version: glsl::Version::Embedded { version: 300, is_webgl: true },
        ..Default::default()
    };
    let pipeline = glsl::PipelineOptions {
        shader_stage: if fragment { naga::ShaderStage::Fragment } else { naga::ShaderStage::Vertex },
        entry_point: entry_point.to_string(),
        multiview: None,
    };
    let mut out = String::new();
    let mut writer = glsl::Writer::new(
        &mut out,
        &module,
        &info,
        &options,
        &pipeline,
        naga::proc::BoundsCheckPolicies::default(),
    )
    .map_err(|e| JsError::new(&e.to_string()))?;
    writer.write().map_err(|e| JsError::new(&e.to_string()))?;
    Ok(out)
}

/// SPIR-V words with debug names, for the WGSL front end of the core IR.
#[wasm_bindgen]
pub fn wgsl_to_spirv(source: &str) -> Result<Vec<u32>, JsError> {
    let (module, info) = parse_and_validate(source)?;
    let mut options = spv::Options::default();
    options.flags |= spv::WriterFlags::DEBUG;
    spv::write_vec(&module, &info, &options, None).map_err(|e| JsError::new(&e.to_string()))
}

/// naga's own IR as JSON (unstable across naga's quarterly majors).
#[cfg(feature = "ir-json")]
#[wasm_bindgen]
pub fn wgsl_to_ir_json(source: &str) -> Result<String, JsError> {
    let (module, _) = parse_and_validate(source)?;
    serde_json::to_string(&module).map_err(|e| JsError::new(&e.to_string()))
}
