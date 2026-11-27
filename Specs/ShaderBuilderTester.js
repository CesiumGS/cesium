function ShaderBuilderTester() {}

function expectHasLine(linesArray, line) {
  expect(linesArray.indexOf(line)).not.toBe(-1);
}

// In practice, most of the dynamically generated GLSL code is generated
// in an arbitrary order, so check only that they have the same set of lines.
// For shaders, the elements will usually be unique. But this is not assumed
// to be the case here.
function expectEqualUnordered(array1, array2) {
  const getFrequencies = (array) => {
    const map = new Map();
    for (const element of array) {
      map.set(element, (map.get(element) || 0) + 1);
    }
    return map;
  };
  const counts1 = getFrequencies(array1);
  const counts2 = getFrequencies(array2);

  for (const [element, count2] of counts2.entries()) {
    const actualCount = counts1.get(element) || 0;
    if (actualCount !== count2) {
      fail(
        `Expected element '${element}' to appear ${count2} time(s), ` +
          `but it appeared ${actualCount} time(s).\n` +
          `array1: [${array1}]\n` +
          `array2: [${array2}]`,
      );
      return;
    }
  }
  for (const [element, count1] of counts1.entries()) {
    if (!counts2.has(element)) {
      fail(
        `Found unexpected element '${element}' appearing ${count1} time(s) in array1.\n` +
          `array1: [${array1}]\n` +
          `array2: [${array2}]`,
      );
      return;
    }
  }
}

ShaderBuilderTester.expectHasAttributes = function (
  shaderBuilder,
  positionAttributeLine,
  expectedAttributeLines,
) {
  expect(shaderBuilder._positionAttributeLine).toEqual(positionAttributeLine);
  expectEqualUnordered(shaderBuilder._attributeLines, expectedAttributeLines);
};

ShaderBuilderTester.expectHasVertexDefines = function (
  shaderBuilder,
  expectedDefines,
) {
  expectEqualUnordered(
    shaderBuilder._vertexShaderParts.defineLines,
    expectedDefines,
  );
};

ShaderBuilderTester.expectHasFragmentDefines = function (
  shaderBuilder,
  expectedDefines,
) {
  expectEqualUnordered(
    shaderBuilder._fragmentShaderParts.defineLines,
    expectedDefines,
  );
};

ShaderBuilderTester.expectHasVertexUniforms = function (
  shaderBuilder,
  expectedUniforms,
) {
  expectEqualUnordered(
    shaderBuilder._vertexShaderParts.uniformLines,
    expectedUniforms,
  );
};

ShaderBuilderTester.expectHasFragmentUniforms = function (
  shaderBuilder,
  expectedUniforms,
) {
  expectEqualUnordered(
    shaderBuilder._fragmentShaderParts.uniformLines,
    expectedUniforms,
  );
};

ShaderBuilderTester.expectVertexVaryings = function (
  shaderBuilder,
  expectedVaryingLines,
) {
  expectEqualUnordered(
    shaderBuilder._vertexShaderParts.varyingLines,
    expectedVaryingLines,
  );
};

ShaderBuilderTester.expectFragmentVaryings = function (
  shaderBuilder,
  expectedVaryingLines,
) {
  expectEqualUnordered(
    shaderBuilder._fragmentShaderParts.varyingLines,
    expectedVaryingLines,
  );
};

ShaderBuilderTester.expectHasVertexStructIds = function (
  shaderBuilder,
  expectedStructIds,
) {
  expect(shaderBuilder._vertexShaderParts.structIds).toEqual(expectedStructIds);
};

ShaderBuilderTester.expectHasVertexStruct = function (
  shaderBuilder,
  structId,
  structName,
  expectedFields,
) {
  expectHasLine(shaderBuilder._vertexShaderParts.structIds, structId);
  const struct = shaderBuilder._structs[structId];

  expect(struct.name).toEqual(structName);
  expectEqualUnordered(struct.fields, expectedFields);
};

ShaderBuilderTester.expectHasFragmentStructIds = function (
  shaderBuilder,
  expectedStructIds,
) {
  expect(shaderBuilder._fragmentShaderParts.structIds).toEqual(
    expectedStructIds,
  );
};

ShaderBuilderTester.expectHasFragmentStruct = function (
  shaderBuilder,
  structId,
  structName,
  expectedFields,
) {
  expectHasLine(shaderBuilder._fragmentShaderParts.structIds, structId);
  const struct = shaderBuilder._structs[structId];

  expect(struct.name).toEqual(structName);
  expectEqualUnordered(struct.fields, expectedFields);
};

ShaderBuilderTester.expectHasVertexFunctionIds = function (
  shaderBuilder,
  expectedFunctionIds,
) {
  expect(shaderBuilder._vertexShaderParts.functionIds).toEqual(
    expectedFunctionIds,
  );
};

ShaderBuilderTester.expectHasVertexFunction = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines,
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
  bodyLines,
) {
  expectHasLine(shaderBuilder._vertexShaderParts.functionIds, functionId);
  const func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expectEqualUnordered(func.body, bodyLines);
};

ShaderBuilderTester.expectHasFragmentFunctionIds = function (
  shaderBuilder,
  expectedFunctionIds,
) {
  expect(shaderBuilder._fragmentShaderParts.functionIds).toEqual(
    expectedFunctionIds,
  );
};

ShaderBuilderTester.expectHasFragmentFunction = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines,
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
  bodyLines,
) {
  expectHasLine(shaderBuilder._fragmentShaderParts.functionIds, functionId);
  const func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expectEqualUnordered(func.body, bodyLines);
};

ShaderBuilderTester.expectVertexLinesContains = function (
  shaderBuilder,
  expectedString,
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
  expectedVertexLines,
) {
  expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual(
    expectedVertexLines,
  );
};

ShaderBuilderTester.expectFragmentLinesContains = function (
  shaderBuilder,
  expectedString,
) {
  const lines = shaderBuilder._fragmentShaderParts.shaderLines;
  for (let i = 0; i < lines; i++) {
    const line = lines[i];
    expect(line.indexOf(expectedString)).toBeGreaterThan(-1);
  }
};

ShaderBuilderTester.expectFragmentLinesEqual = function (
  shaderBuilder,
  expectedFragmentLines,
) {
  expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual(
    expectedFragmentLines,
  );
};

export default ShaderBuilderTester;
