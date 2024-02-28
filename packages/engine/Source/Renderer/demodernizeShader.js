/**
 * Transpiles a [GLSL 3.00]{@link https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf}
 * shader to a [GLSL 1.00]{@link https://registry.khronos.org/OpenGL/specs/es/2.0/GLSL_ES_Specification_1.00.pdf} shader.
 *
 * This function does not aim to provide a comprehensive transpilation from GLSL 3.00 to GLSL 1.00; only the functionality
 * used within the CesiumJS shaders is supported.
 *
 * @private
 *
 * @param {string} input The GLSL 3.00 shader.
 * @param {boolean} isFragmentShader True if the shader is a fragment shader.
 *
 * @return {string}
 */
function demodernizeShader(input, isFragmentShader) {
  let output = input;

  // Remove version string got GLSL 3.00.
  output = output.replaceAll(`version 300 es`, ``);

  // Replace all texture calls with texture2D
  output = output.replaceAll(
    /(texture\()/g,
    `texture2D(` // Trailing ')' is included in the match group.
  );

  if (isFragmentShader) {
    // Replace the in with varying.
    output = output.replaceAll(
      /\n\s*(in)\s+(vec\d|mat\d|float)/g,
      `\nvarying $2`
    );

    if (/out_FragData_(\d+)/.test(output)) {
      output = `#extension GL_EXT_draw_buffers : enable\n${output}`;

      // Remove all layout declarations for out_FragData.
      output = output.replaceAll(
        /layout\s+\(location\s*=\s*\d+\)\s*out\s+vec4\s+out_FragData_\d+;/g,
        ``
      );

      // Replace out_FragData with gl_FragData.
      output = output.replaceAll(/out_FragData_(\d+)/g, `gl_FragData[$1]`);
    }

    // Remove all layout declarations for out_FragColor.
    output = output.replaceAll(
      /layout\s+\(location\s*=\s*0\)\s*out\s+vec4\s+out_FragColor;/g,
      ``
    );

    // Replace out_FragColor with gl_FragColor.
    output = output.replaceAll(/out_FragColor/g, `gl_FragColor`);
    output = output.replaceAll(/out_FragColor\[(\d+)\]/g, `gl_FragColor[$1]`);

    if (/gl_FragDepth/.test(output)) {
      output = `#extension GL_EXT_frag_depth : enable\n${output}`;
      // Replace gl_FragDepth with gl_FragDepthEXT.
      output = output.replaceAll(/gl_FragDepth/g, `gl_FragDepthEXT`);
    }

    // Enable the OES_standard_derivatives extension
    output = `#ifdef GL_OES_standard_derivatives\n#extension GL_OES_standard_derivatives : enable\n#endif\n${output}`;
  } else {
    // Replace the in with attribute.
    output = output.replaceAll(/(in)\s+(vec\d|mat\d|float)/g, `attribute $2`);

    // Replace the out with varying.
    output = output.replaceAll(
      /(out)\s+(vec\d|mat\d|float)\s+([\w]+);/g,
      `varying $2 $3;`
    );
  }

  // Add version string for GLSL 1.00.
  output = `#version 100\n${output}`;

  return output;
}

export default demodernizeShader;
