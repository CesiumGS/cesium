/**
 * Core type definitions for CesiumJS TypeScript conversion
 * These interfaces define the shape of all core Cesium types
 */

// ============================================================================
// Packable Interface - for types that can be serialized to arrays
// ============================================================================
export interface Packable {
  packedLength: number;
}

export interface PackableStatic<T> {
  packedLength: number;
  pack(value: T, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: T): T;
}

// ============================================================================
// Vector Types
// ============================================================================
export interface Cartesian2 {
  x: number;
  y: number;
  clone(result?: Cartesian2): Cartesian2;
  equals(right?: Cartesian2): boolean;
  equalsEpsilon(right?: Cartesian2, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
  toString(): string;
}

export interface Cartesian2Constructor {
  new (x?: number, y?: number): Cartesian2;
  (x?: number, y?: number): Cartesian2;

  packedLength: number;
  ZERO: Cartesian2;
  ONE: Cartesian2;
  UNIT_X: Cartesian2;
  UNIT_Y: Cartesian2;

  fromElements(x: number, y: number, result?: Cartesian2): Cartesian2;
  fromArray(array: number[], startingIndex?: number, result?: Cartesian2): Cartesian2;
  clone(cartesian?: Cartesian2, result?: Cartesian2): Cartesian2 | undefined;
  pack(value: Cartesian2, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Cartesian2): Cartesian2;
  packArray(array: Cartesian2[], result?: number[]): number[];
  unpackArray(array: number[], result?: Cartesian2[]): Cartesian2[];
  maximumComponent(cartesian: Cartesian2): number;
  minimumComponent(cartesian: Cartesian2): number;
  minimumByComponent(first: Cartesian2, second: Cartesian2, result: Cartesian2): Cartesian2;
  maximumByComponent(first: Cartesian2, second: Cartesian2, result: Cartesian2): Cartesian2;
  clamp(value: Cartesian2, min: Cartesian2, max: Cartesian2, result: Cartesian2): Cartesian2;
  magnitudeSquared(cartesian: Cartesian2): number;
  magnitude(cartesian: Cartesian2): number;
  distance(left: Cartesian2, right: Cartesian2): number;
  distanceSquared(left: Cartesian2, right: Cartesian2): number;
  normalize(cartesian: Cartesian2, result: Cartesian2): Cartesian2;
  dot(left: Cartesian2, right: Cartesian2): number;
  cross(left: Cartesian2, right: Cartesian2): number;
  multiplyComponents(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2;
  divideComponents(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2;
  add(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2;
  subtract(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2;
  multiplyByScalar(cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2;
  divideByScalar(cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2;
  negate(cartesian: Cartesian2, result: Cartesian2): Cartesian2;
  abs(cartesian: Cartesian2, result: Cartesian2): Cartesian2;
  lerp(start: Cartesian2, end: Cartesian2, t: number, result: Cartesian2): Cartesian2;
  angleBetween(left: Cartesian2, right: Cartesian2): number;
  mostOrthogonalAxis(cartesian: Cartesian2, result: Cartesian2): Cartesian2;
  equals(left?: Cartesian2, right?: Cartesian2): boolean;
  equalsEpsilon(left?: Cartesian2, right?: Cartesian2, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
}

export interface Cartesian3 {
  x: number;
  y: number;
  z: number;
  clone(result?: Cartesian3): Cartesian3;
  equals(right?: Cartesian3): boolean;
  equalsEpsilon(right?: Cartesian3, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
  toString(): string;
}

export interface Cartesian3Constructor {
  new (x?: number, y?: number, z?: number): Cartesian3;
  (x?: number, y?: number, z?: number): Cartesian3;

  packedLength: number;
  ZERO: Cartesian3;
  ONE: Cartesian3;
  UNIT_X: Cartesian3;
  UNIT_Y: Cartesian3;
  UNIT_Z: Cartesian3;

  fromSpherical(spherical: Spherical, result?: Cartesian3): Cartesian3;
  fromElements(x: number, y: number, z: number, result?: Cartesian3): Cartesian3;
  fromArray(array: number[], startingIndex?: number, result?: Cartesian3): Cartesian3;
  fromCartesian4(cartesian: Cartesian4, result?: Cartesian3): Cartesian3;
  clone(cartesian?: Cartesian3, result?: Cartesian3): Cartesian3 | undefined;
  pack(value: Cartesian3, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Cartesian3): Cartesian3;
  packArray(array: Cartesian3[], result?: number[]): number[];
  unpackArray(array: number[], result?: Cartesian3[]): Cartesian3[];
  maximumComponent(cartesian: Cartesian3): number;
  minimumComponent(cartesian: Cartesian3): number;
  minimumByComponent(first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3;
  maximumByComponent(first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3;
  clamp(value: Cartesian3, min: Cartesian3, max: Cartesian3, result: Cartesian3): Cartesian3;
  magnitudeSquared(cartesian: Cartesian3): number;
  magnitude(cartesian: Cartesian3): number;
  distance(left: Cartesian3, right: Cartesian3): number;
  distanceSquared(left: Cartesian3, right: Cartesian3): number;
  normalize(cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  dot(left: Cartesian3, right: Cartesian3): number;
  cross(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3;
  multiplyComponents(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3;
  divideComponents(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3;
  add(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3;
  subtract(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3;
  multiplyByScalar(cartesian: Cartesian3, scalar: number, result: Cartesian3): Cartesian3;
  divideByScalar(cartesian: Cartesian3, scalar: number, result: Cartesian3): Cartesian3;
  negate(cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  abs(cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  lerp(start: Cartesian3, end: Cartesian3, t: number, result: Cartesian3): Cartesian3;
  angleBetween(left: Cartesian3, right: Cartesian3): number;
  mostOrthogonalAxis(cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  projectVector(a: Cartesian3, b: Cartesian3, result: Cartesian3): Cartesian3;
  midpoint(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3;
  fromDegrees(longitude: number, latitude: number, height?: number, ellipsoid?: Ellipsoid, result?: Cartesian3): Cartesian3;
  fromRadians(longitude: number, latitude: number, height?: number, ellipsoid?: Ellipsoid, result?: Cartesian3): Cartesian3;
  fromDegreesArray(coordinates: number[], ellipsoid?: Ellipsoid, result?: Cartesian3[]): Cartesian3[];
  fromRadiansArray(coordinates: number[], ellipsoid?: Ellipsoid, result?: Cartesian3[]): Cartesian3[];
  fromDegreesArrayHeights(coordinates: number[], ellipsoid?: Ellipsoid, result?: Cartesian3[]): Cartesian3[];
  fromRadiansArrayHeights(coordinates: number[], ellipsoid?: Ellipsoid, result?: Cartesian3[]): Cartesian3[];
  equals(left?: Cartesian3, right?: Cartesian3): boolean;
  equalsEpsilon(left?: Cartesian3, right?: Cartesian3, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
  equalsArray(cartesian: Cartesian3, array: number[], offset: number): boolean;
}

export interface Cartesian4 {
  x: number;
  y: number;
  z: number;
  w: number;
  clone(result?: Cartesian4): Cartesian4;
  equals(right?: Cartesian4): boolean;
  equalsEpsilon(right?: Cartesian4, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
  toString(): string;
}

export interface Cartesian4Constructor {
  new (x?: number, y?: number, z?: number, w?: number): Cartesian4;
  (x?: number, y?: number, z?: number, w?: number): Cartesian4;

  packedLength: number;
  ZERO: Cartesian4;
  ONE: Cartesian4;
  UNIT_X: Cartesian4;
  UNIT_Y: Cartesian4;
  UNIT_Z: Cartesian4;
  UNIT_W: Cartesian4;

  fromElements(x: number, y: number, z: number, w: number, result?: Cartesian4): Cartesian4;
  fromColor(color: Color, result?: Cartesian4): Cartesian4;
  clone(cartesian?: Cartesian4, result?: Cartesian4): Cartesian4 | undefined;
  pack(value: Cartesian4, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Cartesian4): Cartesian4;
  packArray(array: Cartesian4[], result?: number[]): number[];
  unpackArray(array: number[], result?: Cartesian4[]): Cartesian4[];
  fromArray(array: number[], startingIndex?: number, result?: Cartesian4): Cartesian4;
  maximumComponent(cartesian: Cartesian4): number;
  minimumComponent(cartesian: Cartesian4): number;
  minimumByComponent(first: Cartesian4, second: Cartesian4, result: Cartesian4): Cartesian4;
  maximumByComponent(first: Cartesian4, second: Cartesian4, result: Cartesian4): Cartesian4;
  clamp(value: Cartesian4, min: Cartesian4, max: Cartesian4, result: Cartesian4): Cartesian4;
  magnitudeSquared(cartesian: Cartesian4): number;
  magnitude(cartesian: Cartesian4): number;
  distance(left: Cartesian4, right: Cartesian4): number;
  distanceSquared(left: Cartesian4, right: Cartesian4): number;
  normalize(cartesian: Cartesian4, result: Cartesian4): Cartesian4;
  dot(left: Cartesian4, right: Cartesian4): number;
  multiplyComponents(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4;
  divideComponents(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4;
  add(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4;
  subtract(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4;
  multiplyByScalar(cartesian: Cartesian4, scalar: number, result: Cartesian4): Cartesian4;
  divideByScalar(cartesian: Cartesian4, scalar: number, result: Cartesian4): Cartesian4;
  negate(cartesian: Cartesian4, result: Cartesian4): Cartesian4;
  abs(cartesian: Cartesian4, result: Cartesian4): Cartesian4;
  lerp(start: Cartesian4, end: Cartesian4, t: number, result: Cartesian4): Cartesian4;
  mostOrthogonalAxis(cartesian: Cartesian4, result: Cartesian4): Cartesian4;
  equals(left?: Cartesian4, right?: Cartesian4): boolean;
  equalsEpsilon(left?: Cartesian4, right?: Cartesian4, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
}

// ============================================================================
// Geographic Types
// ============================================================================
export interface Cartographic {
  longitude: number;
  latitude: number;
  height: number;
  clone(result?: Cartographic): Cartographic;
  equals(right?: Cartographic): boolean;
  equalsEpsilon(right?: Cartographic, epsilon?: number): boolean;
  toString(): string;
}

export interface CartographicConstructor {
  new (longitude?: number, latitude?: number, height?: number): Cartographic;
  (longitude?: number, latitude?: number, height?: number): Cartographic;

  ZERO: Cartographic;

  fromRadians(longitude: number, latitude: number, height?: number, result?: Cartographic): Cartographic;
  fromDegrees(longitude: number, latitude: number, height?: number, result?: Cartographic): Cartographic;
  fromCartesian(cartesian: Cartesian3, ellipsoid?: Ellipsoid, result?: Cartographic): Cartographic | undefined;
  toCartesian(cartographic: Cartographic, ellipsoid?: Ellipsoid, result?: Cartesian3): Cartesian3;
  clone(cartographic?: Cartographic, result?: Cartographic): Cartographic | undefined;
  equals(left?: Cartographic, right?: Cartographic): boolean;
  equalsEpsilon(left?: Cartographic, right?: Cartographic, epsilon?: number): boolean;
}

export interface Spherical {
  clock: number;
  cone: number;
  magnitude: number;
  clone(result?: Spherical): Spherical;
  equals(right?: Spherical): boolean;
  equalsEpsilon(right?: Spherical, epsilon?: number): boolean;
  toString(): string;
}

// ============================================================================
// Matrix Types
// ============================================================================
export interface Matrix2 {
  length: number;
  clone(result?: Matrix2): Matrix2;
  equals(right?: Matrix2): boolean;
  equalsEpsilon(right?: Matrix2, epsilon?: number): boolean;
  toString(): string;
  [index: number]: number;
}

export interface Matrix3 {
  length: number;
  clone(result?: Matrix3): Matrix3;
  equals(right?: Matrix3): boolean;
  equalsEpsilon(right?: Matrix3, epsilon?: number): boolean;
  toString(): string;
  [index: number]: number;
}

export interface Matrix3Constructor {
  new (column0Row0?: number, column1Row0?: number, column2Row0?: number,
       column0Row1?: number, column1Row1?: number, column2Row1?: number,
       column0Row2?: number, column1Row2?: number, column2Row2?: number): Matrix3;

  packedLength: number;
  IDENTITY: Matrix3;
  ZERO: Matrix3;
  COLUMN0ROW0: number;
  COLUMN0ROW1: number;
  COLUMN0ROW2: number;
  COLUMN1ROW0: number;
  COLUMN1ROW1: number;
  COLUMN1ROW2: number;
  COLUMN2ROW0: number;
  COLUMN2ROW1: number;
  COLUMN2ROW2: number;

  clone(matrix?: Matrix3, result?: Matrix3): Matrix3 | undefined;
  fromArray(array: number[], startingIndex?: number, result?: Matrix3): Matrix3;
  fromColumnMajorArray(values: number[], result?: Matrix3): Matrix3;
  fromRowMajorArray(values: number[], result?: Matrix3): Matrix3;
  fromQuaternion(quaternion: Quaternion, result?: Matrix3): Matrix3;
  fromHeadingPitchRoll(headingPitchRoll: HeadingPitchRoll, result?: Matrix3): Matrix3;
  fromScale(scale: Cartesian3, result?: Matrix3): Matrix3;
  fromUniformScale(scale: number, result?: Matrix3): Matrix3;
  fromCrossProduct(vector: Cartesian3, result?: Matrix3): Matrix3;
  fromRotationX(angle: number, result?: Matrix3): Matrix3;
  fromRotationY(angle: number, result?: Matrix3): Matrix3;
  fromRotationZ(angle: number, result?: Matrix3): Matrix3;
  toArray(matrix: Matrix3, result?: number[]): number[];
  getElementIndex(column: number, row: number): number;
  getColumn(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3;
  setColumn(matrix: Matrix3, index: number, cartesian: Cartesian3, result: Matrix3): Matrix3;
  getRow(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3;
  setRow(matrix: Matrix3, index: number, cartesian: Cartesian3, result: Matrix3): Matrix3;
  setScale(matrix: Matrix3, scale: Cartesian3, result: Matrix3): Matrix3;
  setUniformScale(matrix: Matrix3, scale: number, result: Matrix3): Matrix3;
  getScale(matrix: Matrix3, result: Cartesian3): Cartesian3;
  getMaximumScale(matrix: Matrix3): number;
  setRotation(matrix: Matrix3, rotation: Matrix3, result: Matrix3): Matrix3;
  getRotation(matrix: Matrix3, result: Matrix3): Matrix3;
  multiply(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3;
  add(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3;
  subtract(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3;
  multiplyByVector(matrix: Matrix3, cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  multiplyByScalar(matrix: Matrix3, scalar: number, result: Matrix3): Matrix3;
  negate(matrix: Matrix3, result: Matrix3): Matrix3;
  transpose(matrix: Matrix3, result: Matrix3): Matrix3;
  determinant(matrix: Matrix3): number;
  inverse(matrix: Matrix3, result: Matrix3): Matrix3;
  inverseTranspose(matrix: Matrix3, result: Matrix3): Matrix3;
  equals(left?: Matrix3, right?: Matrix3): boolean;
  equalsEpsilon(left?: Matrix3, right?: Matrix3, epsilon?: number): boolean;
}

export interface Matrix4 {
  length: number;
  clone(result?: Matrix4): Matrix4;
  equals(right?: Matrix4): boolean;
  equalsEpsilon(right?: Matrix4, epsilon?: number): boolean;
  toString(): string;
  [index: number]: number;
}

export interface Matrix4Constructor {
  new (column0Row0?: number, column1Row0?: number, column2Row0?: number, column3Row0?: number,
       column0Row1?: number, column1Row1?: number, column2Row1?: number, column3Row1?: number,
       column0Row2?: number, column1Row2?: number, column2Row2?: number, column3Row2?: number,
       column0Row3?: number, column1Row3?: number, column2Row3?: number, column3Row3?: number): Matrix4;

  packedLength: number;
  IDENTITY: Matrix4;
  ZERO: Matrix4;

  clone(matrix?: Matrix4, result?: Matrix4): Matrix4 | undefined;
  fromArray(array: number[], startingIndex?: number, result?: Matrix4): Matrix4;
  fromColumnMajorArray(values: number[], result?: Matrix4): Matrix4;
  fromRowMajorArray(values: number[], result?: Matrix4): Matrix4;
  fromRotationTranslation(rotation: Matrix3, translation?: Cartesian3, result?: Matrix4): Matrix4;
  fromTranslationQuaternionRotationScale(translation: Cartesian3, rotation: Quaternion, scale: Cartesian3, result?: Matrix4): Matrix4;
  fromTranslationRotationScale(translationRotationScale: TranslationRotationScale, result?: Matrix4): Matrix4;
  fromTranslation(translation: Cartesian3, result?: Matrix4): Matrix4;
  fromScale(scale: Cartesian3, result?: Matrix4): Matrix4;
  fromUniformScale(scale: number, result?: Matrix4): Matrix4;
  fromRotation(rotation: Matrix3, result?: Matrix4): Matrix4;
  fromCamera(camera: Camera, result?: Matrix4): Matrix4;
  computePerspectiveFieldOfView(fovY: number, aspectRatio: number, near: number, far: number, result: Matrix4): Matrix4;
  computeOrthographicOffCenter(left: number, right: number, bottom: number, top: number, near: number, far: number, result: Matrix4): Matrix4;
  computePerspectiveOffCenter(left: number, right: number, bottom: number, top: number, near: number, far: number, result: Matrix4): Matrix4;
  computeInfinitePerspectiveOffCenter(left: number, right: number, bottom: number, top: number, near: number, result: Matrix4): Matrix4;
  computeViewportTransformation(viewport: BoundingRectangle, nearDepthRange: number, farDepthRange: number, result: Matrix4): Matrix4;
  computeView(position: Cartesian3, direction: Cartesian3, up: Cartesian3, right: Cartesian3, result: Matrix4): Matrix4;
  toArray(matrix: Matrix4, result?: number[]): number[];
  getElementIndex(column: number, row: number): number;
  getColumn(matrix: Matrix4, index: number, result: Cartesian4): Cartesian4;
  setColumn(matrix: Matrix4, index: number, cartesian: Cartesian4, result: Matrix4): Matrix4;
  getRow(matrix: Matrix4, index: number, result: Cartesian4): Cartesian4;
  setRow(matrix: Matrix4, index: number, cartesian: Cartesian4, result: Matrix4): Matrix4;
  setTranslation(matrix: Matrix4, translation: Cartesian3, result: Matrix4): Matrix4;
  setScale(matrix: Matrix4, scale: Cartesian3, result: Matrix4): Matrix4;
  setUniformScale(matrix: Matrix4, scale: number, result: Matrix4): Matrix4;
  getScale(matrix: Matrix4, result: Cartesian3): Cartesian3;
  getMaximumScale(matrix: Matrix4): number;
  setRotation(matrix: Matrix4, rotation: Matrix3, result: Matrix4): Matrix4;
  getRotation(matrix: Matrix4, result: Matrix3): Matrix3;
  multiply(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4;
  add(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4;
  subtract(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4;
  multiplyTransformation(left: Matrix4, right: Matrix4, result: Matrix4): Matrix4;
  multiplyByMatrix3(matrix: Matrix4, rotation: Matrix3, result: Matrix4): Matrix4;
  multiplyByTranslation(matrix: Matrix4, translation: Cartesian3, result: Matrix4): Matrix4;
  multiplyByUniformScale(matrix: Matrix4, scale: number, result: Matrix4): Matrix4;
  multiplyByScale(matrix: Matrix4, scale: Cartesian3, result: Matrix4): Matrix4;
  multiplyByVector(matrix: Matrix4, cartesian: Cartesian4, result: Cartesian4): Cartesian4;
  multiplyByPointAsVector(matrix: Matrix4, cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  multiplyByPoint(matrix: Matrix4, cartesian: Cartesian3, result: Cartesian3): Cartesian3;
  multiplyByScalar(matrix: Matrix4, scalar: number, result: Matrix4): Matrix4;
  negate(matrix: Matrix4, result: Matrix4): Matrix4;
  transpose(matrix: Matrix4, result: Matrix4): Matrix4;
  abs(matrix: Matrix4, result: Matrix4): Matrix4;
  equals(left?: Matrix4, right?: Matrix4): boolean;
  equalsEpsilon(left?: Matrix4, right?: Matrix4, epsilon?: number): boolean;
  getTranslation(matrix: Matrix4, result: Cartesian3): Cartesian3;
  inverse(matrix: Matrix4, result: Matrix4): Matrix4;
  inverseTransformation(matrix: Matrix4, result: Matrix4): Matrix4;
  inverseTranspose(matrix: Matrix4, result: Matrix4): Matrix4;
}

// ============================================================================
// Quaternion
// ============================================================================
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  clone(result?: Quaternion): Quaternion;
  equals(right?: Quaternion): boolean;
  equalsEpsilon(right?: Quaternion, epsilon?: number): boolean;
  toString(): string;
}

export interface QuaternionConstructor {
  new (x?: number, y?: number, z?: number, w?: number): Quaternion;
  (x?: number, y?: number, z?: number, w?: number): Quaternion;

  packedLength: number;
  packedInterpolationLength: number;
  ZERO: Quaternion;
  IDENTITY: Quaternion;

  fromAxisAngle(axis: Cartesian3, angle: number, result?: Quaternion): Quaternion;
  fromRotationMatrix(matrix: Matrix3, result?: Quaternion): Quaternion;
  fromHeadingPitchRoll(headingPitchRoll: HeadingPitchRoll, result?: Quaternion): Quaternion;
  clone(quaternion?: Quaternion, result?: Quaternion): Quaternion | undefined;
  pack(value: Quaternion, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Quaternion): Quaternion;
  convertPackedArrayForInterpolation(packedArray: number[], startingIndex?: number, lastIndex?: number, result?: number[]): void;
  unpackInterpolationResult(array: number[], sourceArray: number[], firstIndex?: number, lastIndex?: number, result?: Quaternion): Quaternion;
  conjugate(quaternion: Quaternion, result: Quaternion): Quaternion;
  magnitudeSquared(quaternion: Quaternion): number;
  magnitude(quaternion: Quaternion): number;
  normalize(quaternion: Quaternion, result: Quaternion): Quaternion;
  inverse(quaternion: Quaternion, result: Quaternion): Quaternion;
  add(left: Quaternion, right: Quaternion, result: Quaternion): Quaternion;
  subtract(left: Quaternion, right: Quaternion, result: Quaternion): Quaternion;
  negate(quaternion: Quaternion, result: Quaternion): Quaternion;
  dot(left: Quaternion, right: Quaternion): number;
  multiply(left: Quaternion, right: Quaternion, result: Quaternion): Quaternion;
  multiplyByScalar(quaternion: Quaternion, scalar: number, result: Quaternion): Quaternion;
  divideByScalar(quaternion: Quaternion, scalar: number, result: Quaternion): Quaternion;
  computeAxis(quaternion: Quaternion, result: Cartesian3): Cartesian3;
  computeAngle(quaternion: Quaternion): number;
  lerp(start: Quaternion, end: Quaternion, t: number, result: Quaternion): Quaternion;
  slerp(start: Quaternion, end: Quaternion, t: number, result: Quaternion): Quaternion;
  log(quaternion: Quaternion, result: Cartesian3): Cartesian3;
  exp(cartesian: Cartesian3, result: Quaternion): Quaternion;
  computeInnerQuadrangle(q0: Quaternion, q1: Quaternion, q2: Quaternion, result: Quaternion): Quaternion;
  squad(q0: Quaternion, q1: Quaternion, s0: Quaternion, s1: Quaternion, t: number, result: Quaternion): Quaternion;
  fastSlerp(start: Quaternion, end: Quaternion, t: number, result: Quaternion): Quaternion;
  fastSquad(q0: Quaternion, q1: Quaternion, s0: Quaternion, s1: Quaternion, t: number, result: Quaternion): Quaternion;
  equals(left?: Quaternion, right?: Quaternion): boolean;
  equalsEpsilon(left?: Quaternion, right?: Quaternion, epsilon?: number): boolean;
}

// ============================================================================
// Heading/Pitch/Roll
// ============================================================================
export interface HeadingPitchRoll {
  heading: number;
  pitch: number;
  roll: number;
  clone(result?: HeadingPitchRoll): HeadingPitchRoll;
  equals(right?: HeadingPitchRoll): boolean;
  equalsEpsilon(right?: HeadingPitchRoll, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
  toString(): string;
}

export interface HeadingPitchRollConstructor {
  new (heading?: number, pitch?: number, roll?: number): HeadingPitchRoll;
  (heading?: number, pitch?: number, roll?: number): HeadingPitchRoll;

  fromQuaternion(quaternion: Quaternion, result?: HeadingPitchRoll): HeadingPitchRoll;
  fromDegrees(heading: number, pitch: number, roll: number, result?: HeadingPitchRoll): HeadingPitchRoll;
  clone(headingPitchRoll?: HeadingPitchRoll, result?: HeadingPitchRoll): HeadingPitchRoll | undefined;
  equals(left?: HeadingPitchRoll, right?: HeadingPitchRoll): boolean;
  equalsEpsilon(left?: HeadingPitchRoll, right?: HeadingPitchRoll, relativeEpsilon?: number, absoluteEpsilon?: number): boolean;
}

// ============================================================================
// Bounding Types
// ============================================================================
export interface BoundingRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  clone(result?: BoundingRectangle): BoundingRectangle;
  equals(right?: BoundingRectangle): boolean;
}

export interface BoundingSphere {
  center: Cartesian3;
  radius: number;
  clone(result?: BoundingSphere): BoundingSphere;
  equals(right?: BoundingSphere): boolean;
}

export interface BoundingSphereConstructor {
  new (center?: Cartesian3, radius?: number): BoundingSphere;
  (center?: Cartesian3, radius?: number): BoundingSphere;

  packedLength: number;

  fromPoints(positions?: Cartesian3[], result?: BoundingSphere): BoundingSphere;
  fromRectangle2D(rectangle?: Rectangle, projection?: MapProjection, result?: BoundingSphere): BoundingSphere;
  fromRectangleWithHeights2D(rectangle?: Rectangle, projection?: MapProjection, minimumHeight?: number, maximumHeight?: number, result?: BoundingSphere): BoundingSphere;
  fromRectangle3D(rectangle?: Rectangle, ellipsoid?: Ellipsoid, surfaceHeight?: number, result?: BoundingSphere): BoundingSphere;
  fromVertices(positions?: number[], center?: Cartesian3, stride?: number, result?: BoundingSphere): BoundingSphere;
  fromEncodedCartesianVertices(positionsHigh?: number[], positionsLow?: number[], result?: BoundingSphere): BoundingSphere;
  fromCornerPoints(corner?: Cartesian3, oppositeCorner?: Cartesian3, result?: BoundingSphere): BoundingSphere;
  fromEllipsoid(ellipsoid: Ellipsoid, result?: BoundingSphere): BoundingSphere;
  fromBoundingSpheres(boundingSpheres?: BoundingSphere[], result?: BoundingSphere): BoundingSphere;
  fromOrientedBoundingBox(orientedBoundingBox: OrientedBoundingBox, result?: BoundingSphere): BoundingSphere;
  fromTransformation(transformation: Matrix4, result?: BoundingSphere): BoundingSphere;
  clone(sphere?: BoundingSphere, result?: BoundingSphere): BoundingSphere | undefined;
  pack(value: BoundingSphere, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: BoundingSphere): BoundingSphere;
  union(left: BoundingSphere, right: BoundingSphere, result?: BoundingSphere): BoundingSphere;
  expand(sphere: BoundingSphere, point: Cartesian3, result?: BoundingSphere): BoundingSphere;
  intersectPlane(sphere: BoundingSphere, plane: Plane): Intersect;
  transform(sphere: BoundingSphere, transform: Matrix4, result?: BoundingSphere): BoundingSphere;
  distanceSquaredTo(sphere: BoundingSphere, cartesian: Cartesian3): number;
  transformWithoutScale(sphere: BoundingSphere, transform: Matrix4, result?: BoundingSphere): BoundingSphere;
  computePlaneDistances(sphere: BoundingSphere, position: Cartesian3, direction: Cartesian3, result?: Interval): Interval;
  projectTo2D(sphere: BoundingSphere, projection?: MapProjection, result?: BoundingSphere): BoundingSphere;
  isOccluded(sphere: BoundingSphere, occluder: Occluder): boolean;
  equals(left?: BoundingSphere, right?: BoundingSphere): boolean;
}

export interface OrientedBoundingBox {
  center: Cartesian3;
  halfAxes: Matrix3;
  clone(result?: OrientedBoundingBox): OrientedBoundingBox;
  equals(right?: OrientedBoundingBox): boolean;
}

export interface AxisAlignedBoundingBox {
  minimum: Cartesian3;
  maximum: Cartesian3;
  center: Cartesian3;
  clone(result?: AxisAlignedBoundingBox): AxisAlignedBoundingBox;
  equals(right?: AxisAlignedBoundingBox): boolean;
}

// ============================================================================
// Ellipsoid
// ============================================================================
export interface Ellipsoid {
  readonly radii: Cartesian3;
  readonly radiiSquared: Cartesian3;
  readonly radiiToTheFourth: Cartesian3;
  readonly oneOverRadii: Cartesian3;
  readonly oneOverRadiiSquared: Cartesian3;
  readonly minimumRadius: number;
  readonly maximumRadius: number;

  clone(result?: Ellipsoid): Ellipsoid;
  equals(right?: Ellipsoid): boolean;
  toString(): string;
  geocentricSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
  geodeticSurfaceNormalCartographic(cartographic: Cartographic, result?: Cartesian3): Cartesian3;
  geodeticSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
  cartographicToCartesian(cartographic: Cartographic, result?: Cartesian3): Cartesian3;
  cartographicArrayToCartesianArray(cartographics: Cartographic[], result?: Cartesian3[]): Cartesian3[];
  cartesianToCartographic(cartesian: Cartesian3, result?: Cartographic): Cartographic | undefined;
  cartesianArrayToCartographicArray(cartesians: Cartesian3[], result?: Cartographic[]): Cartographic[];
  scaleToGeodeticSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 | undefined;
  scaleToGeocentricSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
  transformPositionToScaledSpace(position: Cartesian3, result?: Cartesian3): Cartesian3;
  transformPositionFromScaledSpace(position: Cartesian3, result?: Cartesian3): Cartesian3;
  getSurfaceNormalIntersectionWithZAxis(position: Cartesian3, buffer?: number, result?: Cartesian3): Cartesian3 | undefined;
}

export interface EllipsoidConstructor {
  new (x?: number, y?: number, z?: number): Ellipsoid;
  (x?: number, y?: number, z?: number): Ellipsoid;

  packedLength: number;
  WGS84: Ellipsoid;
  UNIT_SPHERE: Ellipsoid;
  MOON: Ellipsoid;
  default: Ellipsoid;

  clone(ellipsoid?: Ellipsoid, result?: Ellipsoid): Ellipsoid | undefined;
  fromCartesian3(cartesian?: Cartesian3, result?: Ellipsoid): Ellipsoid;
  pack(value: Ellipsoid, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Ellipsoid): Ellipsoid;
}

// ============================================================================
// Rectangle
// ============================================================================
export interface Rectangle {
  west: number;
  south: number;
  east: number;
  north: number;
  readonly width: number;
  readonly height: number;
  clone(result?: Rectangle): Rectangle;
  equals(other?: Rectangle): boolean;
  equalsEpsilon(other?: Rectangle, epsilon?: number): boolean;
}

export interface RectangleConstructor {
  new (west?: number, south?: number, east?: number, north?: number): Rectangle;
  (west?: number, south?: number, east?: number, north?: number): Rectangle;

  packedLength: number;
  MAX_VALUE: Rectangle;

  fromDegrees(west?: number, south?: number, east?: number, north?: number, result?: Rectangle): Rectangle;
  fromRadians(west?: number, south?: number, east?: number, north?: number, result?: Rectangle): Rectangle;
  fromCartographicArray(cartographics: Cartographic[], result?: Rectangle): Rectangle;
  fromCartesianArray(cartesians: Cartesian3[], ellipsoid?: Ellipsoid, result?: Rectangle): Rectangle;
  clone(rectangle?: Rectangle, result?: Rectangle): Rectangle | undefined;
  pack(value: Rectangle, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Rectangle): Rectangle;
  computeWidth(rectangle: Rectangle): number;
  computeHeight(rectangle: Rectangle): number;
  fromBoundingSphere(boundingSphere: BoundingSphere, ellipsoid?: Ellipsoid, result?: Rectangle): Rectangle;
  northeast(rectangle: Rectangle, result?: Cartographic): Cartographic;
  northwest(rectangle: Rectangle, result?: Cartographic): Cartographic;
  southeast(rectangle: Rectangle, result?: Cartographic): Cartographic;
  southwest(rectangle: Rectangle, result?: Cartographic): Cartographic;
  center(rectangle: Rectangle, result?: Cartographic): Cartographic;
  intersection(rectangle: Rectangle, otherRectangle: Rectangle, result?: Rectangle): Rectangle | undefined;
  simpleIntersection(rectangle: Rectangle, otherRectangle: Rectangle, result?: Rectangle): Rectangle | undefined;
  union(rectangle: Rectangle, otherRectangle: Rectangle, result?: Rectangle): Rectangle;
  expand(rectangle: Rectangle, cartographic: Cartographic, result?: Rectangle): Rectangle;
  contains(rectangle: Rectangle, cartographic: Cartographic): boolean;
  subsample(rectangle: Rectangle, ellipsoid?: Ellipsoid, surfaceHeight?: number, result?: Cartesian3[]): Cartesian3[];
  subsection(rectangle: Rectangle, westLerp: number, southLerp: number, eastLerp: number, northLerp: number, result?: Rectangle): Rectangle;
  equals(left?: Rectangle, right?: Rectangle): boolean;
  equalsEpsilon(left?: Rectangle, right?: Rectangle, epsilon?: number): boolean;
  validate(rectangle: Rectangle): void;
}

// ============================================================================
// Color
// ============================================================================
export interface Color {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  clone(result?: Color): Color;
  equals(other?: Color): boolean;
  equalsEpsilon(other?: Color, epsilon?: number): boolean;
  toString(): string;
  toCssColorString(): string;
  toCssHexString(): string;
  toBytes(result?: number[]): number[];
  toRgba(): number;
  brighten(magnitude: number, result: Color): Color;
  darken(magnitude: number, result: Color): Color;
  withAlpha(alpha: number, result?: Color): Color;
}

export interface ColorConstructor {
  new (red?: number, green?: number, blue?: number, alpha?: number): Color;
  (red?: number, green?: number, blue?: number, alpha?: number): Color;

  packedLength: number;

  // CSS Color names
  ALICEBLUE: Color;
  ANTIQUEWHITE: Color;
  AQUA: Color;
  AQUAMARINE: Color;
  AZURE: Color;
  BEIGE: Color;
  BISQUE: Color;
  BLACK: Color;
  BLANCHEDALMOND: Color;
  BLUE: Color;
  BLUEVIOLET: Color;
  BROWN: Color;
  BURLYWOOD: Color;
  CADETBLUE: Color;
  CHARTREUSE: Color;
  CHOCOLATE: Color;
  CORAL: Color;
  CORNFLOWERBLUE: Color;
  CORNSILK: Color;
  CRIMSON: Color;
  CYAN: Color;
  DARKBLUE: Color;
  DARKCYAN: Color;
  DARKGOLDENROD: Color;
  DARKGRAY: Color;
  DARKGREEN: Color;
  DARKGREY: Color;
  DARKKHAKI: Color;
  DARKMAGENTA: Color;
  DARKOLIVEGREEN: Color;
  DARKORANGE: Color;
  DARKORCHID: Color;
  DARKRED: Color;
  DARKSALMON: Color;
  DARKSEAGREEN: Color;
  DARKSLATEBLUE: Color;
  DARKSLATEGRAY: Color;
  DARKSLATEGREY: Color;
  DARKTURQUOISE: Color;
  DARKVIOLET: Color;
  DEEPPINK: Color;
  DEEPSKYBLUE: Color;
  DIMGRAY: Color;
  DIMGREY: Color;
  DODGERBLUE: Color;
  FIREBRICK: Color;
  FLORALWHITE: Color;
  FORESTGREEN: Color;
  FUCHSIA: Color;
  GAINSBORO: Color;
  GHOSTWHITE: Color;
  GOLD: Color;
  GOLDENROD: Color;
  GRAY: Color;
  GREEN: Color;
  GREENYELLOW: Color;
  GREY: Color;
  HONEYDEW: Color;
  HOTPINK: Color;
  INDIANRED: Color;
  INDIGO: Color;
  IVORY: Color;
  KHAKI: Color;
  LAVENDER: Color;
  LAVENDERBLUSH: Color;
  LAWNGREEN: Color;
  LEMONCHIFFON: Color;
  LIGHTBLUE: Color;
  LIGHTCORAL: Color;
  LIGHTCYAN: Color;
  LIGHTGOLDENRODYELLOW: Color;
  LIGHTGRAY: Color;
  LIGHTGREEN: Color;
  LIGHTGREY: Color;
  LIGHTPINK: Color;
  LIGHTSALMON: Color;
  LIGHTSEAGREEN: Color;
  LIGHTSKYBLUE: Color;
  LIGHTSLATEGRAY: Color;
  LIGHTSLATEGREY: Color;
  LIGHTSTEELBLUE: Color;
  LIGHTYELLOW: Color;
  LIME: Color;
  LIMEGREEN: Color;
  LINEN: Color;
  MAGENTA: Color;
  MAROON: Color;
  MEDIUMAQUAMARINE: Color;
  MEDIUMBLUE: Color;
  MEDIUMORCHID: Color;
  MEDIUMPURPLE: Color;
  MEDIUMSEAGREEN: Color;
  MEDIUMSLATEBLUE: Color;
  MEDIUMSPRINGGREEN: Color;
  MEDIUMTURQUOISE: Color;
  MEDIUMVIOLETRED: Color;
  MIDNIGHTBLUE: Color;
  MINTCREAM: Color;
  MISTYROSE: Color;
  MOCCASIN: Color;
  NAVAJOWHITE: Color;
  NAVY: Color;
  OLDLACE: Color;
  OLIVE: Color;
  OLIVEDRAB: Color;
  ORANGE: Color;
  ORANGERED: Color;
  ORCHID: Color;
  PALEGOLDENROD: Color;
  PALEGREEN: Color;
  PALETURQUOISE: Color;
  PALEVIOLETRED: Color;
  PAPAYAWHIP: Color;
  PEACHPUFF: Color;
  PERU: Color;
  PINK: Color;
  PLUM: Color;
  POWDERBLUE: Color;
  PURPLE: Color;
  RED: Color;
  ROSYBROWN: Color;
  ROYALBLUE: Color;
  SADDLEBROWN: Color;
  SALMON: Color;
  SANDYBROWN: Color;
  SEAGREEN: Color;
  SEASHELL: Color;
  SIENNA: Color;
  SILVER: Color;
  SKYBLUE: Color;
  SLATEBLUE: Color;
  SLATEGRAY: Color;
  SLATEGREY: Color;
  SNOW: Color;
  SPRINGGREEN: Color;
  STEELBLUE: Color;
  TAN: Color;
  TEAL: Color;
  THISTLE: Color;
  TOMATO: Color;
  TRANSPARENT: Color;
  TURQUOISE: Color;
  VIOLET: Color;
  WHEAT: Color;
  WHITE: Color;
  WHITESMOKE: Color;
  YELLOW: Color;
  YELLOWGREEN: Color;

  fromCartesian4(cartesian: Cartesian4, result?: Color): Color;
  fromBytes(red?: number, green?: number, blue?: number, alpha?: number, result?: Color): Color;
  fromAlpha(color: Color, alpha: number, result?: Color): Color;
  fromRgba(rgba: number, result?: Color): Color;
  fromHsl(hue?: number, saturation?: number, lightness?: number, alpha?: number, result?: Color): Color;
  fromRandom(options?: { red?: number; minimumRed?: number; maximumRed?: number; green?: number; minimumGreen?: number; maximumGreen?: number; blue?: number; minimumBlue?: number; maximumBlue?: number; alpha?: number; minimumAlpha?: number; maximumAlpha?: number }, result?: Color): Color;
  fromCssColorString(color: string, result?: Color): Color | undefined;
  clone(color?: Color, result?: Color): Color | undefined;
  pack(value: Color, array: number[], startingIndex?: number): number[];
  unpack(array: number[], startingIndex?: number, result?: Color): Color;
  packArray(array: Color[], result?: number[]): number[];
  unpackArray(array: number[], result?: Color[]): Color[];
  byteToFloat(number: number): number;
  floatToByte(number: number): number;
  add(left: Color, right: Color, result: Color): Color;
  subtract(left: Color, right: Color, result: Color): Color;
  multiply(left: Color, right: Color, result: Color): Color;
  divide(left: Color, right: Color, result: Color): Color;
  mod(left: Color, right: Color, result: Color): Color;
  lerp(start: Color, end: Color, t: number, result: Color): Color;
  multiplyByScalar(color: Color, scalar: number, result: Color): Color;
  divideByScalar(color: Color, scalar: number, result: Color): Color;
  equals(left?: Color, right?: Color): boolean;
}

// ============================================================================
// Event
// ============================================================================
export interface Event<T extends (...args: any[]) => void = (...args: any[]) => void> {
  readonly numberOfListeners: number;
  addEventListener(listener: T, scope?: object): () => void;
  removeEventListener(listener: T, scope?: object): boolean;
  raiseEvent(...args: Parameters<T>): void;
}

export interface EventConstructor {
  new <T extends (...args: any[]) => void = (...args: any[]) => void>(): Event<T>;
}

// ============================================================================
// Clock
// ============================================================================
export interface Clock {
  startTime: JulianDate;
  stopTime: JulianDate;
  currentTime: JulianDate;
  multiplier: number;
  clockStep: ClockStep;
  clockRange: ClockRange;
  canAnimate: boolean;
  shouldAnimate: boolean;
  readonly onTick: Event<(clock: Clock) => void>;
  readonly onStop: Event<(clock: Clock) => void>;
  tick(): JulianDate;
}

export interface ClockConstructor {
  new (options?: {
    startTime?: JulianDate;
    stopTime?: JulianDate;
    currentTime?: JulianDate;
    multiplier?: number;
    clockStep?: ClockStep;
    clockRange?: ClockRange;
    canAnimate?: boolean;
    shouldAnimate?: boolean;
  }): Clock;
}

// ============================================================================
// Julian Date
// ============================================================================
export interface JulianDate {
  dayNumber: number;
  secondsOfDay: number;
  clone(result?: JulianDate): JulianDate;
  equals(right?: JulianDate): boolean;
  equalsEpsilon(right?: JulianDate, epsilon?: number): boolean;
  toString(): string;
}

export interface JulianDateConstructor {
  new (julianDayNumber?: number, secondsOfDay?: number, timeStandard?: TimeStandard): JulianDate;
  (julianDayNumber?: number, secondsOfDay?: number, timeStandard?: TimeStandard): JulianDate;

  leapSeconds: LeapSecond[];

  fromDate(date: Date, result?: JulianDate): JulianDate;
  fromIso8601(iso8601String: string, result?: JulianDate): JulianDate;
  now(result?: JulianDate): JulianDate;
  toGregorianDate(julianDate: JulianDate, result?: GregorianDate): GregorianDate;
  toDate(julianDate: JulianDate): Date;
  toIso8601(julianDate: JulianDate, precision?: number): string;
  clone(julianDate?: JulianDate, result?: JulianDate): JulianDate | undefined;
  compare(left: JulianDate, right: JulianDate): number;
  equals(left?: JulianDate, right?: JulianDate): boolean;
  equalsEpsilon(left?: JulianDate, right?: JulianDate, epsilon?: number): boolean;
  totalDays(julianDate: JulianDate): number;
  secondsDifference(left: JulianDate, right: JulianDate): number;
  daysDifference(left: JulianDate, right: JulianDate): number;
  computeTaiMinusUtc(julianDate: JulianDate): number;
  addSeconds(julianDate: JulianDate, seconds: number, result: JulianDate): JulianDate;
  addMinutes(julianDate: JulianDate, minutes: number, result: JulianDate): JulianDate;
  addHours(julianDate: JulianDate, hours: number, result: JulianDate): JulianDate;
  addDays(julianDate: JulianDate, days: number, result: JulianDate): JulianDate;
  lessThan(left: JulianDate, right: JulianDate): boolean;
  lessThanOrEquals(left: JulianDate, right: JulianDate): boolean;
  greaterThan(left: JulianDate, right: JulianDate): boolean;
  greaterThanOrEquals(left: JulianDate, right: JulianDate): boolean;
}

// ============================================================================
// Supporting Types and Enums
// ============================================================================
export interface GregorianDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  isLeapSecond: boolean;
}

export interface LeapSecond {
  julianDate: JulianDate;
  offset: number;
}

export interface TimeInterval {
  start: JulianDate;
  stop: JulianDate;
  isStartIncluded: boolean;
  isStopIncluded: boolean;
  data?: any;
  readonly isEmpty: boolean;
  clone(result?: TimeInterval): TimeInterval;
  equals(right?: TimeInterval, dataComparer?: (leftData: any, rightData: any) => boolean): boolean;
  equalsEpsilon(right?: TimeInterval, epsilon?: number, dataComparer?: (leftData: any, rightData: any) => boolean): boolean;
  toString(): string;
}

export interface Interval {
  start: number;
  stop: number;
}

export interface Plane {
  normal: Cartesian3;
  distance: number;
}

export interface Ray {
  origin: Cartesian3;
  direction: Cartesian3;
}

export interface TranslationRotationScale {
  translation: Cartesian3;
  rotation: Quaternion;
  scale: Cartesian3;
}

// ============================================================================
// Enums
// ============================================================================
export enum ClockRange {
  UNBOUNDED = 0,
  CLAMPED = 1,
  LOOP_STOP = 2
}

export enum ClockStep {
  TICK_DEPENDENT = 0,
  SYSTEM_CLOCK_MULTIPLIER = 1,
  SYSTEM_CLOCK = 2
}

export enum TimeStandard {
  UTC = 0,
  TAI = 1
}

export enum Intersect {
  OUTSIDE = -1,
  INTERSECTING = 0,
  INSIDE = 1
}

export enum PixelFormat {
  DEPTH_COMPONENT = 0x1902,
  DEPTH_STENCIL = 0x84F9,
  ALPHA = 0x1906,
  RED = 0x1903,
  RG = 0x8227,
  RGB = 0x1907,
  RGBA = 0x1908,
  LUMINANCE = 0x1909,
  LUMINANCE_ALPHA = 0x190A,
  RGB_DXT1 = 0x83F0,
  RGBA_DXT1 = 0x83F1,
  RGBA_DXT3 = 0x83F2,
  RGBA_DXT5 = 0x83F3,
  RGB_PVRTC_4BPPV1 = 0x8C00,
  RGB_PVRTC_2BPPV1 = 0x8C01,
  RGBA_PVRTC_4BPPV1 = 0x8C02,
  RGBA_PVRTC_2BPPV1 = 0x8C03,
  RGBA_ASTC = 0x93B0,
  RGB_ETC1 = 0x8D64,
  RGB8_ETC2 = 0x9274,
  RGBA8_ETC2_EAC = 0x9278,
  RGBA_BC7 = 0x8E8C
}

export enum ComponentDatatype {
  BYTE = 0x1400,
  UNSIGNED_BYTE = 0x1401,
  SHORT = 0x1402,
  UNSIGNED_SHORT = 0x1403,
  INT = 0x1404,
  UNSIGNED_INT = 0x1405,
  FLOAT = 0x1406,
  DOUBLE = 0x140A
}

export enum PrimitiveType {
  POINTS = 0x0000,
  LINES = 0x0001,
  LINE_LOOP = 0x0002,
  LINE_STRIP = 0x0003,
  TRIANGLES = 0x0004,
  TRIANGLE_STRIP = 0x0005,
  TRIANGLE_FAN = 0x0006
}

export enum IndexDatatype {
  UNSIGNED_BYTE = 0x1401,
  UNSIGNED_SHORT = 0x1403,
  UNSIGNED_INT = 0x1405
}

// ============================================================================
// Scene/Camera Types (forward declarations)
// ============================================================================
export interface Camera {
  position: Cartesian3;
  direction: Cartesian3;
  up: Cartesian3;
  right: Cartesian3;
  frustum: PerspectiveFrustum | OrthographicFrustum | PerspectiveOffCenterFrustum | OrthographicOffCenterFrustum;
  readonly positionCartographic: Cartographic;
  readonly positionWC: Cartesian3;
  readonly directionWC: Cartesian3;
  readonly upWC: Cartesian3;
  readonly rightWC: Cartesian3;
  readonly viewMatrix: Matrix4;
  readonly inverseViewMatrix: Matrix4;
  readonly heading: number;
  readonly pitch: number;
  readonly roll: number;
  readonly transform: Matrix4;
  readonly inverseTransform: Matrix4;

  setView(options: { destination?: Cartesian3 | Rectangle; orientation?: { heading?: number; pitch?: number; roll?: number; direction?: Cartesian3; up?: Cartesian3 }; endTransform?: Matrix4; convert?: boolean }): void;
  flyTo(options: { destination: Cartesian3 | Rectangle; orientation?: { heading?: number; pitch?: number; roll?: number; direction?: Cartesian3; up?: Cartesian3 }; duration?: number; complete?: () => void; cancel?: () => void; endTransform?: Matrix4; maximumHeight?: number; pitchAdjustHeight?: number; flyOverLongitude?: number; flyOverLongitudeWeight?: number; convert?: boolean; easingFunction?: EasingFunction }): void;
  flyToBoundingSphere(boundingSphere: BoundingSphere, options?: { duration?: number; offset?: HeadingPitchRange; complete?: () => void; cancel?: () => void; endTransform?: Matrix4; maximumHeight?: number; pitchAdjustHeight?: number; flyOverLongitude?: number; flyOverLongitudeWeight?: number; easingFunction?: EasingFunction }): void;
  lookAt(target: Cartesian3, offset: Cartesian3 | HeadingPitchRange): void;
  lookAtTransform(transform: Matrix4, offset?: Cartesian3 | HeadingPitchRange): void;
  move(direction: Cartesian3, amount?: number): void;
  moveForward(amount?: number): void;
  moveBackward(amount?: number): void;
  moveUp(amount?: number): void;
  moveDown(amount?: number): void;
  moveRight(amount?: number): void;
  moveLeft(amount?: number): void;
  rotate(axis: Cartesian3, angle?: number): void;
  rotateDown(angle?: number): void;
  rotateUp(angle?: number): void;
  rotateRight(angle?: number): void;
  rotateLeft(angle?: number): void;
  twistLeft(amount?: number): void;
  twistRight(amount?: number): void;
  zoomIn(amount?: number): void;
  zoomOut(amount?: number): void;
  getMagnitude(): number;
  pickEllipsoid(windowPosition: Cartesian2, ellipsoid?: Ellipsoid, result?: Cartesian3): Cartesian3 | undefined;
  getPickRay(windowPosition: Cartesian2, result?: Ray): Ray;
  worldToCameraCoordinates(cartesian: Cartesian4, result?: Cartesian4): Cartesian4;
  worldToCameraCoordinatesPoint(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
  worldToCameraCoordinatesVector(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
  cameraToWorldCoordinates(cartesian: Cartesian4, result?: Cartesian4): Cartesian4;
  cameraToWorldCoordinatesPoint(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
  cameraToWorldCoordinatesVector(cartesian: Cartesian3, result?: Cartesian3): Cartesian3;
}

export interface PerspectiveFrustum {
  fov: number;
  aspectRatio: number;
  near: number;
  far: number;
  xOffset: number;
  yOffset: number;
  readonly projectionMatrix: Matrix4;
  readonly infiniteProjectionMatrix: Matrix4;
  readonly fovy: number;
  readonly sseDenominator: number;
}

export interface OrthographicFrustum {
  width: number;
  aspectRatio: number;
  near: number;
  far: number;
  readonly projectionMatrix: Matrix4;
}

export interface PerspectiveOffCenterFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  readonly projectionMatrix: Matrix4;
  readonly infiniteProjectionMatrix: Matrix4;
}

export interface OrthographicOffCenterFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  readonly projectionMatrix: Matrix4;
}

export interface HeadingPitchRange {
  heading: number;
  pitch: number;
  range: number;
}

export type EasingFunction = (time: number) => number;

// ============================================================================
// Map Projection
// ============================================================================
export interface MapProjection {
  readonly ellipsoid: Ellipsoid;
  project(cartographic: Cartographic, result?: Cartesian3): Cartesian3;
  unproject(cartesian: Cartesian3, result?: Cartographic): Cartographic;
}

// ============================================================================
// Occluder
// ============================================================================
export interface Occluder {
  readonly position: Cartesian3;
  readonly radius: number;
  cameraPosition: Cartesian3;

  isPointVisible(occludee: Cartesian3): boolean;
  isBoundingSphereVisible(occludee: BoundingSphere): boolean;
  computeVisibility(occludeeBS: BoundingSphere): Visibility;
}

export enum Visibility {
  NONE = -1,
  PARTIAL = 0,
  FULL = 1
}
