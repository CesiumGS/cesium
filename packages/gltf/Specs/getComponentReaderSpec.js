import { ComponentDatatype } from "@cesium/core";
import { getComponentReader } from "../index.js";

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

describe("getComponentReader", function () {
  it("reads values", function () {
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
