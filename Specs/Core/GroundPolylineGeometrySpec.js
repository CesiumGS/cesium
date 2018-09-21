defineSuite([
        'Core/GroundPolylineGeometry',
        'Core/ApproximateTerrainHeights',
        'Core/arraySlice',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Math',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/WebMercatorProjection',
        'Specs/createPackableSpecs'
    ], function(
        GroundPolylineGeometry,
        ApproximateTerrainHeights,
        arraySlice,
        Cartesian3,
        Cartographic,
        CesiumMath,
        Ellipsoid,
        GeographicProjection,
        WebMercatorProjection,
        createPackableSpecs) {
    'use strict';

    beforeAll(function() {
        return ApproximateTerrainHeights.initialize();
    });

    afterAll(function() {
        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function verifyAttributeValuesIdentical(attribute) {
        var values = attribute.values;
        var componentsPerAttribute = attribute.componentsPerAttribute;
        var vertexCount = values.length / componentsPerAttribute;
        var firstVertex = arraySlice(values, 0, componentsPerAttribute);
        var identical = true;
        for (var i = 1; i < vertexCount; i++) {
            var index = i * componentsPerAttribute;
            var vertex = arraySlice(values, index, index + componentsPerAttribute);
            for (var j = 0; j < componentsPerAttribute; j++) {
                if (vertex[j] !== firstVertex[j]) {
                    identical = false;
                    break;
                }
            }
        }
        expect(identical).toBe(true);
    }

    it('computes positions and additional attributes for polylines', function() {
        var startCartographic = Cartographic.fromDegrees(0.01, 0.0);
        var endCartographic = Cartographic.fromDegrees(0.02, 0.0);
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromRadiansArray([
                startCartographic.longitude, startCartographic.latitude,
                endCartographic.longitude, endCartographic.latitude
            ]),
            granularity : 0.0
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(36);
        expect(geometry.attributes.position.values.length).toEqual(24);

        var startHiAndForwardOffsetX = geometry.attributes.startHiAndForwardOffsetX;
        var startLoAndForwardOffsetY = geometry.attributes.startLoAndForwardOffsetY;
        var startNormalAndForwardOffsetZ = geometry.attributes.startNormalAndForwardOffsetZ;
        var endNormalAndTextureCoordinateNormalizationX = geometry.attributes.endNormalAndTextureCoordinateNormalizationX;
        var rightNormalAndTextureCoordinateNormalizationY = geometry.attributes.rightNormalAndTextureCoordinateNormalizationY;
        var startHiLo2D = geometry.attributes.startHiLo2D;
        var offsetAndRight2D = geometry.attributes.offsetAndRight2D;
        var startEndNormals2D = geometry.attributes.startEndNormals2D;
        var texcoordNormalization2D = geometry.attributes.texcoordNormalization2D;

        // Expect each entry in the additional attributes to be identical across all vertices since this is a single segment,
        // except endNormalAndTextureCoordinateNormalizationX and texcoordNormalization2D, which should be "sided"
        verifyAttributeValuesIdentical(startHiAndForwardOffsetX);
        verifyAttributeValuesIdentical(startLoAndForwardOffsetY);
        verifyAttributeValuesIdentical(startNormalAndForwardOffsetZ);
        verifyAttributeValuesIdentical(startHiLo2D);
        verifyAttributeValuesIdentical(offsetAndRight2D);
        verifyAttributeValuesIdentical(startEndNormals2D);

        // Expect endNormalAndTextureCoordinateNormalizationX and texcoordNormalization2D.x to encode the "side" of the geometry
        var i;
        var index;
        var values = endNormalAndTextureCoordinateNormalizationX.values;
        for (i = 0; i < 4; i++) {
            index = i * 4 + 3;
            expect(CesiumMath.sign(values[index])).toEqual(1.0);
        }
        for (i = 4; i < 8; i++) {
            index = i * 4 + 3;
            expect(CesiumMath.sign(values[index])).toEqual(-1.0);
        }

        values = texcoordNormalization2D.values;
        for (i = 0; i < 4; i++) {
            index = i * 2;
            expect(CesiumMath.sign(values[index])).toEqual(1.0);
        }
        for (i = 4; i < 8; i++) {
            index = i * 2;
            expect(CesiumMath.sign(values[index])).toEqual(-1.0);
        }

        // Expect rightNormalAndTextureCoordinateNormalizationY and texcoordNormalization2D.y to encode if the vertex is on the bottom
        values = rightNormalAndTextureCoordinateNormalizationY.values;
        expect(values[3] > 1.0).toBe(true);
        expect(values[1 * 4 + 3] > 1.0).toBe(true);
        expect(values[4 * 4 + 3] > 1.0).toBe(true);
        expect(values[5 * 4 + 3] > 1.0).toBe(true);

        values = texcoordNormalization2D.values;
        expect(values[1] > 1.0).toBe(true);
        expect(values[1 * 2 + 1] > 1.0).toBe(true);
        expect(values[4 * 2 + 1] > 1.0).toBe(true);
        expect(values[5 * 2 + 1] > 1.0).toBe(true);

        // Line segment geometry is encoded as:
        // - start position
        // - offset to the end position
        // - normal for a mitered plane at each end
        // - a right-facing normal
        // - parameters for localizing the position along the line to texture coordinates
        var startPosition3D = new Cartesian3();
        startPosition3D.x = startHiAndForwardOffsetX.values[0] + startLoAndForwardOffsetY.values[0];
        startPosition3D.y = startHiAndForwardOffsetX.values[1] + startLoAndForwardOffsetY.values[1];
        startPosition3D.z = startHiAndForwardOffsetX.values[2] + startLoAndForwardOffsetY.values[2];
        var reconstructedCarto = Cartographic.fromCartesian(startPosition3D);
        reconstructedCarto.height = 0.0;
        expect(Cartographic.equalsEpsilon(reconstructedCarto, startCartographic, CesiumMath.EPSILON7)).toBe(true);

        var endPosition3D = new Cartesian3();
        endPosition3D.x = startPosition3D.x + startHiAndForwardOffsetX.values[3];
        endPosition3D.y = startPosition3D.y + startLoAndForwardOffsetY.values[3];
        endPosition3D.z = startPosition3D.z + startNormalAndForwardOffsetZ.values[3];
        reconstructedCarto = Cartographic.fromCartesian(endPosition3D);
        reconstructedCarto.height = 0.0;
        expect(Cartographic.equalsEpsilon(reconstructedCarto, endCartographic, CesiumMath.EPSILON7)).toBe(true);

        var startNormal3D = Cartesian3.unpack(startNormalAndForwardOffsetZ.values);
        expect(Cartesian3.equalsEpsilon(startNormal3D, new Cartesian3(0.0, 1.0, 0.0), CesiumMath.EPSILON2)).toBe(true);

        var endNormal3D = Cartesian3.unpack(endNormalAndTextureCoordinateNormalizationX.values);
        expect(Cartesian3.equalsEpsilon(endNormal3D, new Cartesian3(0.0, -1.0, 0.0), CesiumMath.EPSILON2)).toBe(true);

        var rightNormal3D = Cartesian3.unpack(rightNormalAndTextureCoordinateNormalizationY.values);
        expect(Cartesian3.equalsEpsilon(rightNormal3D, new Cartesian3(0.0, 0.0, -1.0), CesiumMath.EPSILON2)).toBe(true);

        var texcoordNormalizationX = endNormalAndTextureCoordinateNormalizationX.values[3];
        expect(texcoordNormalizationX).toEqualEpsilon(1.0, CesiumMath.EPSILON3);

        // 2D
        var projection = new GeographicProjection();

        var startPosition2D = new Cartesian3();
        startPosition2D.x = startHiLo2D.values[0] + startHiLo2D.values[2];
        startPosition2D.y = startHiLo2D.values[1] + startHiLo2D.values[3];
        reconstructedCarto = projection.unproject(startPosition2D);
        reconstructedCarto.height = 0.0;
        expect(Cartographic.equalsEpsilon(reconstructedCarto, startCartographic, CesiumMath.EPSILON7)).toBe(true);

        var endPosition2D = new Cartesian3();
        endPosition2D.x = startPosition2D.x + offsetAndRight2D.values[0];
        endPosition2D.y = startPosition2D.y + offsetAndRight2D.values[1];
        reconstructedCarto = projection.unproject(endPosition2D);
        reconstructedCarto.height = 0.0;
        expect(Cartographic.equalsEpsilon(reconstructedCarto, endCartographic, CesiumMath.EPSILON7)).toBe(true);

        var startNormal2D = new Cartesian3();
        startNormal2D.x = startEndNormals2D.values[0];
        startNormal2D.y = startEndNormals2D.values[1];
        expect(Cartesian3.equalsEpsilon(startNormal2D, new Cartesian3(1.0, 0.0, 0.0), CesiumMath.EPSILON2)).toBe(true);

        var endNormal2D = new Cartesian3();
        endNormal2D.x = startEndNormals2D.values[2];
        endNormal2D.y = startEndNormals2D.values[3];
        expect(Cartesian3.equalsEpsilon(endNormal2D, new Cartesian3(-1.0, 0.0, 0.0), CesiumMath.EPSILON2)).toBe(true);

        var rightNormal2D = new Cartesian3();
        rightNormal2D.x = offsetAndRight2D.values[2];
        rightNormal2D.y = offsetAndRight2D.values[3];
        expect(Cartesian3.equalsEpsilon(rightNormal2D, new Cartesian3(0.0, -1.0, 0.0), CesiumMath.EPSILON2)).toBe(true);

        texcoordNormalizationX = texcoordNormalization2D.values[0];
        expect(texcoordNormalizationX).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
    });

    it('does not generate 2D attributes when scene3DOnly is true', function() {
        var startCartographic = Cartographic.fromDegrees(0.01, 0.0);
        var endCartographic = Cartographic.fromDegrees(0.02, 0.0);
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromRadiansArray([
                startCartographic.longitude, startCartographic.latitude,
                endCartographic.longitude, endCartographic.latitude
            ]),
            granularity : 0.0
        });

        groundPolylineGeometry._scene3DOnly = true;

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.attributes.startHiAndForwardOffsetX).toBeDefined();
        expect(geometry.attributes.startLoAndForwardOffsetY).toBeDefined();
        expect(geometry.attributes.startNormalAndForwardOffsetZ).toBeDefined();
        expect(geometry.attributes.endNormalAndTextureCoordinateNormalizationX).toBeDefined();
        expect(geometry.attributes.rightNormalAndTextureCoordinateNormalizationY).toBeDefined();

        expect(geometry.attributes.startHiLo2D).not.toBeDefined();
        expect(geometry.attributes.offsetAndRight2D).not.toBeDefined();
        expect(geometry.attributes.startEndNormals2D).not.toBeDefined();
        expect(geometry.attributes.texcoordNormalization2D).not.toBeDefined();
    });

    it('removes adjacent positions with the same latitude/longitude', function() {
        var startCartographic = Cartographic.fromDegrees(0.01, 0.0);
        var endCartographic = Cartographic.fromDegrees(0.02, 0.0);
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromRadiansArrayHeights([
                startCartographic.longitude, startCartographic.latitude, 0.0,
                endCartographic.longitude, endCartographic.latitude, 0.0,
                endCartographic.longitude, endCartographic.latitude, 0.0,
                endCartographic.longitude, endCartographic.latitude, 10.0
            ]),
            granularity : 0.0
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(36);
        expect(geometry.attributes.position.values.length).toEqual(24);
    });

    it('returns undefined if filtered points are not a valid geometry', function() {
        var startCartographic = Cartographic.fromDegrees(0.01, 0.0);
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromRadiansArrayHeights([
                startCartographic.longitude, startCartographic.latitude, 0.0,
                startCartographic.longitude, startCartographic.latitude, 0.0
            ]),
            granularity : 0.0
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry).toBeUndefined();
    });

    it('miters turns', function() {
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0,
                0.02, 0.01
            ]),
            granularity : 0.0
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
        expect(geometry.indices.length).toEqual(72);
        expect(geometry.attributes.position.values.length).toEqual(48);

        var startNormalAndForwardOffsetZvalues = geometry.attributes.startNormalAndForwardOffsetZ.values;
        var endNormalAndTextureCoordinateNormalizationXvalues = geometry.attributes.endNormalAndTextureCoordinateNormalizationX.values;

        var miteredStartNormal = Cartesian3.unpack(startNormalAndForwardOffsetZvalues, 32);
        var miteredEndNormal = Cartesian3.unpack(endNormalAndTextureCoordinateNormalizationXvalues, 0);
        var reverseMiteredEndNormal = Cartesian3.multiplyByScalar(miteredEndNormal, -1.0, new Cartesian3());

        expect(Cartesian3.equalsEpsilon(miteredStartNormal, reverseMiteredEndNormal, CesiumMath.EPSILON7)).toBe(true);

        var approximateExpectedMiterNormal = new Cartesian3(0.0, 1.0, 1.0);
        Cartesian3.normalize(approximateExpectedMiterNormal, approximateExpectedMiterNormal);
        expect(Cartesian3.equalsEpsilon(approximateExpectedMiterNormal, miteredStartNormal, CesiumMath.EPSILON2)).toBe(true);
    });

    it('breaks miters for tight turns', function() {
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0,
                0.01, 0.0
            ]),
            granularity : 0.0
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        var startNormalAndForwardOffsetZvalues = geometry.attributes.startNormalAndForwardOffsetZ.values;
        var endNormalAndTextureCoordinateNormalizationXvalues = geometry.attributes.endNormalAndTextureCoordinateNormalizationX.values;

        var miteredStartNormal = Cartesian3.unpack(startNormalAndForwardOffsetZvalues, 32);
        var miteredEndNormal = Cartesian3.unpack(endNormalAndTextureCoordinateNormalizationXvalues, 0);
        var reverseMiteredEndNormal = Cartesian3.multiplyByScalar(miteredEndNormal, -1.0, new Cartesian3());

        expect(Cartesian3.equalsEpsilon(miteredStartNormal, reverseMiteredEndNormal, CesiumMath.EPSILON7)).toBe(true);

        var approximateExpectedMiterNormal = new Cartesian3(0.0, 1.0, 0.0);

        Cartesian3.normalize(approximateExpectedMiterNormal, approximateExpectedMiterNormal);
        expect(Cartesian3.equalsEpsilon(approximateExpectedMiterNormal, miteredStartNormal, CesiumMath.EPSILON2)).toBe(true);

        // Break miter on loop end
        groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0,
                0.015, CesiumMath.EPSILON7
            ]),
            granularity : 0.0,
            loop : true
        });

        geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        startNormalAndForwardOffsetZvalues = geometry.attributes.startNormalAndForwardOffsetZ.values;
        endNormalAndTextureCoordinateNormalizationXvalues = geometry.attributes.endNormalAndTextureCoordinateNormalizationX.values;

        // Check normals at loop end
        miteredStartNormal = Cartesian3.unpack(startNormalAndForwardOffsetZvalues, 0);
        miteredEndNormal = Cartesian3.unpack(endNormalAndTextureCoordinateNormalizationXvalues, 32 * 2);

        expect(Cartesian3.equalsEpsilon(miteredStartNormal, miteredEndNormal, CesiumMath.EPSILON7)).toBe(true);

        approximateExpectedMiterNormal = new Cartesian3(0.0, 1.0, 0.0);

        Cartesian3.normalize(approximateExpectedMiterNormal, approximateExpectedMiterNormal);
        expect(Cartesian3.equalsEpsilon(approximateExpectedMiterNormal, miteredStartNormal, CesiumMath.EPSILON2)).toBe(true);
    });

    it('interpolates long polyline segments', function() {
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0
            ]),
            granularity : 600.0 // 0.01 to 0.02 is about 1113 meters with default ellipsoid, expect two segments
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(72);
        expect(geometry.attributes.position.values.length).toEqual(48);

        // Interpolate one segment but not the other
        groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0,
                0.0201, 0.0
            ]),
            granularity : 600.0
        });

        geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(36 * 3);
        expect(geometry.attributes.position.values.length).toEqual(24 * 3);
    });

    it('loops when there are enough positions and loop is specified', function() {
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0
            ]),
            granularity : 0.0,
            loop : true
        });

        // Not enough positions to loop, should still be a single segment
        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
        expect(geometry.indices.length).toEqual(36);

        groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                0.01, 0.0,
                0.02, 0.0,
                0.02, 0.02
            ]),
            granularity : 0.0,
            loop : true
        });

        // Loop should produce 3 segments
        geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
        expect(geometry.indices.length).toEqual(108);
    });

    it('subdivides geometry across the IDL and Prime Meridian', function() {
        // Cross PM
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                -1.0, 0.0,
                1.0, 0.0
            ]),
            granularity : 0.0 // no interpolative subdivision
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(72);
        expect(geometry.attributes.position.values.length).toEqual(48);

        // Cross IDL
        groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                -179.0, 0.0,
                179.0, 0.0
            ]),
            granularity : 0.0 // no interpolative subdivision
        });

        geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(72);
        expect(geometry.attributes.position.values.length).toEqual(48);

        // Cross IDL going opposite direction and loop
        groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                179.0, 0.0,
                179.0, 1.0,
                -179.0, 1.0,
                -179.0, 0.0
            ]),
            granularity : 0.0, // no interpolative subdivision
            loop : true
        });

        geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(6 * 36);
        expect(geometry.attributes.position.values.length).toEqual(6 * 24);

        // Near-IDL case
        groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                179.999, 80.0,
                -179.999, 80.0
            ]),
            granularity : 0.0 // no interpolative subdivision
        });

        geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        expect(geometry.indices.length).toEqual(72);
        expect(geometry.attributes.position.values.length).toEqual(48);
    });

    it('throws errors if not enough positions have been provided', function() {
        expect(function() {
            return new GroundPolylineGeometry({
                positions : Cartesian3.fromDegreesArray([
                    0.01, 0.0
                ]),
                granularity : 0.0,
                loop : true
            });
        }).toThrowDeveloperError();
    });

    it('can unpack onto an existing instance', function() {
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                -1.0, 0.0,
                1.0, 0.0
            ]),
            loop : true,
            granularity : 10.0 // no interpolative subdivision
        });
        groundPolylineGeometry._scene3DOnly = true;
        GroundPolylineGeometry.setProjectionAndEllipsoid(groundPolylineGeometry, new WebMercatorProjection(Ellipsoid.WGS84));

        var packedArray = [0];
        GroundPolylineGeometry.pack(groundPolylineGeometry, packedArray, 1);
        var scratch = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                -1.0, 0.0,
                1.0, 0.0
            ])
        });
        GroundPolylineGeometry.unpack(packedArray, 1, scratch);

        var scratchPositions = scratch._positions;
        expect(scratchPositions.length).toEqual(2);
        expect(Cartesian3.equals(scratchPositions[0], groundPolylineGeometry._positions[0])).toBe(true);
        expect(Cartesian3.equals(scratchPositions[1], groundPolylineGeometry._positions[1])).toBe(true);
        expect(scratch.loop).toBe(true);
        expect(scratch.granularity).toEqual(10.0);
        expect(scratch._ellipsoid.equals(Ellipsoid.WGS84)).toBe(true);
        expect(scratch._scene3DOnly).toBe(true);
        expect(scratch._projectionIndex).toEqual(1);
    });

    it('provides a method for setting projection and ellipsoid', function() {
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : Cartesian3.fromDegreesArray([
                -1.0, 0.0,
                1.0, 0.0
            ]),
            loop : true,
            granularity : 10.0 // no interpolative subdivision
        });

        GroundPolylineGeometry.setProjectionAndEllipsoid(groundPolylineGeometry, new WebMercatorProjection(Ellipsoid.UNIT_SPHERE));

        expect(groundPolylineGeometry._projectionIndex).toEqual(1);
        expect(groundPolylineGeometry._ellipsoid.equals(Ellipsoid.UNIT_SPHERE)).toBe(true);
    });

    var positions = Cartesian3.fromDegreesArray([
        0.01, 0.0,
        0.02, 0.0,
        0.02, 0.1
    ]);
    var polyline = new GroundPolylineGeometry({
        positions : positions,
        granularity : 1000.0,
        loop : true
    });

    it('projects normals that cross the IDL', function() {
        var projection = new GeographicProjection();
        var cartographic = new Cartographic(CesiumMath.PI - CesiumMath.EPSILON11, 0.0);
        var normal = new Cartesian3(0.0, -1.0, 0.0);
        var projectedPosition = projection.project(cartographic, new Cartesian3());
        var result = new Cartesian3();

        GroundPolylineGeometry._projectNormal(projection, cartographic, normal, projectedPosition, result);
        expect(Cartesian3.equalsEpsilon(result, new Cartesian3(1.0, 0.0, 0.0), CesiumMath.EPSILON7)).toBe(true);
    });

    it('creates bounding spheres that cover the entire polyline volume height', function() {
        var positions = Cartesian3.fromDegreesArray([
            -122.17580380403314, 46.19984918190237,
            -122.17581380403314, 46.19984918190237
        ]);

        // Mt. St. Helens - provided coordinates are a few meters apart
        var groundPolylineGeometry = new GroundPolylineGeometry({
            positions : positions,
            granularity : 0.0 // no interpolative subdivision
        });

        var geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

        var boundingSphere = geometry.boundingSphere;
        var pointsDistance = Cartesian3.distance(positions[0], positions[1]);

        expect(boundingSphere.radius > pointsDistance).toBe(true);
        expect(boundingSphere.radius > 1000.0).toBe(true); // starting top/bottom height
    });

    var packedInstance = [positions.length];
    Cartesian3.pack(positions[0], packedInstance, packedInstance.length);
    Cartesian3.pack(positions[1], packedInstance, packedInstance.length);
    Cartesian3.pack(positions[2], packedInstance, packedInstance.length);
    packedInstance.push(polyline.granularity);
    packedInstance.push(polyline.loop ? 1.0 : 0.0);

    Ellipsoid.pack(Ellipsoid.WGS84, packedInstance, packedInstance.length);

    packedInstance.push(0.0); // projection index for Geographic (default)
    packedInstance.push(0.0); // scene3DModeOnly = false

    createPackableSpecs(GroundPolylineGeometry, polyline, packedInstance);
});
