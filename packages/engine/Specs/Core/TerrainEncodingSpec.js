import {
  AttributeCompression,
  AxisAlignedBoundingBox,
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  Matrix4,
  TerrainEncoding,
  TerrainExaggeration,
  TerrainQuantization,
  Transforms,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("Core/TerrainEncoding", function () {
  let center;
  let maximum;
  let minimum;
  let aabox;
  let fromENU;
  let minimumHeight;
  let maximumHeight;

  beforeEach(function () {
    center = Cartesian3.fromDegrees(0.0, 0.0);
    maximum = new Cartesian3(6.0e2, 6.0e2, 6.0e2);
    minimum = Cartesian3.negate(maximum, new Cartesian3());
    aabox = new AxisAlignedBoundingBox(minimum, maximum, center);
    maximumHeight = 6.0e2;
    minimumHeight = maximumHeight;
    fromENU = Transforms.eastNorthUpToFixedFrame(center);
  });

  it("default constructs", function () {
    const encoding = new TerrainEncoding();
    expect(encoding.quantization).toBe(TerrainQuantization.NONE);
    expect(encoding.minimumHeight).not.toBeDefined();
    expect(encoding.maximumHeight).not.toBeDefined();
    expect(encoding.center).not.toBeDefined();
    expect(encoding.toScaledENU).not.toBeDefined();
    expect(encoding.fromScaledENU).not.toBeDefined();
    expect(encoding.matrix).not.toBeDefined();
    expect(encoding.hasVertexNormals).not.toBeDefined();
  });

  it("constructs without quantization", function () {
    const maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);
    const maximumHeight = 1.0e6;
    const minimumHeight = maximumHeight;
    const hasVertexNormals = false;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    expect(encoding.quantization).toEqual(TerrainQuantization.NONE);
    expect(encoding.minimumHeight).toEqual(minimumHeight);
    expect(encoding.maximumHeight).toEqual(maximumHeight);
    expect(encoding.center).toEqual(center);
    expect(encoding.toScaledENU).toBeDefined();
    expect(encoding.toScaledENU).toBeInstanceOf(Matrix4);
    expect(encoding.fromScaledENU).toBeDefined();
    expect(encoding.fromScaledENU).toBeInstanceOf(Matrix4);
    expect(encoding.matrix).toBeDefined();
    expect(encoding.matrix).toBeInstanceOf(Matrix4);
    expect(encoding.hasVertexNormals).toEqual(hasVertexNormals);
  });

  it("constructs with quantization", function () {
    const maximum = new Cartesian3(100.0, 100.0, 100.0);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);
    const minimumHeight = -100.0;
    const maximumHeight = 100.0;
    const hasVertexNormals = false;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    expect(encoding.quantization).toEqual(TerrainQuantization.BITS12);
    expect(encoding.minimumHeight).toEqual(minimumHeight);
    expect(encoding.maximumHeight).toEqual(maximumHeight);
    expect(encoding.center).toEqual(center);
    expect(encoding.toScaledENU).toBeDefined();
    expect(encoding.toScaledENU).toBeInstanceOf(Matrix4);
    expect(encoding.fromScaledENU).toBeDefined();
    expect(encoding.fromScaledENU).toBeInstanceOf(Matrix4);
    expect(encoding.matrix).toBeDefined();
    expect(encoding.matrix).toBeInstanceOf(Matrix4);
    expect(encoding.hasVertexNormals).toEqual(hasVertexNormals);
  });

  it("encodes without quantization or normals", function () {
    const maximum = new Cartesian3(6.0e3, 6.0e3, 6.0e3);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);
    const maximumHeight = 6.0e3;
    const minimumHeight = maximumHeight;
    const hasVertexNormals = false;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const position = new Cartesian3(1.0e3, 1.0e3, 1.0e3);
    Matrix4.multiplyByPoint(fromENU, position, position);

    const buffer = [];
    encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0);

    expect(encoding.stride).toEqual(6);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodePosition(buffer, 0)).toEqual(position);
  });

  it("encodes without quantization and with normals", function () {
    const maximum = new Cartesian3(6.0e3, 6.0e3, 6.0e3);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);
    const maximumHeight = 6.0e3;
    const minimumHeight = maximumHeight;
    const hasVertexNormals = true;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const position = new Cartesian3(1.0e3, 1.0e3, 1.0e3);
    Matrix4.multiplyByPoint(fromENU, position, position);
    const normal = Cartesian3.normalize(position, new Cartesian3());

    const buffer = [];
    encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0, normal);

    expect(encoding.stride).toEqual(7);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodePosition(buffer, 0)).toEqual(position);
  });

  it("encodes position with quantization and without normals", function () {
    const hasVertexNormals = false;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const position = new Cartesian3(1.0e2, 1.0e2, 1.0e2);
    Matrix4.multiplyByPoint(fromENU, position, position);

    const buffer = [];
    encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0);

    expect(encoding.stride).toEqual(3);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodePosition(buffer, 0)).toEqualEpsilon(position, 1.0);
  });

  it("encodes position with quantization and normals", function () {
    const hasVertexNormals = true;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const position = new Cartesian3(1.0e2, 1.0e2, 1.0e2);
    Matrix4.multiplyByPoint(fromENU, position, position);
    const normal = Cartesian3.normalize(position, new Cartesian3());

    const buffer = [];
    encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0, normal);

    expect(encoding.stride).toEqual(4);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodePosition(buffer, 0)).toEqualEpsilon(position, 1.0);
  });

  it("encodes position without quantization and with exaggeration", function () {
    const hasVertexNormals = false;
    const hasWebMercatorT = false;
    const hasGeodeticSurfaceNormals = true;

    const height = 1000000.0;
    const position = new Cartesian3(height, 0.0, 0.0);
    const geodeticSurfaceNormal = new Cartesian3(1.0, 0.0, 0.0);

    const exaggeration = 2.0;
    const exaggerationRelativeHeight = 10.0;
    const exaggeratedHeight = TerrainExaggeration.getHeight(
      height,
      exaggeration,
      exaggerationRelativeHeight
    );
    const exaggeratedPosition = new Cartesian3(exaggeratedHeight, 0.0, 0.0);

    const maximumHeight = height;
    const minimumHeight = -height;
    const maximum = new Cartesian3(height, height, height);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, Cartesian3.ZERO);

    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      Matrix4.IDENTITY,
      hasVertexNormals,
      hasWebMercatorT,
      hasGeodeticSurfaceNormals,
      exaggeration,
      exaggerationRelativeHeight
    );

    const buffer = [];
    encoding.encode(
      buffer,
      0,
      position,
      Cartesian2.ZERO,
      height,
      undefined,
      undefined,
      geodeticSurfaceNormal
    );

    expect(encoding.stride).toEqual(9);
    expect(buffer.length).toEqual(encoding.stride);
    expect(encoding.getExaggeratedPosition(buffer, 0)).toEqualEpsilon(
      exaggeratedPosition,
      CesiumMath.EPSILON5
    );
    expect(
      encoding.decodeGeodeticSurfaceNormal(buffer, 0, new Cartesian3())
    ).toEqualEpsilon(geodeticSurfaceNormal, CesiumMath.EPSILON5);
  });

  it("encodes texture coordinates with quantization and without normals", function () {
    const hasVertexNormals = false;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const texCoords = new Cartesian2(0.25, 0.75);

    const buffer = [];
    encoding.encode(buffer, 0, Cartesian3.ZERO, texCoords, 100.0);

    expect(encoding.stride).toEqual(3);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodeTextureCoordinates(buffer, 0)).toEqualEpsilon(
      texCoords,
      1.0 / 4095.0
    );
  });

  it("encodes textureCoordinates with quantization and normals", function () {
    const hasVertexNormals = true;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const texCoords = new Cartesian2(0.75, 0.25);

    const buffer = [];
    encoding.encode(
      buffer,
      0,
      Cartesian3.ZERO,
      texCoords,
      100.0,
      Cartesian3.UNIT_X
    );

    expect(encoding.stride).toEqual(4);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodeTextureCoordinates(buffer, 0)).toEqualEpsilon(
      texCoords,
      1.0 / 4095.0
    );
  });

  it("encodes height with quantization and without normals", function () {
    const hasVertexNormals = false;
    minimumHeight = 0.0;
    maximumHeight = 200.0;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const buffer = [];
    const height = (maximumHeight + minimumHeight) * 0.5;
    encoding.encode(buffer, 0, center, Cartesian2.ZERO, height);

    expect(encoding.stride).toEqual(3);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodeHeight(buffer, 0)).toEqualEpsilon(
      height,
      200.0 / 4095.0
    );
  });

  it("encodes height with quantization and normals", function () {
    const hasVertexNormals = true;
    minimumHeight = 0.0;
    maximumHeight = 200.0;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const buffer = [];
    const height = (maximumHeight + minimumHeight) * 0.5;
    encoding.encode(
      buffer,
      0,
      center,
      Cartesian2.ZERO,
      height,
      Cartesian3.UNIT_X
    );

    expect(encoding.stride).toEqual(4);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.decodeHeight(buffer, 0)).toEqualEpsilon(
      height,
      200.0 / 4095.0
    );
  });

  it("gets oct-encoded normal", function () {
    const hasVertexNormals = true;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const normal = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    const octNormal = AttributeCompression.octEncode(normal, new Cartesian2());

    const buffer = [];
    encoding.encode(
      buffer,
      0,
      center,
      Cartesian2.ZERO,
      minimumHeight,
      octNormal
    );

    expect(encoding.stride).toEqual(4);
    expect(buffer.length).toEqual(encoding.stride);

    expect(encoding.getOctEncodedNormal(buffer, 0)).toEqual(octNormal);
  });

  it("adds geodetic surface normals", function () {
    const hasVertexNormals = false;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const oldBuffer = [];
    encoding.encode(oldBuffer, 0, center, Cartesian2.ZERO, minimumHeight);
    const oldStride = encoding.stride;

    const newBuffer = [];
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    encoding.addGeodeticSurfaceNormals(oldBuffer, newBuffer, ellipsoid);
    const newStride = encoding.stride;
    const strideDifference = newStride - oldStride;

    expect(strideDifference).toEqual(3);
    expect(oldBuffer.length).toEqual(oldStride);
    expect(newBuffer.length).toEqual(newStride);
  });

  it("removes geodetic surface normals", function () {
    const hasVertexNormals = false;
    const hasWebMarcatorT = false;
    const hasGeodeticSurfaceNormals = true;
    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals,
      hasWebMarcatorT,
      hasGeodeticSurfaceNormals
    );

    const geodeticSurfaceNormal = new Cartesian3(1.0, 0.0, 0.0);
    const oldBuffer = [];
    encoding.encode(
      oldBuffer,
      0,
      center,
      Cartesian2.ZERO,
      minimumHeight,
      undefined,
      undefined,
      geodeticSurfaceNormal
    );
    const oldStride = encoding.stride;

    const newBuffer = [];
    encoding.removeGeodeticSurfaceNormals(oldBuffer, newBuffer);
    const newStride = encoding.stride;
    const strideDifference = newStride - oldStride;

    expect(strideDifference).toEqual(-3);
    expect(oldBuffer.length).toEqual(oldStride);
    expect(newBuffer.length).toEqual(newStride);
  });

  it("gets attributes", function () {
    const center = Cartesian3.fromDegrees(0.0, 0.0);
    const maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

    const maximumHeight = 1.0e6;
    const minimumHeight = maximumHeight;

    const fromENU = Transforms.eastNorthUpToFixedFrame(center);

    const hasVertexNormals = false;

    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );

    const buffer = [];
    const attributes = encoding.getAttributes(buffer);

    expect(attributes).toBeDefined();
    expect(attributes.length).toEqual(2);
  });

  it("gets attribute locations", function () {
    const center = Cartesian3.fromDegrees(0.0, 0.0);
    const maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

    const maximumHeight = 1.0e6;
    const minimumHeight = maximumHeight;

    const fromENU = Transforms.eastNorthUpToFixedFrame(center);

    const hasVertexNormals = false;

    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );
    const attributeLocations = encoding.getAttributeLocations();

    expect(attributeLocations).toBeDefined();
  });

  it("clones", function () {
    const center = Cartesian3.fromDegrees(0.0, 0.0);
    const maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

    const maximumHeight = 1.0e6;
    const minimumHeight = maximumHeight;

    const fromENU = Transforms.eastNorthUpToFixedFrame(center);

    const hasVertexNormals = false;

    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );
    const cloned = TerrainEncoding.clone(encoding);

    expect(cloned.quantization).toEqual(encoding.quantization);
    expect(cloned.minimumHeight).toEqual(encoding.minimumHeight);
    expect(cloned.maximumHeight).toEqual(encoding.maximumHeight);
    expect(cloned.center).toEqual(encoding.center);
    expect(cloned.toScaledENU).toEqual(encoding.toScaledENU);
    expect(cloned.fromScaledENU).toEqual(encoding.fromScaledENU);
    expect(cloned.matrix).toEqual(encoding.matrix);
    expect(cloned.hasVertexNormals).toEqual(encoding.hasVertexNormals);
  });

  it("clones with result", function () {
    const center = Cartesian3.fromDegrees(0.0, 0.0);
    const maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
    const minimum = Cartesian3.negate(maximum, new Cartesian3());
    const aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

    const maximumHeight = 1.0e6;
    const minimumHeight = maximumHeight;

    const fromENU = Transforms.eastNorthUpToFixedFrame(center);

    const hasVertexNormals = false;

    const encoding = new TerrainEncoding(
      aabox.center,
      aabox,
      minimumHeight,
      maximumHeight,
      fromENU,
      hasVertexNormals
    );
    const result = new TerrainEncoding();
    const cloned = TerrainEncoding.clone(encoding, result);

    expect(cloned).toBe(result);
    expect(cloned.quantization).toEqual(encoding.quantization);
    expect(cloned.minimumHeight).toEqual(encoding.minimumHeight);
    expect(cloned.maximumHeight).toEqual(encoding.maximumHeight);
    expect(cloned.center).toEqual(encoding.center);
    expect(cloned.toScaledENU).toEqual(encoding.toScaledENU);
    expect(cloned.fromScaledENU).toEqual(encoding.fromScaledENU);
    expect(cloned.matrix).toEqual(encoding.matrix);
    expect(cloned.hasVertexNormals).toEqual(encoding.hasVertexNormals);
  });
});
