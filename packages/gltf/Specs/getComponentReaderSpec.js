"use strict";
const Cesium = require("cesium");
const { getComponentReader } = require("@gltf-pipeline/core");

const ComponentDatatype = Cesium.ComponentDatatype;

function testComponentReader(componentType) {
  const typedArray = ComponentDatatype.createTypedArray(
    componentType,
    [0, 1, 2],
  );
  const dataView = new DataView(typedArray.buffer);
  const componentTypeByteLength =
    ComponentDatatype.getSizeInBytes(componentType);
  const componentReader = getComponentReader(componentType);
  const byteOffset = componentTypeByteLength;
  const numberOfComponents = 2;
  const result = new Array(numberOfComponents);
  componentReader(
    dataView,
    byteOffset,
    numberOfComponents,
    componentTypeByteLength,
    result,
  );
  expect(result).toEqual([1, 2]);
}

describe("getComponentReader", () => {
  it("reads values", () => {
    testComponentReader(ComponentDatatype.BYTE);
    testComponentReader(ComponentDatatype.UNSIGNED_BYTE);
    testComponentReader(ComponentDatatype.SHORT);
    testComponentReader(ComponentDatatype.UNSIGNED_SHORT);
    testComponentReader(ComponentDatatype.INT);
    testComponentReader(ComponentDatatype.UNSIGNED_INT);
    testComponentReader(ComponentDatatype.FLOAT);
    testComponentReader(ComponentDatatype.DOUBLE);
  });
});
