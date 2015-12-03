/*global defineSuite*/
defineSuite([
        'Core/TerrainEncoding',
        'Core/AxisAlignedBoundingBox',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Math',
        'Core/Matrix4',
        'Core/TerrainQuantization',
        'Core/Transforms'
    ], function(
        TerrainEncoding,
        AxisAlignedBoundingBox,
        Cartesian2,
        Cartesian3,
        CesiumMath,
        Matrix4,
        TerrainQuantization,
        Transforms) {
    "use strict";

    it('default constructs', function() {
        var encoding = new TerrainEncoding();
        expect(encoding.quantization).not.toBeDefined();
        expect(encoding.minimumHeight).not.toBeDefined();
        expect(encoding.maximumHeight).not.toBeDefined();
        expect(encoding.center).not.toBeDefined();
        expect(encoding.toScaledENU).not.toBeDefined();
        expect(encoding.fromScaledENU).not.toBeDefined();
        expect(encoding.matrix).not.toBeDefined();
        expect(encoding.hasVertexNormals).not.toBeDefined();
    });

    it('constructs without quantization', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 1.0e6;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

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

    it('constructs with quantization', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(100.0, 100.0, 100.0);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var minimumHeight = -100.0;
        var maximumHeight = 100.0;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

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

    it('encodes without quantization or normals', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(6.0e3, 6.0e3, 6.0e3);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 6.0e3;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

        var position = new Cartesian3(1.0e3, 1.0e3, 1.0e3);
        Matrix4.multiplyByPoint(fromENU, position, position);

        var buffer = [];
        encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0);

        expect(encoding.getStride()).toEqual(6);
        expect(buffer.length).toEqual(encoding.getStride());

        expect(encoding.decodePosition(buffer, 0)).toEqual(position);
    });

    it('encodes without quantization and with normals', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(6.0e3, 6.0e3, 6.0e3);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 6.0e3;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = true;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

        var position = new Cartesian3(1.0e3, 1.0e3, 1.0e3);
        Matrix4.multiplyByPoint(fromENU, position, position);
        var normal = Cartesian3.normalize(position, new Cartesian3());

        var buffer = [];
        encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0, normal);

        expect(encoding.getStride()).toEqual(7);
        expect(buffer.length).toEqual(encoding.getStride());

        expect(encoding.decodePosition(buffer, 0)).toEqual(position);
    });

    it('encodes with quantization and without normals', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(6.0e2, 6.0e2, 6.0e2);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 6.0e2;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

        var position = new Cartesian3(1.0e2, 1.0e2, 1.0e2);
        Matrix4.multiplyByPoint(fromENU, position, position);

        var buffer = [];
        encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0);

        expect(encoding.getStride()).toEqual(3);
        expect(buffer.length).toEqual(encoding.getStride());

        expect(encoding.decodePosition(buffer, 0)).toEqualEpsilon(position, 1.0);
    });

    it('encodes with quantization and normals', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(6.0e2, 6.0e2, 6.0e2);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 6.0e2;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = true;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

        var position = new Cartesian3(1.0e2, 1.0e2, 1.0e2);
        Matrix4.multiplyByPoint(fromENU, position, position);
        var normal = Cartesian3.normalize(position, new Cartesian3());

        var buffer = [];
        encoding.encode(buffer, 0, position, Cartesian2.ZERO, 100.0, normal);

        expect(encoding.getStride()).toEqual(4);
        expect(buffer.length).toEqual(encoding.getStride());

        expect(encoding.decodePosition(buffer, 0)).toEqualEpsilon(position, 1.0);
    });

    it('gets attributes', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 1.0e6;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);

        var buffer = [];
        var attributes = encoding.getAttributes(buffer);

        expect(attributes).toBeDefined();
        expect(attributes.length).toEqual(2);
    });

    it('gets attribute locations', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 1.0e6;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);
        var attributeLocations = encoding.getAttributeLocations();

        expect(attributeLocations).toBeDefined();
    });

    it('clones', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 1.0e6;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);
        var cloned = TerrainEncoding.clone(encoding);

        expect(cloned.quantization).toEqual(encoding.quantization);
        expect(cloned.minimumHeight).toEqual(encoding.minimumHeight);
        expect(cloned.maximumHeight).toEqual(encoding.maximumHeight);
        expect(cloned.center).toEqual(encoding.center);
        expect(cloned.toScaledENU).toEqual(encoding.toScaledENU);
        expect(cloned.fromScaledENU).toEqual(encoding.fromScaledENU);
        expect(cloned.matrix).toEqual(encoding.matrix);
        expect(cloned.hasVertexNormals).toEqual(encoding.hasVertexNormals);
    });

    it('clones with result', function() {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var maximum = new Cartesian3(1.0e6, 1.0e6, 1.0e6);
        var minimum = Cartesian3.negate(maximum, new Cartesian3());
        var aabox = new AxisAlignedBoundingBox(minimum, maximum, center);

        var maximumHeight = 1.0e6;
        var minimumHeight = maximumHeight;

        var fromENU = Transforms.eastNorthUpToFixedFrame(center);

        var hasVertexNormals = false;

        var encoding = new TerrainEncoding(aabox, minimumHeight, maximumHeight, fromENU, hasVertexNormals);
        var result = new TerrainEncoding();
        var cloned = TerrainEncoding.clone(encoding, result);

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