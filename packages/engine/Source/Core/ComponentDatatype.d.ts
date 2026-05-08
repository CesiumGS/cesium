declare enum ComponentDatatype {
  BYTE = 0x1400,
  UNSIGNED_BYTE = 0x1401,
  SHORT = 0x1402,
  UNSIGNED_SHORT = 0x1403,
  INT = 0x1404,
  UNSIGNED_INT = 0x1405,
  FLOAT = 0x1406,
  DOUBLE = 0x140a,
}

declare namespace ComponentDatatype {
  /**
   * Converts a single normalized integer value to a floating-point value in
   * the range [-1, 1] (for signed types) or [0, 1] (for unsigned types),
   * following the WebGL and glTF normalization conventions.
   *
   * @param value - The integer value to dequantize.
   * @param componentDatatype - The component datatype of the value.
   * @returns The dequantized floating-point value.
   */
  function dequantize(
    value: number,
    componentDatatype: ComponentDatatype,
  ): number;
  function createTypedArray(
    componentDatatype: ComponentDatatype,
    valuesOrLength: number | ArrayLike<number>,
  ):
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;
}

export default ComponentDatatype;
