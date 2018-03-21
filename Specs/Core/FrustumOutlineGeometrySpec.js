defineSuite([
        'Core/FrustumOutlineGeometry',
        'Core/Cartesian3',
        'Core/Math',
        'Core/PerspectiveFrustum',
        'Core/Quaternion',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        FrustumOutlineGeometry,
        Cartesian3,
        CesiumMath,
        PerspectiveFrustum,
        Quaternion,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('constructor throws without options', function() {
        expect(function() {
            return new FrustumOutlineGeometry();
        }).toThrowDeveloperError();
    });

    it('constructor throws without frustum', function() {
        expect(function() {
            return new FrustumOutlineGeometry({
                origin : Cartesian3.ZERO,
                orientation : Quaternion.IDENTITY
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws without position', function() {
        expect(function() {
            return new FrustumOutlineGeometry({
                frustum : new PerspectiveFrustum(),
                orientation : Quaternion.IDENTITY
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws without orientation', function() {
        expect(function() {
            return new FrustumOutlineGeometry({
                frustum : new PerspectiveFrustum(),
                origin : Cartesian3.ZERO
            });
        }).toThrowDeveloperError();
    });

    it('constructor computes all vertex attributes', function() {
        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.toRadians(30.0);
        frustum.aspectRatio = 1920.0 / 1080.0;
        frustum.near = 1.0;
        frustum.far = 3.0;

        var m = FrustumOutlineGeometry.createGeometry(new FrustumOutlineGeometry({
            frustum : frustum,
            origin : Cartesian3.ZERO,
            orientation : Quaternion.IDENTITY
        }));

        var numVertices = 8;
        var numLines = 12;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numLines * 2);

        expect(m.boundingSphere.center).toEqual(new Cartesian3(0.0, 0.0, 2.0));
        expect(m.boundingSphere.radius).toBeGreaterThan(1.0);
        expect(m.boundingSphere.radius).toBeLessThan(2.0);
    });

    var packableFrustum = new PerspectiveFrustum();
    packableFrustum.fov = 1.0;
    packableFrustum.aspectRatio = 2.0;
    packableFrustum.near = 3.0;
    packableFrustum.far = 4.0;

    createPackableSpecs(FrustumOutlineGeometry, new FrustumOutlineGeometry({
        frustum : packableFrustum,
        origin : Cartesian3.ZERO,
        orientation : Quaternion.IDENTITY,
        vertexFormat : VertexFormat.POSITION_ONLY
    }), [0.0, 1.0, 2.0, 3.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0]);
});
