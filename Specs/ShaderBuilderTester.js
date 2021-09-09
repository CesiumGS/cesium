export default function ShaderBuilderTester() {}

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

ShaderBuilderTester.expectHasVertexFunction = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines
) {
  expectHasLine(shaderBuilder._vertexShaderParts.functionIds, functionId);
  var func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expectEqualUnordered(func.body, bodyLines);
};

ShaderBuilderTester.expectHasFragmentFunction = function (
  shaderBuilder,
  functionId,
  signature,
  bodyLines
) {
  expectHasLine(shaderBuilder._fragmentShaderParts.functionIds, functionId);
  var func = shaderBuilder._functions[functionId];

  expect(func.signature).toEqual(signature);
  expectEqualUnordered(func.body, bodyLines);
};
