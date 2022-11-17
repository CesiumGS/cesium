function ShaderBuilderTester() {}

function expectHasLine(linesArray, line) {
  expect(linesArray.indexOf(line)).not.toBe(-1);
}

// In practice, most of the dynamically generated GLSL code is generated
// in an arbitrary order, so check only that they have the same set of lines.
function expectEqualUnordered(array1, array2) {
  // slice in case other tests do expect lines in a particular order.
  expect(array1.slice().sort()).toEqual(array2.slice().sort());
}

ShaderBuilderTester.expectHasAttributes = function (
  shaderBuilder,
  positionAttributeLine,
  expectedAttributeLines
) {
  expect(shaderBuilder._positionAttributeLine).toEqual(positionAttributeLine);
  expectEqualUnordered(shaderBuilder._attributeLines, expectedAttributeLines);
};

ShaderBuilderTester.expectHasVertexDefines = function (
  shaderBuilder,
  expectedDefines
) {
  expectEqualUnordered(
    shaderBuilder._vertexShaderParts.defineLines,
    expectedDefines
  );
};

ShaderBuilderTester.expectHasFragmentDefines = function (
  shaderBuilder,
  expectedDefines
) {
  expectEqualUnordered(
    shaderBuilder._fragmentShaderParts.defineLines,
    expectedDefines
  );
};

ShaderBuilderTester.expectHasVertexUniforms = function (
  shaderBuilder,
  expectedUniforms
) {
  expectEqualUnordered(
    shaderBuilder._vertexShaderParts.uniformLines,
    expectedUniforms
  );
};

ShaderBuilderTester.expectHasFragmentUniforms = function (
  shaderBuilder,
  expectedUniforms
) {
  expectEqualUnordered(
    shaderBuilder._fragmentShaderParts.uniformLines,
    expectedUniforms
  );
};

ShaderBuilderTester.expectHasVaryings = function (
  shaderBuilder,
  expectedVaryings
) {
  expectEqualUnordered(
    shaderBuilder._vertexShaderParts.varyingLines,
    expectedVaryings.map((varying) => `out ${varying}`)
  );
  expectEqualUnordered(
    shaderBuilder._fragmentShaderParts.varyingLines,
    expectedVaryings.map((varying) => `in ${varying}`)
  );
};

ShaderBuilderTester.expectHasVertexStructIds = function (
  shaderBuilder,
  expectedStructIds
) {
  expect(shaderBuilder._vertexShaderParts.structIds).toEqual(expectedStructIds);
};

ShaderBuilderTester.expectHasVertexStruct = function (
  shaderBuilder,
  structId,
  structName,
  expectedFields
) {
  expectHasLine(shaderBuilder._vertexShaderParts.structIds, structId);
  const struct = shaderBuilder._structs[structId];

  expect(struct.name).toEqual(structName);
  expectEqualUnordered(struct.fields, expectedFields);
};

ShaderBuilderTester.expectHasFragmentStructIds = function (
  shaderBuilder,
  expectedStructIds
) {
  expect(shaderBuilder._fragmentShaderParts.structIds).toEqual(
    expectedStructIds
  );
};

ShaderBuilderTester.expectHasFragmentStruct = function (
  shaderBuilder,
  structId,
  structName,
  expectedFields
) {
  expectHasLine(shaderBuilder._fragmentShaderParts.structIds, structId);
  const struct = shaderBuilder._structs[structId];

  expect(struct.name).toEqual(structName);
  expectEqualUnordered(struct.fields, expectedFields);
};

ShaderBuilderTester.expectHasVertexFunctionIds = function (
  shaderBuilder,
  expectedFunctionIds
) {
  expect(shaderBuilder._vertexShaderParts.functionIds).toEqual(
    expectedFunctionIds
  );
};

ShaderBuilderTester.expectHasVertexFunction = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines
) {
  expectHasLine(shaderBuilder._vertexShaderParts.functionIds, functionId);
  const func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expect(func.body).toEqual(bodyLines);
};

ShaderBuilderTester.expectHasVertexFunctionUnordered = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines
) {
  expectHasLine(shaderBuilder._vertexShaderParts.functionIds, functionId);
  const func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expectEqualUnordered(func.body, bodyLines);
};

ShaderBuilderTester.expectHasFragmentFunctionIds = function (
  shaderBuilder,
  expectedFunctionIds
) {
  expect(shaderBuilder._fragmentShaderParts.functionIds).toEqual(
    expectedFunctionIds
  );
};

ShaderBuilderTester.expectHasFragmentFunction = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines
) {
  expectHasLine(shaderBuilder._fragmentShaderParts.functionIds, functionId);
  const func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expect(func.body).toEqual(bodyLines);
};

ShaderBuilderTester.expectHasFragmentFunctionUnordered = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines
) {
  expectHasLine(shaderBuilder._fragmentShaderParts.functionIds, functionId);
  const func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expectEqualUnordered(func.body, bodyLines);
};

ShaderBuilderTester.expectVertexLinesContains = function (
  shaderBuilder,
  expectedString
) {
  let hasLine = false;
  const lines = shaderBuilder._vertexShaderParts.shaderLines;
  const length = lines.length;
  for (let i = 0; i < length; i++) {
    const line = lines[i];
    if (line.indexOf(expectedString) > -1) {
      hasLine = true;
      break;
    }
  }

  expect(hasLine).toBe(true);
};

ShaderBuilderTester.expectVertexLinesEqual = function (
  shaderBuilder,
  expectedVertexLines
) {
  expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual(
    expectedVertexLines
  );
};

ShaderBuilderTester.expectFragmentLinesContains = function (
  shaderBuilder,
  expectedString
) {
  const lines = shaderBuilder._fragmentShaderParts.shaderLines;
  for (let i = 0; i < lines; i++) {
    const line = lines[i];
    expect(line.indexOf(expectedString)).toBeGreaterThan(-1);
  }
};

ShaderBuilderTester.expectFragmentLinesEqual = function (
  shaderBuilder,
  expectedFragmentLines
) {
  expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual(
    expectedFragmentLines
  );
};

export default ShaderBuilderTester;
